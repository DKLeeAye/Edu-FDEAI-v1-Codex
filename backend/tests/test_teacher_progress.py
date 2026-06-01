from __future__ import annotations

import uuid
import zipfile
from collections.abc import Generator
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_session
from app.main import create_app
from app.models import Artifact, Course, CourseMember, ExperimentSession, Rubric, User
from app.models.enums import RubricStatus, UserRole
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


def get_demo_user(session: Session, role: UserRole) -> User:
    return session.scalar(select(User).where(User.role == role))  # type: ignore[return-value]


def create_demo_course_and_session(
    client: TestClient,
    db_session: Session,
    *,
    code: str = "MFG-QA-TEACHER",
) -> tuple[Course, ExperimentSession, User, User]:
    seed = seed_demo_data(db_session)
    teacher = get_demo_user(db_session, UserRole.TEACHER)
    student = get_demo_user(db_session, UserRole.STUDENT)
    course_response = client.post(
        "/api/v1/courses",
        headers=auth_headers(teacher),
        json={
            "title": "制造业质检 AI 项目实训",
            "code": code,
            "package_version_id": str(seed.package_version.id),
        },
    )
    session_response = client.post(
        "/api/v1/experiment-sessions",
        headers=auth_headers(student),
        json={"course_id": course_response.json()["id"]},
    )
    course = db_session.get(Course, uuid.UUID(course_response.json()["id"]))
    experiment_session = db_session.get(ExperimentSession, uuid.UUID(session_response.json()["id"]))
    assert course is not None
    assert experiment_session is not None
    return course, experiment_session, student, teacher


def create_stage_artifact(
    client: TestClient,
    experiment_session: ExperimentSession,
    student: User,
    *,
    stage_key: str,
    artifact_type: str,
    content_json: dict | None = None,
    title: str,
) -> str:
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}/stages/{stage_key}/artifacts",
        headers=auth_headers(student),
        json={
            "artifact_type": artifact_type,
            "title": title,
            "content_json": content_json or {"summary": title},
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_teacher_can_view_own_course_session_progress_with_stage_artifact_counts(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student, teacher = create_demo_course_and_session(
        client,
        db_session,
    )
    create_stage_artifact(
        client,
        experiment_session,
        student,
        stage_key="stage_1",
        artifact_type="stage_1_problem_summary",
        title="问题发现总结",
    )
    create_stage_artifact(
        client,
        experiment_session,
        student,
        stage_key="stage_1",
        artifact_type="stage_1_interview_turn",
        title="访谈记录",
    )
    create_stage_artifact(
        client,
        experiment_session,
        student,
        stage_key="stage_2",
        artifact_type="stage_2_solution_definition",
        title="方案定义",
    )

    response = client.get(
        "/api/v1/teacher/progress/courses",
        headers=auth_headers(teacher),
    )

    assert response.status_code == 200
    body = response.json()
    course_progress = next(item for item in body if item["id"] == str(course.id))
    assert course_progress["created_by_user_id"] == str(teacher.id)
    assert len(course_progress["sessions"]) == 1

    session_progress = course_progress["sessions"][0]
    assert session_progress["id"] == str(experiment_session.id)
    assert session_progress["student"] == {
        "id": str(student.id),
        "email": student.email,
        "full_name": student.full_name,
    }
    assert session_progress["status"] == "not_started"
    assert session_progress["artifact_total_count"] == 3
    assert session_progress["updated_at"] is not None
    assert [
        (stage["stage_key"], stage["status"], stage["artifact_count"])
        for stage in session_progress["stage_records"]
    ] == [
        ("stage_1", "not_started", 2),
        ("stage_2", "locked", 1),
        ("stage_3", "locked", 0),
        ("stage_4", "locked", 0),
        ("stage_5", "locked", 0),
    ]


def test_teacher_progress_excludes_courses_created_by_other_teacher(
    client: TestClient,
    db_session: Session,
) -> None:
    own_course, _, _, teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-OWN",
    )
    seed = seed_demo_data(db_session)
    other_teacher = User(
        tenant_id=teacher.tenant_id,
        institution_id=teacher.institution_id,
        email="other.teacher@example.edu",
        password_hash="disabled",
        full_name="Other Teacher",
        role=UserRole.TEACHER,
        is_active=True,
    )
    db_session.add(other_teacher)
    db_session.commit()
    other_course_response = client.post(
        "/api/v1/courses",
        headers=auth_headers(other_teacher),
        json={
            "title": "其他教师课程",
            "code": "MFG-QA-OTHER-TEACHER",
            "package_version_id": str(seed.package_version.id),
        },
    )
    assert other_course_response.status_code == 201

    response = client.get(
        "/api/v1/teacher/progress/courses",
        headers=auth_headers(teacher),
    )

    assert response.status_code == 200
    returned_course_ids = {item["id"] for item in response.json()}
    assert str(own_course.id) in returned_course_ids
    assert other_course_response.json()["id"] not in returned_course_ids


def test_teacher_progress_includes_course_when_teacher_is_active_course_member(
    client: TestClient,
    db_session: Session,
) -> None:
    course, _, _, owner_teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-MEMBER-ACCESS",
    )
    member_teacher = User(
        tenant_id=owner_teacher.tenant_id,
        institution_id=owner_teacher.institution_id,
        email="member.teacher@example.edu",
        password_hash="disabled",
        full_name="Member Teacher",
        role=UserRole.TEACHER,
        is_active=True,
    )
    db_session.add(member_teacher)
    db_session.flush()
    db_session.add(
        CourseMember(
            tenant_id=course.tenant_id,
            institution_id=course.institution_id,
            course_id=course.id,
            user_id=member_teacher.id,
            role="teacher",
            is_active=True,
        )
    )
    db_session.commit()

    response = client.get(
        "/api/v1/teacher/progress/courses",
        headers=auth_headers(member_teacher),
    )

    assert response.status_code == 200
    returned_course_ids = {item["id"] for item in response.json()}
    assert str(course.id) in returned_course_ids


