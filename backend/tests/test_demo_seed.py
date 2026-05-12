from __future__ import annotations

from collections.abc import Generator

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import create_engine

from app.db.base import Base
from app.models import (
    Course,
    ExperimentPackage,
    ExperimentPackageVersion,
    Rubric,
    StageBlueprint,
    Tenant,
    User,
)
from app.models.enums import PackageStatus, UserRole
from app.core.security import verify_password
from app.seeds.demo import DEMO_PASSWORD, MANUFACTURING_QA_PACKAGE_SLUG, seed_demo_data


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


def test_demo_seed_creates_default_users_and_manufacturing_package_version(
    db_session: Session,
) -> None:
    result = seed_demo_data(db_session)
    seed_demo_data(db_session)

    assert result.tenant.slug == "default"
    assert result.institution.code == "DEMO"

    demo_users = db_session.scalars(
        select(User).where(
            User.tenant_id == result.tenant.id,
            User.institution_id == result.institution.id,
        )
    ).all()
    assert {user.email: user.role for user in demo_users} == {
        "admin@edufde.demo": UserRole.ADMIN,
        "teacher@edufde.demo": UserRole.TEACHER,
        "student@edufde.demo": UserRole.STUDENT,
        "student2@edufde.demo": UserRole.STUDENT,
    }

    package = db_session.scalar(
        select(ExperimentPackage).where(ExperimentPackage.slug == MANUFACTURING_QA_PACKAGE_SLUG)
    )
    assert package is not None

    package_versions = db_session.scalars(
        select(ExperimentPackageVersion).where(ExperimentPackageVersion.package_id == package.id)
    ).all()
    assert len(package_versions) == 1
    assert package_versions[0].version == "1.0.0"
    assert package_versions[0].status == PackageStatus.PUBLISHED
    manifest = package_versions[0].content_manifest_json
    assert manifest["stage_1_ai_customer_persona"]["role"] == "生产部门负责人"
    assert manifest["stage_1_ai_config"]["customer_persona_bindings"] == {
        "guided_default": "mfg_quality_owner_zhou_ming",
        "practice_default": "mfg_quality_owner_zhou_ming",
    }
    assert manifest["customer_personas"][0]["id"] == "mfg_quality_owner_zhou_ming"
    assert manifest["customer_personas"][0]["position"] == "制造工厂质量负责人"
    assert "隐藏信息" in manifest["customer_personas"][0]["release_rules"][0]

    stage_blueprints = db_session.scalars(
        select(StageBlueprint)
        .where(StageBlueprint.package_version_id == package_versions[0].id)
        .order_by(StageBlueprint.stage_order)
    ).all()
    assert [(stage.stage_key, stage.stage_order) for stage in stage_blueprints] == [
        ("stage_1", 1),
        ("stage_2", 2),
        ("stage_3", 3),
        ("stage_4", 4),
        ("stage_5", 5),
    ]

    rubrics = db_session.scalars(
        select(Rubric).where(Rubric.package_version_id == package_versions[0].id)
    ).all()
    assert len(rubrics) == 5
    assert {rubric.stage_key for rubric in rubrics} == {
        "stage_1",
        "stage_2",
        "stage_3",
        "stage_4",
        "stage_5",
    }

    assert db_session.scalar(select(Tenant).where(Tenant.slug == "default")) is not None
    assert db_session.scalar(
        select(ExperimentPackage).where(ExperimentPackage.slug == package.slug)
    )


def test_demo_seed_creates_student_usable_demo_course(db_session: Session) -> None:
    result = seed_demo_data(db_session)
    seed_demo_data(db_session)

    demo_courses = db_session.scalars(
        select(Course).where(
            Course.tenant_id == result.tenant.id,
            Course.institution_id == result.institution.id,
            Course.code == "MFG-QA-DEMO",
        )
    ).all()

    assert len(demo_courses) == 1
    assert demo_courses[0].title == "制造业质检 AI 项目实训"
    assert demo_courses[0].package_version_id == result.package_version.id
    assert demo_courses[0].created_by_user_id == result.teacher.id


def test_demo_seed_restores_demo_user_login_contract(db_session: Session) -> None:
    seed_demo_data(db_session)
    student = db_session.scalar(select(User).where(User.email == "student@edufde.demo"))
    assert student is not None
    student.password_hash = "corrupted-password-hash"
    student.is_active = False
    db_session.commit()

    seed_demo_data(db_session)
    db_session.refresh(student)

    assert student.is_active is True
    assert student.role == UserRole.STUDENT
    assert verify_password(DEMO_PASSWORD, student.password_hash)
