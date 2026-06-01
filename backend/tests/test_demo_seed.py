from __future__ import annotations

from collections.abc import Generator

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import create_engine

from app.db.base import Base
from app.models import (
    Artifact,
    Course,
    ExperimentSession,
    ExperimentPackage,
    ExperimentPackageVersion,
    Rubric,
    StageBlueprint,
    StageRecord,
    Tenant,
    User,
)
from app.models.enums import PackageStatus, SessionStatus, StageStatus, UserRole
from app.core.security import verify_password
from app.seeds.demo import (
    DEMO_PASSWORD,
    OPEN_DESIGN_VNEXT_LATE_QA_COURSE_CODE,
    OPEN_DESIGN_VNEXT_LATE_QA_STUDENT_EMAIL,
    MANUFACTURING_QA_PACKAGE_SLUG,
    OPEN_DESIGN_VNEXT_STAGE_ONE_QA_COURSE_CODE,
    OPEN_DESIGN_VNEXT_STAGE_ONE_QA_STUDENT_EMAIL,
    OPEN_DESIGN_VNEXT_STAGE_TWO_GUIDE_QA_COURSE_CODE,
    OPEN_DESIGN_VNEXT_STAGE_TWO_GUIDE_QA_STUDENT_EMAIL,
    OPEN_DESIGN_VNEXT_QA_COURSE_CODE,
    OPEN_DESIGN_VNEXT_QA_STUDENT_EMAIL,
    seed_demo_data,
    seed_open_design_vnext_late_qa_data,
    seed_open_design_vnext_stage_one_qa_data,
    seed_open_design_vnext_stage_two_guide_qa_data,
    seed_open_design_vnext_qa_data,
)


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


def test_open_design_vnext_qa_seed_creates_stable_visual_review_state(
    db_session: Session,
) -> None:
    result = seed_open_design_vnext_qa_data(db_session)
    seed_open_design_vnext_qa_data(db_session)

    student = db_session.scalar(select(User).where(User.email == OPEN_DESIGN_VNEXT_QA_STUDENT_EMAIL))
    assert student is not None
    assert student.full_name == "林同学"
    assert verify_password(DEMO_PASSWORD, student.password_hash)

    course = db_session.scalar(select(Course).where(Course.code == OPEN_DESIGN_VNEXT_QA_COURSE_CODE))
    assert course is not None
    assert course.title == "制造业质检 AI 客户访谈实训"
    assert course.created_by_user_id == result.teacher.id

    experiment_session = db_session.scalar(
        select(ExperimentSession).where(
            ExperimentSession.course_id == course.id,
            ExperimentSession.student_user_id == student.id,
        )
    )
    assert experiment_session is not None
    assert experiment_session.status == SessionStatus.IN_PROGRESS

    stage_statuses = {
        stage.stage_key: stage.status
        for stage in db_session.scalars(
            select(StageRecord)
            .where(StageRecord.session_id == experiment_session.id)
            .order_by(StageRecord.stage_order)
        )
    }
    assert stage_statuses == {
        "stage_1": StageStatus.COMPLETED,
        "stage_2": StageStatus.COMPLETED,
        "stage_3": StageStatus.IN_PRACTICE,
        "stage_4": StageStatus.LOCKED,
        "stage_5": StageStatus.LOCKED,
    }

    artifacts = db_session.scalars(
        select(Artifact)
        .where(Artifact.session_id == experiment_session.id)
        .order_by(Artifact.stage_key, Artifact.artifact_type, Artifact.title)
    ).all()
    assert len(artifacts) == 12
    assert {
        (artifact.stage_key, artifact.artifact_type, artifact.title)
        for artifact in artifacts
    } >= {
        ("stage_1", "stage_1_interview_turn", "AI 客户访谈记录"),
        ("stage_2", "stage_2_ai_review", "阶段二 AI 评审"),
        ("stage_3", "stage_3_knowledge_decision", "知识工程决策表"),
    }
    stage_two_review = next(
        artifact for artifact in artifacts if artifact.artifact_type == "stage_2_ai_review"
    )
    assert stage_two_review.content_json["ai_score"] == 82
    assert stage_two_review.content_json["rubric"]["name"] == "solution_definition_v1.1"

    duplicate_count = db_session.scalar(
        select(func.count(Artifact.id)).where(Artifact.session_id == experiment_session.id)
    )
    assert duplicate_count == 12


def test_open_design_vnext_stage_one_qa_seed_creates_unstarted_interview_state(
    db_session: Session,
) -> None:
    result = seed_open_design_vnext_stage_one_qa_data(db_session)
    seed_open_design_vnext_stage_one_qa_data(db_session)

    student = db_session.scalar(
        select(User).where(User.email == OPEN_DESIGN_VNEXT_STAGE_ONE_QA_STUDENT_EMAIL)
    )
    assert student is not None
    assert student.full_name == "王同学"
    assert verify_password(DEMO_PASSWORD, student.password_hash)

    course = db_session.scalar(
        select(Course).where(Course.code == OPEN_DESIGN_VNEXT_STAGE_ONE_QA_COURSE_CODE)
    )
    assert course is not None
    assert course.title == "制造业质检 AI 访谈导学实训"
    assert course.created_by_user_id == result.teacher.id

    experiment_session = db_session.scalar(
        select(ExperimentSession).where(
            ExperimentSession.course_id == course.id,
            ExperimentSession.student_user_id == student.id,
        )
    )
    assert experiment_session is not None
    assert experiment_session.status == SessionStatus.IN_PROGRESS

    stage_statuses = {
        stage.stage_key: stage.status
        for stage in db_session.scalars(
            select(StageRecord)
            .where(StageRecord.session_id == experiment_session.id)
            .order_by(StageRecord.stage_order)
        )
    }
    assert stage_statuses == {
        "stage_1": StageStatus.IN_PRACTICE,
        "stage_2": StageStatus.LOCKED,
        "stage_3": StageStatus.LOCKED,
        "stage_4": StageStatus.LOCKED,
        "stage_5": StageStatus.LOCKED,
    }
    assert (
        db_session.scalar(select(func.count(Artifact.id)).where(Artifact.session_id == experiment_session.id))
        == 0
    )