def test_inactive_course_member_cannot_view_teacher_progress(
    client: TestClient,
    db_session: Session,
) -> None:
    course, _, _, owner_teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-INACTIVE-MEMBER",
    )
    inactive_teacher = User(
        tenant_id=owner_teacher.tenant_id,
        institution_id=owner_teacher.institution_id,
        email="inactive.member.teacher@example.edu",
        password_hash="disabled",
        full_name="Inactive Member Teacher",
        role=UserRole.TEACHER,
        is_active=True,
    )
    db_session.add(inactive_teacher)
    db_session.flush()
    db_session.add(
        CourseMember(
            tenant_id=course.tenant_id,
            institution_id=course.institution_id,
            course_id=course.id,
            user_id=inactive_teacher.id,
            role="teacher",
            is_active=False,
        )
    )
    db_session.commit()

    response = client.get(
        "/api/v1/teacher/progress/courses",
        headers=auth_headers(inactive_teacher),
    )

    assert response.status_code == 200
    assert str(course.id) not in {item["id"] for item in response.json()}


def test_student_cannot_access_teacher_progress_api(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student, _ = create_demo_course_and_session(client, db_session)

    list_response = client.get(
        "/api/v1/teacher/progress/courses",
        headers=auth_headers(student),
    )
    artifacts_response = client.get(
        f"/api/v1/teacher/progress/sessions/{experiment_session.id}/stages/stage_1/artifacts",
        headers=auth_headers(student),
    )

    assert list_response.status_code == 403
    assert artifacts_response.status_code == 403


def test_teacher_can_list_course_rubrics_with_course_override(
    client: TestClient,
    db_session: Session,
) -> None:
    course, _, _, teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-RUBRICS",
    )
    db_session.add(
        Rubric(
            tenant_id=course.tenant_id,
            institution_id=course.institution_id,
            course_id=course.id,
            package_version_id=course.package_version_id,
            stage_key="stage_2",
            name="阶段二课程定制 Rubric",
            version=1,
            total_score=120,
            status=RubricStatus.PUBLISHED,
            rubric_json={
                "stage_key": "stage_2",
                "items": [
                    {
                        "key": "business_fit",
                        "label": "业务适配",
                        "score": 120,
                    }
                ],
            },
        )
    )
    db_session.commit()

    response = client.get(
        f"/api/v1/teacher/progress/courses/{course.id}/rubrics",
        headers=auth_headers(teacher),
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 5
    stage_two = next(item for item in body if item["stage_key"] == "stage_2")
    assert stage_two["scope"] == "course"
    assert stage_two["name"] == "阶段二课程定制 Rubric"
    assert stage_two["total_score"] == 120
    assert stage_two["rubric_json"]["items"][0]["key"] == "business_fit"
    assert {item["stage_key"] for item in body} == {
        "stage_1",
        "stage_2",
        "stage_3",
        "stage_4",
        "stage_5",
    }
    assert {item["scope"] for item in body if item["stage_key"] != "stage_2"} == {"package"}


def test_student_and_other_teacher_cannot_list_course_rubrics(
    client: TestClient,
    db_session: Session,
) -> None:
    course, _, student, teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-RUBRICS-PERMISSION",
    )
    other_teacher = User(
        tenant_id=teacher.tenant_id,
        institution_id=teacher.institution_id,
        email="rubric.other.teacher@example.edu",
        password_hash="disabled",
        full_name="Rubric Other Teacher",
        role=UserRole.TEACHER,
        is_active=True,
    )
    db_session.add(other_teacher)
    db_session.commit()

    student_response = client.get(
        f"/api/v1/teacher/progress/courses/{course.id}/rubrics",
        headers=auth_headers(student),
    )
    other_teacher_response = client.get(
        f"/api/v1/teacher/progress/courses/{course.id}/rubrics",
        headers=auth_headers(other_teacher),
    )

    assert student_response.status_code == 403
    assert other_teacher_response.status_code == 404


