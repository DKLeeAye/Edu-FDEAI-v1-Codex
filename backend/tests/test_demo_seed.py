from __future__ import annotations

from collections.abc import Generator

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import create_engine

from app.db.base import Base
from app.models import (
    ExperimentPackage,
    ExperimentPackageVersion,
    Rubric,
    StageBlueprint,
    Tenant,
    User,
)
from app.models.enums import PackageStatus, UserRole
from app.seeds.demo import MANUFACTURING_QA_PACKAGE_SLUG, seed_demo_data


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
    assert (
        package_versions[0].content_manifest_json["stage_1_ai_customer_persona"]["role"]
        == "生产部门负责人"
    )

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
    assert db_session.scalar(select(ExperimentPackage).where(ExperimentPackage.slug == package.slug))
