from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import (
    AiCallLog,
    Artifact,
    Course,
    DeploymentInstance,
    ExperimentSession,
    Institution,
    LicenseEntitlement,
    OperationsAccessGrant,
    Rubric,
    Tenant,
    User,
)
from app.models.enums import AiCallStatus, UserRole
from app.schemas.admin_operations import (
    AdminAiUsageByType,
    AdminAiUsageSummary,
    AdminAccessGrantRevokeRequest,
    AdminDataExportItem,
    AdminDeploymentInstance,
    AdminDeploymentStatusUpdateRequest,
    AdminLicenseEntitlement,
    AdminLicenseEntitlementUpsertRequest,
    AdminOperationsAccessGrant,
    AdminOperationsOverviewResponse,
    AdminScopeSummary,
)
from app.services.auth import CurrentUserContext
from app.services.errors import PermissionDeniedError, ResourceNotFoundError


def get_admin_operations_overview(
    session: Session,
    *,
    current_user: CurrentUserContext,
) -> AdminOperationsOverviewResponse:
    if current_user.role != UserRole.ADMIN:
        raise PermissionDeniedError("Only administrators can view operations overview.")

    tenant = session.get(Tenant, current_user.tenant_id)
    institution = session.get(Institution, current_user.institution_id)
    if tenant is None or institution is None:
        raise ResourceNotFoundError("Current administrator scope does not exist.")

    active_users_count = _count_scalar(
        session,
        select(func.count()).select_from(User).where(
            User.tenant_id == current_user.tenant_id,
            User.institution_id == current_user.institution_id,
            User.is_active.is_(True),
        ),
    )
    courses_count = _count_scalar(
        session,
        select(func.count()).select_from(Course).where(
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
        ),
    )
    sessions_count = _count_scalar(
        session,
        select(func.count()).select_from(ExperimentSession).where(
            ExperimentSession.tenant_id == current_user.tenant_id,
            ExperimentSession.institution_id == current_user.institution_id,
        ),
    )
    package_versions_count = _count_scalar(
        session,
        select(func.count(func.distinct(Course.package_version_id))).where(
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
        ),
    )
    ai_usage = _build_ai_usage(session, current_user=current_user)
    grade_count = _artifact_count(
        session,
        current_user=current_user,
        artifact_type="teacher_grade_publication",
    )
    artifact_count = _count_scalar(
        session,
        select(func.count()).select_from(Artifact).where(
            Artifact.tenant_id == current_user.tenant_id,
            Artifact.institution_id == current_user.institution_id,
        ),
    )
    rubric_count = _scoped_rubric_count(session, current_user=current_user)
    deployments = _build_deployment_instances(
        session,
        current_user=current_user,
        tenant=tenant,
        institution=institution,
        active_users_count=active_users_count,
        courses_count=courses_count,
        sessions_count=sessions_count,
        package_versions_count=package_versions_count,
    )
    return AdminOperationsOverviewResponse(
        tenant=AdminScopeSummary(id=tenant.id, name=tenant.name),
        institution=AdminScopeSummary(id=institution.id, name=institution.name),
        deployment_instances=deployments,
        license_entitlements=_build_license_entitlements(
            session,
            current_user=current_user,
            active_users_count=active_users_count,
            courses_count=courses_count,
            ai_calls_count=ai_usage.total_calls,
        ),
        operations_access_grants=_build_operations_access_grants(
            session,
            current_user=current_user,
        ),
        ai_usage=ai_usage,
        data_exports=[
            _data_export(
                key="gradebook",
                label="成绩册导出",
                record_count=grade_count,
                last_updated_at=_artifact_latest_at(
                    session,
                    current_user=current_user,
                    artifact_type="teacher_grade_publication",
                ),
            ),
            _data_export(
                key="artifact_archive",
                label="项目档案袋导出",
                record_count=artifact_count,
                last_updated_at=_table_latest_at(Artifact, session, current_user=current_user),
            ),
            _data_export(
                key="ai_audit_log",
                label="AI 调用审计导出",
                record_count=ai_usage.total_calls,
                last_updated_at=_table_latest_at(AiCallLog, session, current_user=current_user),
            ),
            _data_export(
                key="rubric_library",
                label="Rubric 规则库导出",
                record_count=rubric_count,
                last_updated_at=_rubric_latest_at(session, current_user=current_user),
            ),
        ],
    )