def test_teacher_can_draft_and_publish_course_rubric_version(
    client: TestClient,
    db_session: Session,
) -> None:
    course, _, _, teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-RUBRIC-PUBLISH",
    )

    draft_response = client.post(
        f"/api/v1/teacher/progress/courses/{course.id}/rubrics/stage_3/draft",
        headers=auth_headers(teacher),
        json={
            "name": "阶段三课程 Rubric v1",
            "total_score": 110,
            "rubric_json": {
                "stage_key": "stage_3",
                "items": [
                    {
                        "key": "data_quality",
                        "label": "数据质量判断",
                        "score": 60,
                    },
                    {
                        "key": "retrieval_strategy",
                        "label": "召回策略",
                        "score": 50,
                    },
                ],
            },
        },
    )

    assert draft_response.status_code == 201
    draft = draft_response.json()
    assert draft["scope"] == "course"
    assert draft["stage_key"] == "stage_3"
    assert draft["status"] == "draft"
    assert draft["version"] == 1
    assert draft["total_score"] == 110
    assert draft["rubric_json"]["items"][0]["key"] == "data_quality"

    publish_response = client.post(
        f"/api/v1/teacher/progress/courses/{course.id}/rubrics/{draft['id']}/publish",
        headers=auth_headers(teacher),
    )

    assert publish_response.status_code == 200
    published = publish_response.json()
    assert published["id"] == draft["id"]
    assert published["status"] == "published"
    assert published["scope"] == "course"

    list_response = client.get(
        f"/api/v1/teacher/progress/courses/{course.id}/rubrics",
        headers=auth_headers(teacher),
    )
    stage_three = next(item for item in list_response.json() if item["stage_key"] == "stage_3")
    assert stage_three["id"] == draft["id"]
    assert stage_three["scope"] == "course"
    assert stage_three["name"] == "阶段三课程 Rubric v1"


