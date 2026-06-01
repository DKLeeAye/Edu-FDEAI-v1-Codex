from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_session
from app.main import create_app
from app.models import (
    AiCallLog,
    Artifact,
    DeploymentInstance,
    ExperimentSession,
    LicenseEntitlement,
    OperationsAccessGrant,
    StageRecord,
    User,
)
from app.models.enums import AiCallStatus, ArtifactStatus, SessionStatus, StageStatus, UserRole
from app.seeds.demo import seed_demo_data


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_sessionmaker = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )

    with testing_sessionmaker() as session:
        yield session

    Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    app = create_app()

    def override_get_session() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        institution_id=user.institution_id,
        role=user.role,
    )
    return {"Authorization": f"Bearer {token}"}


def test_admin_can_view_scoped_operations_overview(
    client: TestClient,
    db_session: Session,
) -> None:
    seed = seed_demo_data(db_session)
    experiment_session = ExperimentSession(
        tenant_id=seed.tenant.id,
        institution_id=seed.institution.id,
        course_id=seed.demo_course.id,
        student_user_id=seed.student.id,
        package_version_id=seed.package_version.id,
        status=SessionStatus.IN_PROGRESS,
    )
    db_session.add(experiment_session)
    db_session.flush()
    stage_record = StageRecord(
        tenant_id=seed.tenant.id,
        institution_id=seed.institution.id,
        course_id=seed.demo_course.id,
        session_id=experiment_session.id,
        stage_key="stage_5",
        stage_order=5,
        status=StageStatus.COMPLETED,
    )
    db_session.add(stage_record)
    db_session.flush()
    db_session.add(
        Artifact(
            tenant_id=seed.tenant.id,
            institution_id=seed.institution.id,
            course_id=seed.demo_course.id,
            session_id=experiment_session.id,
            stage_record_id=stage_record.id,
            stage_key="stage_5",
            submitted_by_user_id=seed.teacher.id,
            artifact_type="teacher_grade_publication",
            title="最终成绩发布",
            content_json={"score": 92},
            status=ArtifactStatus.ACCEPTED,
        )
    )
    db_session.add_all(
        [
            AiCallLog(
                tenant_id=seed.tenant.id,
                institution_id=seed.institution.id,
                course_id=seed.demo_course.id,
                session_id=experiment_session.id,
                stage_record_id=stage_record.id,
                user_id=seed.student.id,
                usage_type="stage_5_delivery_review",
                provider="fake",
                model_name="fake-deterministic-v1",
                status=AiCallStatus.SUCCEEDED,
                request_metadata_json={},
                response_metadata_json={},
                prompt_tokens=20,
                completion_tokens=22,
                total_tokens=42,
                latency_ms=120,
            ),
            AiCallLog(
                tenant_id=seed.tenant.id,
                institution_id=seed.institution.id,
                course_id=seed.demo_course.id,
                session_id=experiment_session.id,
                stage_record_id=stage_record.id,
                user_id=seed.student.id,
                usage_type="stage_1_customer_interview",
                provider="fake",
                model_name="broken-fake",
                status=AiCallStatus.FAILED,
                request_metadata_json={},
                response_metadata_json={},
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                latency_ms=80,
                error_message="forced failure",
            ),
        ]
    )
    db_session.commit()

    response = client.get(
        "/api/v1/admin/operations/overview",
        headers=auth_headers(seed.admin),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["tenant"] == {"id": str(seed.tenant.id), "name": seed.tenant.name}
    assert body["institution"] == {
        "id": str(seed.institution.id),
        "name": seed.institution.name,
    }
    deployment = body["deployment_instances"][0]
    assert deployment["courses_count"] == 1
    assert deployment["sessions_count"] == 1
    assert deployment["active_users_count"] == 4
    assert deployment["package_versions_count"] == 1
    assert deployment["status"] == "running"
    formal_deployment = db_session.scalar(select(DeploymentInstance))
    assert formal_deployment is not None
    assert deployment["id"] == str(formal_deployment.id)
    license_keys = {item["key"]: item for item in body["license_entitlements"]}
    assert license_keys["active_users"]["used"] == 4
    assert license_keys["active_users"]["source"] == "license_entitlement"
    assert license_keys["courses"]["used"] == 1
    assert license_keys["ai_calls"]["used"] == 2
    assert db_session.scalar(select(LicenseEntitlement)) is not None
    formal_grant = db_session.scalar(select(OperationsAccessGrant))
    assert formal_grant is not None
    grant = body["operations_access_grants"][0]
    assert grant["id"] == str(formal_grant.id)
    assert grant["status"] == "active"
    assert grant["scope"]["read_aggregate_only"] is True
    assert body["ai_usage"]["total_calls"] == 2
    assert body["ai_usage"]["succeeded_calls"] == 1
    assert body["ai_usage"]["failed_calls"] == 1
    assert body["ai_usage"]["total_tokens"] == 42
    assert body["ai_usage"]["average_latency_ms"] == 100
    usage_types = {item["usage_type"]: item for item in body["ai_usage"]["by_usage_type"]}
    assert usage_types["stage_5_delivery_review"]["call_count"] == 1
    assert usage_types["stage_1_customer_interview"]["failed_count"] == 1
    export_items = {item["key"]: item for item in body["data_exports"]}
    assert export_items["gradebook"]["record_count"] == 1
    assert export_items["artifact_archive"]["record_count"] == 1
    assert export_items["ai_audit_log"]["record_count"] == 2
    assert export_items["rubric_library"]["record_count"] == 5


def test_teacher_cannot_view_admin_operations_overview(
    client: TestClient,
    db_session: Session,
) -> None:
    seed = seed_demo_data(db_session)
    teacher = db_session.scalar(select(User).where(User.role == UserRole.TEACHER))
    assert teacher is not None

    response = client.get(
        "/api/v1/admin/operations/overview",
        headers=auth_headers(teacher),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Only administrators can view operations overview."


def test_admin_can_update_license_and_deployment_and_revoke_access_grant(
    client: TestClient,
    db_session: Session,
) -> None:
    seed = seed_demo_data(db_session)
    deployment = db_session.scalar(select(DeploymentInstance))
    grant = db_session.scalar(select(OperationsAccessGrant))
    assert deployment is not None
    assert grant is not None

    license_response = client.post(
        "/api/v1/admin/operations/license-entitlements",
        headers=auth_headers(seed.admin),
        json={
            "entitlement_key": "active_users",
            "label": "活跃用户席位",
            "limit_value": 320,
            "unit": "人",
            "status": "active",
        },
    )
    deployment_response = client.post(
        f"/api/v1/admin/operations/deployment-instances/{deployment.id}/status",
        headers=auth_headers(seed.admin),
        json={"status": "maintenance", "last_health_check_now": True},
    )
    revoke_response = client.post(
        f"/api/v1/admin/operations/access-grants/{grant.id}/revoke",
        headers=auth_headers(seed.admin),
        json={"reason": "例行维护窗口结束"},
    )

    assert license_response.status_code == 200
    assert license_response.json()["limit"] == 320
    entitlement = db_session.scalar(
        select(LicenseEntitlement).where(LicenseEntitlement.entitlement_key == "active_users")
    )
    assert entitlement is not None
    assert entitlement.limit_value == 320
    assert deployment_response.status_code == 200
    assert deployment_response.json()["status"] == "idle"
    db_session.refresh(deployment)
    assert deployment.status == "maintenance"
    assert deployment.last_health_check_at is not None
    assert revoke_response.status_code == 200
    assert revoke_response.json()["status"] == "revoked"
    db_session.refresh(grant)
    assert grant.status == "revoked"
    assert grant.revoked_at is not None
    assert grant.reason == "例行维护窗口结束"


def test_teacher_cannot_mutate_admin_operations(
    client: TestClient,
    db_session: Session,
) -> None:
    seed = seed_demo_data(db_session)
    deployment = db_session.scalar(select(DeploymentInstance))
    grant = db_session.scalar(select(OperationsAccessGrant))
    assert deployment is not None
    assert grant is not None

    license_response = client.post(
        "/api/v1/admin/operations/license-entitlements",
        headers=auth_headers(seed.teacher),
        json={
            "entitlement_key": "active_users",
            "label": "活跃用户席位",
            "limit_value": 320,
            "unit": "人",
            "status": "active",
        },
    )
    deployment_response = client.post(
        f"/api/v1/admin/operations/deployment-instances/{deployment.id}/status",
        headers=auth_headers(seed.teacher),
        json={"status": "maintenance", "last_health_check_now": True},
    )
    revoke_response = client.post(
        f"/api/v1/admin/operations/access-grants/{grant.id}/revoke",
        headers=auth_headers(seed.teacher),
        json={"reason": "越权操作"},
    )

    assert license_response.status_code == 403
    assert deployment_response.status_code == 403
    assert revoke_response.status_code == 403