def test_open_design_vnext_stage_two_guide_qa_seed_creates_unstarted_solution_state(
    db_session: Session,
) -> None:
    result = seed_open_design_vnext_stage_two_guide_qa_data(db_session)
    seed_open_design_vnext_stage_two_guide_qa_data(db_session)

    student = db_session.scalar(
        select(User).where(User.email == OPEN_DESIGN_VNEXT_STAGE_TWO_GUIDE_QA_STUDENT_EMAIL)
    )
    assert student is not None
    assert student.full_name == "赵同学"
    assert verify_password(DEMO_PASSWORD, student.password_hash)

    course = db_session.scalar(
        select(Course).where(Course.code == OPEN_DESIGN_VNEXT_STAGE_TWO_GUIDE_QA_COURSE_CODE)
    )
    assert course is not None
    assert course.title == "制造业质检 AI 方案导学实训"
    assert course.created_by_user_id == result.teacher.id

    experiment_session = db_session.scalar(
        select(ExperimentSession).where(
            ExperimentSession.course_id == course.id,
            ExperimentSession.student_user_id == student.id,
        )
    )
    assert experiment_session is not None
    assert experiment_session.status == SessionStatus.IN_PROGRESS

    stage_statuses = {
        stage.stage_key: stage.status
        for stage in db_session.scalars(
            select(StageRecord)
            .where(StageRecord.session_id == experiment_session.id)
            .order_by(StageRecord.stage_order)
        )
    }
    assert stage_statuses == {
        "stage_1": StageStatus.COMPLETED,
        "stage_2": StageStatus.IN_PRACTICE,
        "stage_3": StageStatus.LOCKED,
        "stage_4": StageStatus.LOCKED,
        "stage_5": StageStatus.LOCKED,
    }
    assert (
        db_session.scalar(select(func.count(Artifact.id)).where(Artifact.session_id == experiment_session.id))
        == 0
    )


def test_open_design_vnext_late_qa_seed_creates_stage_four_and_five_visual_state(
    db_session: Session,
) -> None:
    result = seed_open_design_vnext_late_qa_data(db_session)
    seed_open_design_vnext_late_qa_data(db_session)

    student = db_session.scalar(
        select(User).where(User.email == OPEN_DESIGN_VNEXT_LATE_QA_STUDENT_EMAIL)
    )
    assert student is not None
    assert student.full_name == "陈同学"
    assert verify_password(DEMO_PASSWORD, student.password_hash)

    course = db_session.scalar(
        select(Course).where(Course.code == OPEN_DESIGN_VNEXT_LATE_QA_COURSE_CODE)
    )
    assert course is not None
    assert course.title == "制造业质检 AI 交付验收实训"
    assert course.created_by_user_id == result.teacher.id

    experiment_session = db_session.scalar(
        select(ExperimentSession).where(
            ExperimentSession.course_id == course.id,
            ExperimentSession.student_user_id == student.id,
        )
    )
    assert experiment_session is not None
    assert experiment_session.status == SessionStatus.IN_PROGRESS

    stage_statuses = {
        stage.stage_key: stage.status
        for stage in db_session.scalars(
            select(StageRecord)
            .where(StageRecord.session_id == experiment_session.id)
            .order_by(StageRecord.stage_order)
        )
    }
    assert stage_statuses == {
        "stage_1": StageStatus.COMPLETED,
        "stage_2": StageStatus.COMPLETED,
        "stage_3": StageStatus.COMPLETED,
        "stage_4": StageStatus.IN_PRACTICE,
        "stage_5": StageStatus.NOT_STARTED,
    }

    artifacts = db_session.scalars(
        select(Artifact)
        .where(Artifact.session_id == experiment_session.id)
        .order_by(Artifact.stage_key, Artifact.artifact_type, Artifact.title)
    ).all()
    assert len(artifacts) == 19
    assert {
        (artifact.stage_key, artifact.artifact_type, artifact.title)
        for artifact in artifacts
    } >= {
        ("stage_3", "stage_3_ai_review", "阶段三 AI 评审"),
        ("stage_4", "stage_4_dify_implementation", "Dify 智能体构建记录"),
        ("stage_4", "stage_4_test_report", "平台自动化测试报告"),
        ("stage_5", "stage_5_delivery_document", "交付说明书草稿"),
        ("stage_5", "stage_5_operations_guide", "运维说明草稿"),
    }

    stage_four_review = next(
        artifact for artifact in artifacts if artifact.artifact_type == "stage_4_ai_test_review"
    )
    stage_four_report = next(
        artifact for artifact in artifacts if artifact.artifact_type == "stage_4_test_report"
    )
    assert stage_four_report.content_json["total_score"] == 84
    assert stage_four_review.content_json["ai_score"] == 84
    assert stage_four_review.content_json["rubric"]["name"] == "agent_test_v1.0"

    duplicate_count = db_session.scalar(
        select(func.count(Artifact.id)).where(Artifact.session_id == experiment_session.id)
    )
    assert duplicate_count == 19