def test_student_and_other_teacher_cannot_draft_or_publish_course_rubric(
    client: TestClient,
    db_session: Session,
) -> None:
    course, _, student, teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-RUBRIC-PUBLISH-PERMISSION",
    )
    draft_response = client.post(
        f"/api/v1/teacher/progress/courses/{course.id}/rubrics/stage_4/draft",
        headers=auth_headers(teacher),
        json={
            "name": "阶段四课程 Rubric v1",
            "total_score": 100,
            "rubric_json": {"stage_key": "stage_4", "items": []},
        },
    )
    assert draft_response.status_code == 201
    other_teacher = User(
        tenant_id=teacher.tenant_id,
        institution_id=teacher.institution_id,
        email="rubric.publish.other.teacher@example.edu",
        password_hash="disabled",
        full_name="Rubric Publish Other Teacher",
        role=UserRole.TEACHER,
        is_active=True,
    )
    db_session.add(other_teacher)
    db_session.commit()

    student_draft_response = client.post(
        f"/api/v1/teacher/progress/courses/{course.id}/rubrics/stage_4/draft",
        headers=auth_headers(student),
        json={
            "name": "非法草稿",
            "total_score": 100,
            "rubric_json": {"stage_key": "stage_4", "items": []},
        },
    )
    other_teacher_draft_response = client.post(
        f"/api/v1/teacher/progress/courses/{course.id}/rubrics/stage_4/draft",
        headers=auth_headers(other_teacher),
        json={
            "name": "非法草稿",
            "total_score": 100,
            "rubric_json": {"stage_key": "stage_4", "items": []},
        },
    )
    student_publish_response = client.post(
        f"/api/v1/teacher/progress/courses/{course.id}/rubrics/{draft_response.json()['id']}/publish",
        headers=auth_headers(student),
    )
    other_teacher_publish_response = client.post(
        f"/api/v1/teacher/progress/courses/{course.id}/rubrics/{draft_response.json()['id']}/publish",
        headers=auth_headers(other_teacher),
    )

    assert student_draft_response.status_code == 403
    assert other_teacher_draft_response.status_code == 404
    assert student_publish_response.status_code == 403
    assert other_teacher_publish_response.status_code == 404


def test_teacher_can_view_own_course_session_stage_artifact_summaries(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student, teacher = create_demo_course_and_session(client, db_session)
    artifact_id = create_stage_artifact(
        client,
        experiment_session,
        student,
        stage_key="stage_1",
        artifact_type="stage_1_problem_summary",
        title="问题发现总结",
    )

    response = client.get(
        f"/api/v1/teacher/progress/sessions/{experiment_session.id}/stages/stage_1/artifacts",
        headers=auth_headers(teacher),
    )

    assert response.status_code == 200
    body = response.json()
    assert [artifact["id"] for artifact in body] == [artifact_id]
    assert body[0]["session_id"] == str(experiment_session.id)
    assert body[0]["stage_key"] == "stage_1"
    assert body[0]["artifact_type"] == "stage_1_problem_summary"
    assert body[0]["title"] == "问题发现总结"
    assert body[0]["content_json"] == {"summary": "问题发现总结"}


def test_teacher_cannot_view_other_teacher_session_artifact_summaries(
    client: TestClient,
    db_session: Session,
) -> None:
    _, _, _, teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-OWNER",
    )
    seed = seed_demo_data(db_session)
    student = get_demo_user(db_session, UserRole.STUDENT)
    other_teacher = User(
        tenant_id=teacher.tenant_id,
        institution_id=teacher.institution_id,
        email="artifact.other.teacher@example.edu",
        password_hash="disabled",
        full_name="Artifact Other Teacher",
        role=UserRole.TEACHER,
        is_active=True,
    )
    db_session.add(other_teacher)
    db_session.commit()
    other_course_response = client.post(
        "/api/v1/courses",
        headers=auth_headers(other_teacher),
        json={
            "title": "其他教师 Artifact 课程",
            "code": "MFG-QA-OTHER-ARTIFACT",
            "package_version_id": str(seed.package_version.id),
        },
    )
    other_session_response = client.post(
        "/api/v1/experiment-sessions",
        headers=auth_headers(student),
        json={"course_id": other_course_response.json()["id"]},
    )
    assert other_session_response.status_code == 201

    response = client.get(
        "/api/v1/teacher/progress/sessions/"
        f"{other_session_response.json()['id']}/stages/stage_1/artifacts",
        headers=auth_headers(teacher),
    )

    assert response.status_code == 404