def upsert_license_entitlement(
    session: Session,
    *,
    current_user: CurrentUserContext,
    payload: AdminLicenseEntitlementUpsertRequest,
) -> AdminLicenseEntitlement:
    _ensure_admin(current_user)
    entitlement = session.scalar(
        select(LicenseEntitlement).where(
            LicenseEntitlement.tenant_id == current_user.tenant_id,
            LicenseEntitlement.institution_id == current_user.institution_id,
            LicenseEntitlement.entitlement_key == payload.entitlement_key,
        )
    )
    if entitlement is None:
        entitlement = LicenseEntitlement(
            tenant_id=current_user.tenant_id,
            institution_id=current_user.institution_id,
            entitlement_key=payload.entitlement_key,
            label=payload.label,
            limit_value=payload.limit_value,
            unit=payload.unit,
            status=payload.status,
            metadata_json={"source": "admin_operation"},
        )
        session.add(entitlement)
    else:
        entitlement.label = payload.label
        entitlement.limit_value = payload.limit_value
        entitlement.unit = payload.unit
        entitlement.status = payload.status
        entitlement.metadata_json = {**entitlement.metadata_json, "source": "admin_operation"}
    session.commit()
    session.refresh(entitlement)
    usage_by_key = _usage_by_entitlement_key(session, current_user=current_user)
    return AdminLicenseEntitlement(
        key=entitlement.entitlement_key,
        label=entitlement.label,
        status="active" if entitlement.status == "active" else "unused",
        used=usage_by_key.get(entitlement.entitlement_key, 0),
        limit=entitlement.limit_value,
        unit=entitlement.unit,
        source="license_entitlement",
    )


def update_deployment_instance_status(
    session: Session,
    *,
    current_user: CurrentUserContext,
    deployment_instance_id,
    payload: AdminDeploymentStatusUpdateRequest,
) -> AdminDeploymentInstance:
    _ensure_admin(current_user)
    deployment = session.scalar(
        select(DeploymentInstance).where(
            DeploymentInstance.id == deployment_instance_id,
            DeploymentInstance.tenant_id == current_user.tenant_id,
            DeploymentInstance.institution_id == current_user.institution_id,
        )
    )
    if deployment is None:
        raise ResourceNotFoundError("Deployment instance does not exist in current scope.")
    deployment.status = payload.status
    if payload.last_health_check_now:
        deployment.last_health_check_at = datetime.now(UTC)
    session.commit()
    session.refresh(deployment)
    counts = _scope_counts(session, current_user=current_user)
    return AdminDeploymentInstance(
        id=str(deployment.id),
        name=deployment.name,
        environment=_deployment_environment(deployment.environment),
        status="running" if deployment.status == "running" else "idle",
        courses_count=counts["courses"],
        sessions_count=counts["sessions"],
        active_users_count=counts["active_users"],
        package_versions_count=counts["package_versions"],
        last_activity_at=deployment.last_health_check_at
        or _latest_activity_at(session, current_user=current_user),
    )


