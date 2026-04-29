from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.base import Base
from app.db.session import build_engine, get_sessionmaker
from app.models import (
    AiCallLog,
    Artifact,
    Course,
    ExperimentPackage,
    ExperimentPackageVersion,
    ExperimentSession,
    Institution,
    Rubric,
    StageRecord,
    Tenant,
    User,
    YellowFlag,
)


def test_database_enums_store_documented_lowercase_values() -> None:
    assert User.__table__.c.role.type.enums == ["admin", "teacher", "student"]
    assert Course.__table__.c.status.type.enums == ["draft", "active", "archived"]
    assert StageRecord.__table__.c.status.type.enums == [
        "locked",
        "not_started",
        "in_learning",
        "in_practice",
        "submitted",
        "revision_required",
        "warning_confirmed",
        "completed",
        "skipped",
    ]


def test_metadata_contains_mvp_foundation_tables() -> None:
    assert set(Base.metadata.tables) >= {
        "tenants",
        "institutions",
        "users",
        "courses",
        "experiment_packages",
        "experiment_package_versions",
        "experiment_sessions",
        "stage_records",
        "artifacts",
        "rubrics",
        "yellow_flags",
        "ai_call_logs",
    }


def test_course_requires_experiment_package_version_binding() -> None:
    package_version_column = Course.__table__.c.package_version_id

    assert not package_version_column.nullable
    assert {
        foreign_key.column.table.name
        for foreign_key in package_version_column.foreign_keys
    } == {"experiment_package_versions"}


def test_runtime_models_keep_scope_boundary_columns() -> None:
    scoped_models = [
        User,
        Course,
        ExperimentSession,
        StageRecord,
        Artifact,
        Rubric,
        YellowFlag,
        AiCallLog,
    ]

    for model in scoped_models:
        columns = set(model.__table__.c.keys())
        assert {"tenant_id", "institution_id"}.issubset(columns)

    for model in [ExperimentSession, StageRecord, Artifact, YellowFlag, AiCallLog]:
        assert "course_id" in set(model.__table__.c.keys())


def test_foundation_relationships_are_declared() -> None:
    mapper_relationships = {
        model.__name__: set(inspect(model).relationships.keys())
        for model in [
            Tenant,
            Institution,
            User,
            Course,
            ExperimentPackage,
            ExperimentPackageVersion,
            ExperimentSession,
            StageRecord,
            Artifact,
            Rubric,
            YellowFlag,
            AiCallLog,
        ]
    }

    assert mapper_relationships["Tenant"] >= {"institutions", "users", "courses"}
    assert mapper_relationships["Institution"] >= {"tenant", "users", "courses"}
    assert mapper_relationships["Course"] >= {"package_version", "sessions", "stage_records"}
    assert mapper_relationships["ExperimentSession"] >= {"course", "student", "stage_records"}
    assert mapper_relationships["StageRecord"] >= {"session", "artifacts"}
    assert mapper_relationships["Artifact"] >= {"session", "stage_record", "submitted_by"}
    assert mapper_relationships["Rubric"] >= {"package_version", "course"}
    assert mapper_relationships["AiCallLog"] >= {"tenant", "institution", "course"}


def test_database_session_factory_uses_configured_database_url() -> None:
    settings = Settings(DATABASE_URL="sqlite+pysqlite:///:memory:")
    engine = build_engine(settings)
    sessionmaker = get_sessionmaker(engine)

    with sessionmaker() as session:
        assert isinstance(session, Session)