def test_teacher_accepts_ai_review_with_audited_confirmation_artifact(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student, teacher = create_demo_course_and_session(client, db_session)
    review_artifact_id = create_stage_artifact(
        client,
        experiment_session,
        student,
        stage_key="stage_2",
        artifact_type="stage_2_ai_review",
        title="阶段二 AI 评审",
        content_json={
            "review_summary": "需求边界基本清楚，需要教师确认。",
            "ai_score": 82,
            "rubric": {"name": "solution_definition_v1.1", "version": "v1.1"},
            "evidence_artifact_ids": ["stage-one-summary"],
            "ai_gateway": {"usage_type": "stage_2_document_review", "model": "fake-reviewer"},
        },
    )

    response = client.post(
        f"/api/v1/teacher/progress/artifacts/{review_artifact_id}/review-confirmation",
        headers=auth_headers(teacher),
        json={"decision": "accept", "teacher_score": 82, "comment": "接受 AI 建议。"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["artifact_type"] == "teacher_ai_review_confirmation"
    assert body["stage_key"] == "stage_2"
    assert body["submitted_by_user_id"] == str(teacher.id)
    assert body["status"] == "reviewed"
    assert body["content_json"]["decision"] == "accept"
    assert body["content_json"]["source_review_artifact_id"] == review_artifact_id
    assert body["content_json"]["ai_score"] == 82
    assert body["content_json"]["teacher_score"] == 82
    assert body["content_json"]["rubric"] == {"name": "solution_definition_v1.1", "version": "v1.1"}
    assert body["content_json"]["ai_gateway"] == {
        "usage_type": "stage_2_document_review",
        "model": "fake-reviewer",
    }
    assert body["content_json"]["teacher"]["id"] == str(teacher.id)

    source_artifact = db_session.get(Artifact, uuid.UUID(review_artifact_id))
    assert source_artifact is not None
    assert source_artifact.status == "accepted"
    assert source_artifact.reviewed_at is not None
    assert source_artifact.content_json["teacher_confirmation"]["decision"] == "accept"
    assert source_artifact.content_json["teacher_confirmation"]["confirmation_artifact_id"] == body["id"]


def test_teacher_override_requires_reason_and_preserves_ai_score(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student, teacher = create_demo_course_and_session(client, db_session)
    review_artifact_id = create_stage_artifact(
        client,
        experiment_session,
        student,
        stage_key="stage_3",
        artifact_type="stage_3_ai_review",
        title="阶段三 AI 评审",
        content_json={
            "review_summary": "知识工程策略可进入阶段四。",
            "ai_score": 76,
            "rubric": {"name": "knowledge_decision_v1.0"},
        },
    )

    missing_reason_response = client.post(
        f"/api/v1/teacher/progress/artifacts/{review_artifact_id}/review-confirmation",
        headers=auth_headers(teacher),
        json={"decision": "override", "teacher_score": 88},
    )
    assert missing_reason_response.status_code == 422

    response = client.post(
        f"/api/v1/teacher/progress/artifacts/{review_artifact_id}/review-confirmation",
        headers=auth_headers(teacher),
        json={
            "decision": "override",
            "teacher_score": 88,
            "override_reason": "学生补充了脱敏边界和人工确认流程，AI 分数偏低。",
            "comment": "覆盖 AI 初评分。",
        },
    )

    assert response.status_code == 201
    content = response.json()["content_json"]
    assert content["decision"] == "override"
    assert content["ai_score"] == 76
    assert content["teacher_score"] == 88
    assert content["override_reason"] == "学生补充了脱敏边界和人工确认流程，AI 分数偏低。"


def test_student_and_other_teacher_cannot_confirm_ai_review(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student, teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-REVIEW-OWNER",
    )
    review_artifact_id = create_stage_artifact(
        client,
        experiment_session,
        student,
        stage_key="stage_4",
        artifact_type="stage_4_ai_test_review",
        title="阶段四 AI 测试反馈",
        content_json={"review_summary": "测试覆盖不足。", "ai_score": 68},
    )
    other_teacher = User(
        tenant_id=teacher.tenant_id,
        institution_id=teacher.institution_id,
        email="review.other.teacher@example.edu",
        password_hash="disabled",
        full_name="Review Other Teacher",
        role=UserRole.TEACHER,
        is_active=True,
    )
    db_session.add(other_teacher)
    db_session.commit()

    student_response = client.post(
        f"/api/v1/teacher/progress/artifacts/{review_artifact_id}/review-confirmation",
        headers=auth_headers(student),
        json={"decision": "accept", "teacher_score": 68},
    )
    other_teacher_response = client.post(
        f"/api/v1/teacher/progress/artifacts/{review_artifact_id}/review-confirmation",
        headers=auth_headers(other_teacher),
        json={"decision": "accept", "teacher_score": 68},
    )

    assert student_response.status_code == 403
    assert other_teacher_response.status_code == 404


def test_teacher_can_save_grade_draft_as_stage_five_artifact(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student, teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-GRADE-DRAFT",
    )
    evidence_artifact_id = create_stage_artifact(
        client,
        experiment_session,
        student,
        stage_key="stage_5",
        artifact_type="stage_5_delivery_document",
        title="交付说明书",
    )

    response = client.post(
        f"/api/v1/teacher/progress/sessions/{experiment_session.id}/grade-draft",
        headers=auth_headers(teacher),
        json={
            "overall_score": 91,
            "rubric_scores": [
                {
                    "dimension_key": "delivery_completeness",
                    "dimension_name": "交付完整性",
                    "score": 32,
                    "max_score": 35,
                    "comment": "交付件完整，验收口径清楚。",
                }
            ],
            "comment": "可发布为正式成绩。",
            "evidence_artifact_ids": [evidence_artifact_id],
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["artifact_type"] == "teacher_grade_draft"
    assert body["stage_key"] == "stage_5"
    assert body["status"] == "draft"
    assert body["submitted_by_user_id"] == str(teacher.id)
    assert body["content_json"]["overall_score"] == 91
    assert body["content_json"]["rubric_scores"] == [
        {
            "dimension_key": "delivery_completeness",
            "dimension_name": "交付完整性",
            "score": 32,
            "max_score": 35,
            "comment": "交付件完整，验收口径清楚。",
        }
    ]
    assert body["content_json"]["comment"] == "可发布为正式成绩。"
    assert body["content_json"]["evidence_artifact_ids"] == [evidence_artifact_id]
    assert body["content_json"]["is_published"] is False
    assert body["content_json"]["teacher"]["id"] == str(teacher.id)


def test_teacher_can_publish_grade_draft_and_export_course_gradebook(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student, teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-GRADE-PUBLISH",
    )
    draft_response = client.post(
        f"/api/v1/teacher/progress/sessions/{experiment_session.id}/grade-draft",
        headers=auth_headers(teacher),
        json={
            "overall_score": 88,
            "rubric_scores": [
                {
                    "dimension_key": "business_fit",
                    "dimension_name": "业务适配",
                    "score": 26,
                    "max_score": 30,
                }
            ],
            "comment": "整体达到课程验收标准。",
        },
    )
    assert draft_response.status_code == 201

    publish_response = client.post(
        f"/api/v1/teacher/progress/sessions/{experiment_session.id}/grade-publication",
        headers=auth_headers(teacher),
        json={
            "draft_artifact_id": draft_response.json()["id"],
            "publication_note": "发布为期末项目成绩。",
        },
    )

    assert publish_response.status_code == 201
    publication = publish_response.json()
    assert publication["artifact_type"] == "teacher_grade_publication"
    assert publication["stage_key"] == "stage_5"
    assert publication["status"] == "accepted"
    assert publication["content_json"]["draft_artifact_id"] == draft_response.json()["id"]
    assert publication["content_json"]["published_score"] == 88
    assert publication["content_json"]["publication_note"] == "发布为期末项目成绩。"

    export_response = client.get(
        f"/api/v1/teacher/progress/courses/{course.id}/grade-export",
        headers=auth_headers(teacher),
    )

    assert export_response.status_code == 200
    export_body = export_response.json()
    assert export_body["course_id"] == str(course.id)
    assert export_body["course_title"] == course.title
    assert len(export_body["rows"]) == 1
    row = export_body["rows"][0]
    assert row["session_id"] == str(experiment_session.id)
    assert row["student"]["email"] == student.email
    assert row["grade_status"] == "published"
    assert row["published_score"] == 88
    assert row["publication_artifact_id"] == publication["id"]
    assert row["draft_artifact_id"] == draft_response.json()["id"]
    assert row["published_at"] is not None

    csv_response = client.get(
        f"/api/v1/teacher/progress/courses/{course.id}/grade-export.csv",
        headers=auth_headers(teacher),
    )

    assert csv_response.status_code == 200
    assert csv_response.headers["content-type"].startswith("text/csv")
    assert "attachment" in csv_response.headers["content-disposition"]
    assert "grade-export" in csv_response.headers["content-disposition"]
    csv_text = csv_response.text
    assert "学生姓名,学生邮箱,Session ID,成绩状态,发布分数" in csv_text
    assert student.full_name in csv_text
    assert student.email in csv_text
    assert "published,88" in csv_text
    assert publication["id"] in csv_text

    xlsx_response = client.get(
        f"/api/v1/teacher/progress/courses/{course.id}/grade-export.xlsx",
        headers=auth_headers(teacher),
    )

    assert xlsx_response.status_code == 200
    assert xlsx_response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert "attachment" in xlsx_response.headers["content-disposition"]
    assert "grade-export" in xlsx_response.headers["content-disposition"]
    with zipfile.ZipFile(BytesIO(xlsx_response.content)) as workbook:
        names = set(workbook.namelist())
        assert "[Content_Types].xml" in names
        assert "xl/workbook.xml" in names
        assert "xl/worksheets/sheet1.xml" in names
        sheet_xml = workbook.read("xl/worksheets/sheet1.xml").decode("utf-8")
        assert "学生姓名" in sheet_xml
        assert student.full_name in sheet_xml
        assert student.email in sheet_xml
        assert "<v>88</v>" in sheet_xml


def test_student_and_other_teacher_cannot_save_publish_or_export_grades(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student, teacher = create_demo_course_and_session(
        client,
        db_session,
        code="MFG-QA-GRADE-PERMISSION",
    )
    draft_response = client.post(
        f"/api/v1/teacher/progress/sessions/{experiment_session.id}/grade-draft",
        headers=auth_headers(teacher),
        json={"overall_score": 79},
    )
    assert draft_response.status_code == 201
    other_teacher = User(
        tenant_id=teacher.tenant_id,
        institution_id=teacher.institution_id,
        email="grade.other.teacher@example.edu",
        password_hash="disabled",
        full_name="Grade Other Teacher",
        role=UserRole.TEACHER,
        is_active=True,
    )
    db_session.add(other_teacher)
    db_session.commit()

    student_draft_response = client.post(
        f"/api/v1/teacher/progress/sessions/{experiment_session.id}/grade-draft",
        headers=auth_headers(student),
        json={"overall_score": 80},
    )
    other_teacher_draft_response = client.post(
        f"/api/v1/teacher/progress/sessions/{experiment_session.id}/grade-draft",
        headers=auth_headers(other_teacher),
        json={"overall_score": 80},
    )
    student_publish_response = client.post(
        f"/api/v1/teacher/progress/sessions/{experiment_session.id}/grade-publication",
        headers=auth_headers(student),
        json={"draft_artifact_id": draft_response.json()["id"]},
    )
    other_teacher_publish_response = client.post(
        f"/api/v1/teacher/progress/sessions/{experiment_session.id}/grade-publication",
        headers=auth_headers(other_teacher),
        json={"draft_artifact_id": draft_response.json()["id"]},
    )
    student_export_response = client.get(
        f"/api/v1/teacher/progress/courses/{course.id}/grade-export",
        headers=auth_headers(student),
    )
    other_teacher_export_response = client.get(
        f"/api/v1/teacher/progress/courses/{course.id}/grade-export",
        headers=auth_headers(other_teacher),
    )
    student_csv_export_response = client.get(
        f"/api/v1/teacher/progress/courses/{course.id}/grade-export.csv",
        headers=auth_headers(student),
    )
    other_teacher_csv_export_response = client.get(
        f"/api/v1/teacher/progress/courses/{course.id}/grade-export.csv",
        headers=auth_headers(other_teacher),
    )
    student_xlsx_export_response = client.get(
        f"/api/v1/teacher/progress/courses/{course.id}/grade-export.xlsx",
        headers=auth_headers(student),
    )
    other_teacher_xlsx_export_response = client.get(
        f"/api/v1/teacher/progress/courses/{course.id}/grade-export.xlsx",
        headers=auth_headers(other_teacher),
    )

    assert student_draft_response.status_code == 403
    assert other_teacher_draft_response.status_code == 404
    assert student_publish_response.status_code == 403
    assert other_teacher_publish_response.status_code == 404
    assert student_export_response.status_code == 403
    assert other_teacher_export_response.status_code == 404
    assert student_csv_export_response.status_code == 403
    assert other_teacher_csv_export_response.status_code == 404
    assert student_xlsx_export_response.status_code == 403
    assert other_teacher_xlsx_export_response.status_code == 404