def revoke_operations_access_grant(
    session: Session,
    *,
    current_user: CurrentUserContext,
    grant_id,
    payload: AdminAccessGrantRevokeRequest,
) -> AdminOperationsAccessGrant:
    _ensure_admin(current_user)
    grant = session.scalar(
        select(OperationsAccessGrant).where(
            OperationsAccessGrant.id == grant_id,
            OperationsAccessGrant.tenant_id == current_user.tenant_id,
            OperationsAccessGrant.institution_id == current_user.institution_id,
        )
    )
    if grant is None:
        raise ResourceNotFoundError("Operations access grant does not exist in current scope.")
    grant.status = "revoked"
    grant.reason = payload.reason
    grant.revoked_at = datetime.now(UTC)
    session.commit()
    session.refresh(grant)
    return _build_operations_access_grant(grant)


def _ensure_admin(current_user: CurrentUserContext) -> None:
    if current_user.role != UserRole.ADMIN:
        raise PermissionDeniedError("Only administrators can mutate operations resources.")


def _scope_counts(
    session: Session,
    *,
    current_user: CurrentUserContext,
) -> dict[str, int]:
    return {
        "active_users": _count_scalar(
            session,
            select(func.count()).select_from(User).where(
                User.tenant_id == current_user.tenant_id,
                User.institution_id == current_user.institution_id,
                User.is_active.is_(True),
            ),
        ),
        "courses": _count_scalar(
            session,
            select(func.count()).select_from(Course).where(
                Course.tenant_id == current_user.tenant_id,
                Course.institution_id == current_user.institution_id,
            ),
        ),
        "sessions": _count_scalar(
            session,
            select(func.count()).select_from(ExperimentSession).where(
                ExperimentSession.tenant_id == current_user.tenant_id,
                ExperimentSession.institution_id == current_user.institution_id,
            ),
        ),
        "package_versions": _count_scalar(
            session,
            select(func.count(func.distinct(Course.package_version_id))).where(
                Course.tenant_id == current_user.tenant_id,
                Course.institution_id == current_user.institution_id,
            ),
        ),
    }


def _usage_by_entitlement_key(
    session: Session,
    *,
    current_user: CurrentUserContext,
) -> dict[str, int]:
    counts = _scope_counts(session, current_user=current_user)
    return {
        "active_users": counts["active_users"],
        "courses": counts["courses"],
        "ai_calls": _count_scalar(
            session,
            select(func.count()).select_from(AiCallLog).where(
                AiCallLog.tenant_id == current_user.tenant_id,
                AiCallLog.institution_id == current_user.institution_id,
            ),
        ),
    }


def _build_deployment_instances(
    session: Session,
    *,
    current_user: CurrentUserContext,
    tenant: Tenant,
    institution: Institution,
    active_users_count: int,
    courses_count: int,
    sessions_count: int,
    package_versions_count: int,
) -> list[AdminDeploymentInstance]:
    latest_activity_at = _latest_activity_at(session, current_user=current_user)
    deployment_rows = session.scalars(
        select(DeploymentInstance)
        .where(
            DeploymentInstance.tenant_id == current_user.tenant_id,
            DeploymentInstance.institution_id == current_user.institution_id,
        )
        .order_by(DeploymentInstance.created_at)
    ).all()
    if not deployment_rows:
        return [
            AdminDeploymentInstance(
                id=f"{tenant.slug}-{institution.code}-local",
                name=f"{institution.name} EduFDE 实训平台",
                environment="local",
                status="running" if active_users_count or courses_count else "idle",
                courses_count=courses_count,
                sessions_count=sessions_count,
                active_users_count=active_users_count,
                package_versions_count=package_versions_count,
                last_activity_at=latest_activity_at,
            )
        ]
    return [
        AdminDeploymentInstance(
            id=str(deployment.id),
            name=deployment.name,
            environment=_deployment_environment(deployment.environment),
            status="running" if deployment.status == "running" else "idle",
            courses_count=courses_count,
            sessions_count=sessions_count,
            active_users_count=active_users_count,
            package_versions_count=package_versions_count,
            last_activity_at=deployment.last_health_check_at or latest_activity_at,
        )
        for deployment in deployment_rows
    ]


def _build_license_entitlements(
    session: Session,
    *,
    current_user: CurrentUserContext,
    active_users_count: int,
    courses_count: int,
    ai_calls_count: int,
) -> list[AdminLicenseEntitlement]:
    usage_by_key = {
        "active_users": active_users_count,
        "courses": courses_count,
        "ai_calls": ai_calls_count,
    }
    entitlement_rows = session.scalars(
        select(LicenseEntitlement)
        .where(
            LicenseEntitlement.tenant_id == current_user.tenant_id,
            LicenseEntitlement.institution_id == current_user.institution_id,
        )
        .order_by(LicenseEntitlement.entitlement_key)
    ).all()
    if entitlement_rows:
        return [
            AdminLicenseEntitlement(
                key=entitlement.entitlement_key,
                label=entitlement.label,
                status="active" if entitlement.status == "active" else "unused",
                used=usage_by_key.get(entitlement.entitlement_key, 0),
                limit=entitlement.limit_value,
                unit=entitlement.unit,
                source="license_entitlement",
            )
            for entitlement in entitlement_rows
        ]
    return [
        _entitlement(key="active_users", label="活跃用户席位", used=active_users_count, unit="人"),
        _entitlement(key="courses", label="课程运行数量", used=courses_count, unit="门"),
        _entitlement(key="ai_calls", label="AI Gateway 调用", used=ai_calls_count, unit="次"),
    ]


def _build_operations_access_grants(
    session: Session,
    *,
    current_user: CurrentUserContext,
) -> list[AdminOperationsAccessGrant]:
    grants = session.scalars(
        select(OperationsAccessGrant)
        .where(
            OperationsAccessGrant.tenant_id == current_user.tenant_id,
            OperationsAccessGrant.institution_id == current_user.institution_id,
        )
        .order_by(OperationsAccessGrant.created_at.desc())
    ).all()
    return [
        _build_operations_access_grant(grant)
        for grant in grants
    ]


def _build_operations_access_grant(grant: OperationsAccessGrant) -> AdminOperationsAccessGrant:
    return AdminOperationsAccessGrant(
        id=grant.id,
        deployment_instance_id=grant.deployment_instance_id,
        status=grant.status,
        reason=grant.reason,
        scope=grant.scope_json,
        starts_at=grant.starts_at,
        expires_at=grant.expires_at,
        created_at=grant.created_at,
    )


def _deployment_environment(environment: str) -> str:
    if environment in {"local", "staging", "production"}:
        return environment
    return "local"


def _build_ai_usage(
    session: Session,
    *,
    current_user: CurrentUserContext,
) -> AdminAiUsageSummary:
    summary_row = session.execute(
        select(
            func.count(AiCallLog.id),
            func.sum(case((AiCallLog.status == AiCallStatus.SUCCEEDED, 1), else_=0)),
            func.sum(case((AiCallLog.status == AiCallStatus.FAILED, 1), else_=0)),
            func.coalesce(func.sum(AiCallLog.total_tokens), 0),
            func.avg(AiCallLog.latency_ms),
        ).where(
            AiCallLog.tenant_id == current_user.tenant_id,
            AiCallLog.institution_id == current_user.institution_id,
        )
    ).one()
    usage_rows = session.execute(
        select(
            AiCallLog.usage_type,
            func.count(AiCallLog.id),
            func.sum(case((AiCallLog.status == AiCallStatus.FAILED, 1), else_=0)),
            func.coalesce(func.sum(AiCallLog.total_tokens), 0),
        )
        .where(
            AiCallLog.tenant_id == current_user.tenant_id,
            AiCallLog.institution_id == current_user.institution_id,
        )
        .group_by(AiCallLog.usage_type)
        .order_by(AiCallLog.usage_type)
    ).all()
    average_latency = summary_row[4]
    return AdminAiUsageSummary(
        total_calls=int(summary_row[0] or 0),
        succeeded_calls=int(summary_row[1] or 0),
        failed_calls=int(summary_row[2] or 0),
        total_tokens=int(summary_row[3] or 0),
        average_latency_ms=round(float(average_latency)) if average_latency is not None else None,
        by_usage_type=[
            AdminAiUsageByType(
                usage_type=str(row[0]),
                call_count=int(row[1] or 0),
                failed_count=int(row[2] or 0),
                total_tokens=int(row[3] or 0),
            )
            for row in usage_rows
        ],
    )


def _entitlement(
    *,
    key: str,
    label: str,
    used: int,
    unit: str,
) -> AdminLicenseEntitlement:
    return AdminLicenseEntitlement(
        key=key,
        label=label,
        status="active" if used > 0 else "unused",
        used=used,
        limit=None,
        unit=unit,
        source="derived_from_current_scope",
    )


def _data_export(
    *,
    key: str,
    label: str,
    record_count: int,
    last_updated_at: datetime | None,
) -> AdminDataExportItem:
    return AdminDataExportItem(
        key=key,
        label=label,
        status="ready" if record_count > 0 else "empty",
        record_count=record_count,
        last_updated_at=last_updated_at,
    )


def _artifact_count(
    session: Session,
    *,
    current_user: CurrentUserContext,
    artifact_type: str,
) -> int:
    return _count_scalar(
        session,
        select(func.count()).select_from(Artifact).where(
            Artifact.tenant_id == current_user.tenant_id,
            Artifact.institution_id == current_user.institution_id,
            Artifact.artifact_type == artifact_type,
        ),
    )


def _scoped_rubric_count(session: Session, *, current_user: CurrentUserContext) -> int:
    used_package_version_ids = select(Course.package_version_id).where(
        Course.tenant_id == current_user.tenant_id,
        Course.institution_id == current_user.institution_id,
    )
    return _count_scalar(
        session,
        select(func.count()).select_from(Rubric).where(
            Rubric.package_version_id.in_(used_package_version_ids),
        ),
    )


def _latest_activity_at(
    session: Session,
    *,
    current_user: CurrentUserContext,
) -> datetime | None:
    latest_values = [
        _table_latest_at(User, session, current_user=current_user),
        _table_latest_at(Course, session, current_user=current_user),
        _table_latest_at(ExperimentSession, session, current_user=current_user),
        _table_latest_at(Artifact, session, current_user=current_user),
        _table_latest_at(AiCallLog, session, current_user=current_user),
    ]
    existing = [value for value in latest_values if value is not None]
    return max(existing) if existing else None


def _table_latest_at(
    model: type[User] | type[Course] | type[ExperimentSession] | type[Artifact] | type[AiCallLog],
    session: Session,
    *,
    current_user: CurrentUserContext,
) -> datetime | None:
    return session.scalar(
        select(func.max(model.updated_at)).where(
            model.tenant_id == current_user.tenant_id,
            model.institution_id == current_user.institution_id,
        )
    )


def _artifact_latest_at(
    session: Session,
    *,
    current_user: CurrentUserContext,
    artifact_type: str,
) -> datetime | None:
    return session.scalar(
        select(func.max(Artifact.updated_at)).where(
            Artifact.tenant_id == current_user.tenant_id,
            Artifact.institution_id == current_user.institution_id,
            Artifact.artifact_type == artifact_type,
        )
    )


def _rubric_latest_at(session: Session, *, current_user: CurrentUserContext) -> datetime | None:
    used_package_version_ids = select(Course.package_version_id).where(
        Course.tenant_id == current_user.tenant_id,
        Course.institution_id == current_user.institution_id,
    )
    return session.scalar(
        select(func.max(Rubric.updated_at)).where(
            Rubric.package_version_id.in_(used_package_version_ids),
        )
    )


def _count_scalar(session: Session, statement) -> int:  # type: ignore[no-untyped-def]
    return int(session.scalar(statement) or 0)
