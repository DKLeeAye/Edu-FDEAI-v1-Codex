from __future__ import annotations

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import create_engine

from app.ai_runtime.stage_one.customer_config import (
    GUIDED_LEVEL_KEYS,
    build_customer_system_prompt,
    classify_student_question,
    decide_customer_information_release,
    get_guided_level,
    resolve_customer_persona,
    validate_customer_response,
)
from app.ai_runtime.gateway import AiRuntimeScope
from app.ai_runtime.stage_one import graphs as stage_one_graphs
from app.ai_gateway.schemas import AiGatewayResponse
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_session
from app.main import create_app
from app.models import (
    AiCallLog,
    Artifact,
    Course,
    ExperimentSession,
    StageOneGuidedAttempt,
    StageRecord,
    User,
)
from app.models.enums import StageStatus, UserRole
from app.seeds.demo import seed_demo_data
from app.seeds.demo import _manufacturing_manifest


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
    code: str = "MFG-QA-STAGE1",
) -> tuple[Course, ExperimentSession, User]:
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
    return course, experiment_session, student


def test_customer_prompt_requires_configured_name_when_asked_for_salutation() -> None:
    manifest = _manufacturing_manifest()
    persona = resolve_customer_persona(manifest, mode="guided")

    prompt = build_customer_system_prompt(
        manifest=manifest,
        persona=persona,
        mode="guided",
        level={"title": "建立信任与破冰", "goal": "建立合作氛围。"},
    )

    assert "周明" in prompt
    assert "询问称呼" in prompt
    assert "不得自造姓名" in prompt


def test_customer_prompt_keeps_customer_from_interviewing_the_student() -> None:
    manifest = _manufacturing_manifest()
    persona = resolve_customer_persona(manifest, mode="guided")

    prompt = build_customer_system_prompt(
        manifest=manifest,
        persona=persona,
        mode="guided",
        level={"title": "建立信任与破冰", "goal": "建立合作氛围。"},
    )

    assert "你是被访谈客户" in prompt
    assert "不要询问学生有什么痛点" in prompt
    assert "不要询问学生有什么需求" in prompt
    assert "不要询问学生准备做什么方案" in prompt
    assert "未列入本轮允许释放信息的内容不得主动说出" in prompt


def test_customer_response_guard_blocks_withheld_audit_pressure() -> None:
    manifest = _manufacturing_manifest()
    persona = resolve_customer_persona(manifest, mode="guided")
    level = get_guided_level("trust_building")
    student_intent = classify_student_question(
        "周总您好，我今天主要过来了解一下咱这边质检有什么AI智能体的需求",
        level_key=level["key"],
    )
    information_release = decide_customer_information_release(
        persona=persona,
        level=level,
        student_intent=student_intent,
        mode="guided",
    )

    guard = validate_customer_response(
        "你好，我们正在准备迎接大客户的审厂，时间紧迫，需要提升质检效率。",
        information_release=information_release,
    )

    assert guard["is_valid"] is False
    assert any("隐藏" in violation or "审厂" in violation for violation in guard["violations"])


def test_guided_graph_retries_customer_reply_that_interviews_student(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    customer_call_ids = [
        uuid.UUID("00000000-0000-0000-0000-000000000101"),
        uuid.UUID("00000000-0000-0000-0000-000000000102"),
    ]
    feedback_call_id = uuid.UUID("00000000-0000-0000-0000-000000000201")
    calls: list[dict[str, object]] = []

    class ScriptedAdapter:
        def __init__(self, *_args: object, **_kwargs: object) -> None:
            pass

        def invoke(
            self,
            *,
            usage_type: str,
            input_text: str,
            request_payload: dict[str, object],
            prompt_version_id: uuid.UUID | None = None,
        ) -> AiGatewayResponse:
            calls.append(
                {
                    "usage_type": usage_type,
                    "input_text": input_text,
                    "request_payload": request_payload,
                    "prompt_version_id": prompt_version_id,
                }
            )
            customer_calls = [
                call
                for call in calls
                if call["usage_type"] == stage_one_graphs.GUIDED_CUSTOMER_USAGE
            ]
            if usage_type == stage_one_graphs.GUIDED_CUSTOMER_USAGE:
                if len(customer_calls) == 1:
                    return AiGatewayResponse(
                        provider="scripted",
                        model_name="scripted-v1",
                        content=(
                            "你好，我们正在准备迎接大客户的审厂，时间紧迫。"
                            "你们具体是怎么考虑的？这边有没有什么具体的痛点？"
                        ),
                        call_log_id=customer_call_ids[0],
                    )
                return AiGatewayResponse(
                    provider="scripted",
                    model_name="scripted-v1",
                    content=(
                        "你好，我是周明，负责工厂质量和质检材料准备。"
                        "AI 方案我不太懂，你可以先问我现在质检记录是怎么流转的。"
                    ),
                    call_log_id=customer_call_ids[1],
                )
            return AiGatewayResponse(
                provider="scripted",
                model_name="scripted-v1",
                content="本轮破冰说明了访谈目的，可以继续。",
                call_log_id=feedback_call_id,
            )

    monkeypatch.setattr(stage_one_graphs, "GatewayModelAdapter", ScriptedAdapter)
    scope = AiRuntimeScope(
        tenant_id=uuid.uuid4(),
        institution_id=uuid.uuid4(),
        course_id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        stage_record_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
    )

    result = stage_one_graphs.run_stage_one_guided_turn(
        db_session,
        scope=scope,
        stage_key="stage_1",
        stage_title="需求访谈与问题发现",
        stage_blueprint={},
        manifest=_manufacturing_manifest(),
        level_key="trust_building",
        student_message="周总您好，我今天主要过来了解一下咱这边质检有什么AI智能体的需求",
    )

    customer_calls = [
        call for call in calls if call["usage_type"] == stage_one_graphs.GUIDED_CUSTOMER_USAGE
    ]
    assert len(customer_calls) == 2
    assert result["customer_response"] == (
        "你好，我是周明，负责工厂质量和质检材料准备。"
        "AI 方案我不太懂，你可以先问我现在质检记录是怎么流转的。"
    )
    assert result["customer_call_log_id"] == customer_call_ids[1]
    assert "student_intent" in customer_calls[0]["request_payload"]
    assert "information_release" in customer_calls[0]["request_payload"]
    assert "customer_response_guard" in customer_calls[1]["request_payload"]


def test_student_can_ask_ai_customer_and_persist_artifact_log_and_stage_status(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student = create_demo_course_and_session(client, db_session)
    stage_record = db_session.scalar(
        select(StageRecord).where(
            StageRecord.session_id == experiment_session.id,
            StageRecord.stage_key == "stage_1",
        )
    )
    assert stage_record is not None
    assert stage_record.status == StageStatus.NOT_STARTED

    message = "当前质检流程最大的痛点是什么？"
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/interview-turns",
        headers=auth_headers(student),
        json={"message": message},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["stage_key"] == "stage_1"
    assert body["user_message"] == message
    assert (
        body["ai_customer_response"]
        == f"Fake stage_1_practice_customer_response response: {message}"
    )
    assert body["ai_call_log_id"] is not None

    artifact_body = body["artifact"]
    assert artifact_body["tenant_id"] == str(student.tenant_id)
    assert artifact_body["institution_id"] == str(student.institution_id)
    assert artifact_body["course_id"] == str(course.id)
    assert artifact_body["session_id"] == str(experiment_session.id)
    assert artifact_body["stage_record_id"] == str(stage_record.id)
    assert artifact_body["stage_key"] == "stage_1"
    assert artifact_body["submitted_by_user_id"] == str(student.id)
    assert artifact_body["artifact_type"] == "stage_1_interview_turn"
    assert artifact_body["title"] == "阶段一 AI 客户访谈记录"
    assert artifact_body["content_json"]["user_message"] == message
    assert artifact_body["content_json"]["ai_customer_response"] == body["ai_customer_response"]
    assert artifact_body["content_json"]["ai_call_log_id"] == body["ai_call_log_id"]

    artifact = db_session.get(Artifact, uuid.UUID(artifact_body["id"]))
    assert artifact is not None
    assert artifact.stage_record_id == stage_record.id
    assert artifact.content_json["user_message"] == message

    ai_log = db_session.scalar(
        select(AiCallLog).where(AiCallLog.usage_type == "stage_1_practice_customer_response")
    )
    assert ai_log is not None
    assert str(ai_log.id) == body["ai_call_log_id"]
    assert ai_log.tenant_id == student.tenant_id
    assert ai_log.institution_id == student.institution_id
    assert ai_log.course_id == course.id
    assert ai_log.session_id == experiment_session.id
    assert ai_log.stage_record_id == stage_record.id
    assert ai_log.user_id == student.id
    assert ai_log.request_metadata_json["summary"] == message
    assert "customer_persona" in ai_log.request_metadata_json["payload_keys"]
    assert "stage_blueprint" in ai_log.request_metadata_json["payload_keys"]
    assert "system_prompt" in ai_log.request_metadata_json["payload_keys"]

    db_session.refresh(stage_record)
    assert stage_record.status == StageStatus.IN_PRACTICE
    assert stage_record.started_at is not None


def test_practice_customer_turn_receives_previous_interview_history(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    captured_payloads: list[dict[str, object]] = []

    class ScriptedAdapter:
        def __init__(self, *_args: object, **_kwargs: object) -> None:
            pass

        def invoke(
            self,
            *,
            usage_type: str,
            input_text: str,
            request_payload: dict[str, object],
            prompt_version_id: uuid.UUID | None = None,
        ) -> AiGatewayResponse:
            captured_payloads.append(request_payload)
            return AiGatewayResponse(
                provider="scripted",
                model_name="scripted-v1",
                content=f"客户回应：{input_text}",
                call_log_id=uuid.uuid4(),
            )

    monkeypatch.setattr(stage_one_graphs, "GatewayModelAdapter", ScriptedAdapter)

    first_message = "周经理您好，我想先了解质检记录现在是怎么流转的。"
    first_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/interview-turns",
        headers=auth_headers(student),
        json={"message": first_message},
    )
    assert first_response.status_code == 201

    second_message = "刚才提到记录流转，那最容易卡住的是哪个环节？"
    second_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/interview-turns",
        headers=auth_headers(student),
        json={"message": second_message},
    )
    assert second_response.status_code == 201

    assert captured_payloads[0]["conversation_history"] == []
    assert captured_payloads[1]["conversation_history"] == [
        {"role": "user", "content": first_message},
        {"role": "assistant", "content": f"客户回应：{first_message}"},
    ]


def test_stage_one_interview_rejects_another_students_session(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, owner = create_demo_course_and_session(client, db_session)
    other_student = User(
        tenant_id=owner.tenant_id,
        institution_id=owner.institution_id,
        email="other.stage1.student@example.edu",
        password_hash="disabled",
        full_name="Other Stage One Student",
        role=UserRole.STUDENT,
        is_active=True,
    )
    db_session.add(other_student)
    db_session.commit()

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/interview-turns",
        headers=auth_headers(other_student),
        json={"message": "我能访问别人的客户访谈吗？"},
    )

    assert response.status_code == 404
    assert db_session.scalar(select(func.count()).select_from(Artifact)) == 0
    assert db_session.scalar(select(func.count()).select_from(AiCallLog)) == 0


def test_stage_one_interview_rejects_non_stage_one_stage(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    stage_two = db_session.scalar(
        select(StageRecord).where(
            StageRecord.session_id == experiment_session.id,
            StageRecord.stage_key == "stage_2",
        )
    )
    assert stage_two is not None

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_2/stage-one/interview-turns",
        headers=auth_headers(student),
        json={"message": "这个接口不能写入阶段二。"},
    )

    assert response.status_code == 404
    assert db_session.scalar(select(func.count()).select_from(Artifact)) == 0
    assert db_session.scalar(select(func.count()).select_from(AiCallLog)) == 0
    db_session.refresh(stage_two)
    assert stage_two.status == StageStatus.LOCKED


def test_guided_training_turn_persists_attempt_logs_and_does_not_create_formal_artifact(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)

    message = "我想先了解您在审厂准备里负责哪些质检材料，可以从整体流程讲起吗？"
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/guided-training/turns",
        headers=auth_headers(student),
        json={"level_key": "trust_building", "message": message},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["session_id"] == str(experiment_session.id)
    assert body["level_key"] == "trust_building"
    assert body["student_message"] == message
    assert (
        body["customer_response"]
        == f"Fake stage_1_guided_customer_response response: {message}"
    )
    assert body["feedback"]["summary"] == (
        f"Fake stage_1_guided_question_feedback response: {message}"
    )
    assert body["customer_call_log_id"] is not None
    assert body["feedback_call_log_id"] is not None

    logs = db_session.scalars(
        select(AiCallLog).where(AiCallLog.session_id == experiment_session.id)
    ).all()
    assert {log.usage_type for log in logs} == {
        "stage_1_guided_customer_response",
        "stage_1_guided_question_feedback",
    }
    assert {str(log.id) for log in logs} == {
        body["customer_call_log_id"],
        body["feedback_call_log_id"],
    }
    assert all(log.course_id == experiment_session.course_id for log in logs)
    assert all(log.user_id == student.id for log in logs)
    assert all("customer_persona" in log.request_metadata_json["payload_keys"] for log in logs)

    assert db_session.scalar(select(func.count()).select_from(Artifact)) == 0

    attempt = db_session.scalar(select(StageOneGuidedAttempt))
    assert attempt is not None
    assert attempt.active_level == "business_context"
    assert attempt.completed_levels_json == ["trust_building"]
    assert attempt.status == "in_progress"
    turn_rows = db_session.execute(
        text(
            "select level_key, student_message, customer_response "
            "from stage_one_guided_turns"
        )
    ).all()
    assert turn_rows == [
        (
            "trust_building",
            message,
            f"Fake stage_1_guided_customer_response response: {message}",
        )
    ]

    progress_response = client.get(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/guided-training",
        headers=auth_headers(student),
    )
    assert progress_response.status_code == 200
    progress = progress_response.json()
    assert progress["attempt_id"] == body["attempt_id"]
    assert progress["active_level"] == "business_context"
    assert progress["completed_levels"] == ["trust_building"]
    assert progress["customer_persona"]["name"] == "周明"
    assert progress["customer_persona"]["position"] == "制造工厂质量负责人"
    assert progress["turns"][0]["turn_id"] == body["turn_id"]


def test_guided_training_level_completion_rejects_free_manual_progress(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/guided-training/levels/trust_building/complete",
        headers=auth_headers(student),
    )

    assert response.status_code == 409
    assert "AI feedback" in response.json()["detail"]


def test_guided_training_short_turn_keeps_current_level_until_ai_feedback_allows_progress(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/guided-training/turns",
        headers=auth_headers(student),
        json={"level_key": "trust_building", "message": "您好"},
    )

    assert response.status_code == 201
    progress_response = client.get(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/guided-training",
        headers=auth_headers(student),
    )
    assert progress_response.status_code == 200
    progress = progress_response.json()
    assert progress["active_level"] == "trust_building"
    assert progress["completed_levels"] == []


def test_guided_training_allows_closing_turn_after_all_levels_are_completed(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)

    for level_key in GUIDED_LEVEL_KEYS:
        response = client.post(
            f"/api/v1/experiment-sessions/{experiment_session.id}"
            "/stages/stage_1/stage-one/guided-training/turns",
            headers=auth_headers(student),
            json={"level_key": level_key, "message": f"{level_key} 这一关我先做一次完整确认。"},
        )
        assert response.status_code == 201

    completed_progress_response = client.get(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/guided-training",
        headers=auth_headers(student),
    )
    assert completed_progress_response.status_code == 200
    completed_progress = completed_progress_response.json()
    assert completed_progress["status"] == "completed"
    assert completed_progress["active_level"] == GUIDED_LEVEL_KEYS[-1]

    closing_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/guided-training/turns",
        headers=auth_headers(student),
        json={"level_key": GUIDED_LEVEL_KEYS[-1], "message": "好的，我们回去准备一个简洁方案。"},
    )

    assert closing_response.status_code == 201
    closing_body = closing_response.json()
    assert closing_body["level_key"] == GUIDED_LEVEL_KEYS[-1]
    assert closing_body["student_message"] == "好的，我们回去准备一个简洁方案。"

    final_progress_response = client.get(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/guided-training",
        headers=auth_headers(student),
    )
    assert final_progress_response.status_code == 200
    final_progress = final_progress_response.json()
    assert final_progress["status"] == "completed"
    assert final_progress["active_level"] == GUIDED_LEVEL_KEYS[-1]
    assert len(final_progress["turns"]) == len(GUIDED_LEVEL_KEYS) + 1


def test_stage_one_summary_is_saved_as_artifact(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student = create_demo_course_and_session(client, db_session)
    payload = {
        "problem_statement": "质检记录依赖人工整理，审厂追溯材料准备压力大。",
        "target_user": "生产部门负责人和一线质检员",
        "business_context": "汽车零部件工厂准备大客户审厂，需要提升质检过程可追溯性。",
        "pain_points": ["漏检原因难追踪", "MES 数据质量不稳定", "一线员工不愿使用复杂系统"],
        "success_criteria": ["减少人工整理时间", "关键质检记录可追溯", "上线流程不增加一线负担"],
    }

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/summary",
        headers=auth_headers(student),
        json=payload,
    )

    assert response.status_code == 201
    artifact_body = response.json()["artifact"]
    assert artifact_body["tenant_id"] == str(student.tenant_id)
    assert artifact_body["institution_id"] == str(student.institution_id)
    assert artifact_body["course_id"] == str(course.id)
    assert artifact_body["session_id"] == str(experiment_session.id)
    assert artifact_body["stage_key"] == "stage_1"
    assert artifact_body["submitted_by_user_id"] == str(student.id)
    assert artifact_body["artifact_type"] == "stage_1_problem_summary"
    assert artifact_body["title"] == "阶段一问题发现总结"
    assert artifact_body["content_json"] == payload


def test_stage_one_visit_notes_are_saved_as_formal_practice_artifact(
    client: TestClient,
    db_session: Session,
) -> None:
    course, experiment_session, student = create_demo_course_and_session(client, db_session)
    stage_record = db_session.scalar(
        select(StageRecord).where(
            StageRecord.session_id == experiment_session.id,
            StageRecord.stage_key == "stage_1",
        )
    )
    assert stage_record is not None
    interview_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/interview-turns",
        headers=auth_headers(student),
        json={"message": "请介绍一下现在质检记录流转和资料准备方式。"},
    )
    assert interview_response.status_code == 201
    payload = {
        "confirmed_information": [
            "质检记录来自纸质表、Excel 和部分 MES 字段。",
            "审厂前需要人工补齐资料。",
        ],
        "requirement_hypotheses": [
            "客户需要减少审厂前人工整理质检记录的时间。",
        ],
        "risks_and_questions": [
            "MES 字段完整性还需要继续确认。",
        ],
        "next_visit_plan": "下一轮追问数据字段、样例材料和一线使用阻力。",
        "customer_visible_summary": "先围绕质检记录整理和追溯证据准备做小范围梳理。",
    }

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/visit-notes",
        headers=auth_headers(student),
        json=payload,
    )

    assert response.status_code == 201
    artifact_body = response.json()["artifact"]
    assert artifact_body["tenant_id"] == str(student.tenant_id)
    assert artifact_body["institution_id"] == str(student.institution_id)
    assert artifact_body["course_id"] == str(course.id)
    assert artifact_body["session_id"] == str(experiment_session.id)
    assert artifact_body["stage_record_id"] == str(stage_record.id)
    assert artifact_body["stage_key"] == "stage_1"
    assert artifact_body["submitted_by_user_id"] == str(student.id)
    assert artifact_body["artifact_type"] == "stage_1_visit_notes"
    assert artifact_body["title"] == "阶段一拜访间整理"
    assert artifact_body["content_json"] == payload


def test_stage_one_practice_evaluation_uses_formal_artifacts_and_ai_gateway(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    interview_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/interview-turns",
        headers=auth_headers(student),
        json={"message": "目前质检记录和追溯证据准备最卡在哪里？"},
    )
    assert interview_response.status_code == 201
    visit_notes_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/visit-notes",
        headers=auth_headers(student),
        json={
            "confirmed_information": ["质检记录整理依赖人工补齐。"],
            "requirement_hypotheses": ["减少人工整理记录时间。"],
            "risks_and_questions": ["需要确认 MES 字段完整性。"],
            "next_visit_plan": "追问字段、样例和一线录入阻力。",
            "customer_visible_summary": "围绕质检记录整理做小范围试点。",
        },
    )
    assert visit_notes_response.status_code == 201
    summary_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/summary",
        headers=auth_headers(student),
        json={
            "problem_statement": "审厂前质检记录分散，人工整理慢且追溯困难。",
            "target_user": "质量负责人和一线质检员",
            "business_context": "汽车零部件工厂准备大客户审厂。",
            "pain_points": ["质检记录分散", "追溯证据整理慢"],
            "success_criteria": ["减少人工整理时间", "关键记录可追溯"],
            "unconfirmed_questions": ["MES 字段完整性是否满足试点要求。"],
            "evidence_artifact_ids": [interview_response.json()["artifact"]["id"]],
        },
    )
    assert summary_response.status_code == 201

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/evaluation",
        headers=auth_headers(student),
    )

    assert response.status_code == 201
    artifact_body = response.json()["artifact"]
    assert artifact_body["artifact_type"] == "stage_1_evaluation"
    assert artifact_body["title"] == "阶段一项目实战综合评估"
    assert artifact_body["content_json"]["ai_call_log_id"] is not None
    assert "review_summary" in artifact_body["content_json"]

    ai_log = db_session.scalar(
        select(AiCallLog).where(AiCallLog.usage_type == "stage_1_practice_evaluation")
    )
    assert ai_log is not None
    assert ai_log.request_metadata_json["summary"] == "stage_1_practice_evaluation"
    assert "interview_turns" in ai_log.request_metadata_json["payload_keys"]
    assert "visit_notes" in ai_log.request_metadata_json["payload_keys"]
    assert "problem_summary" in ai_log.request_metadata_json["payload_keys"]


def test_stage_one_completion_requires_full_practice_chain(
    client: TestClient,
    db_session: Session,
) -> None:
    _, experiment_session, student = create_demo_course_and_session(client, db_session)
    summary_response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/summary",
        headers=auth_headers(student),
        json={
            "problem_statement": "审厂前质检记录分散，人工整理慢且追溯困难。",
            "target_user": "质量负责人和一线质检员",
            "business_context": "汽车零部件工厂准备大客户审厂。",
            "pain_points": ["质检记录分散"],
            "success_criteria": ["减少人工整理时间"],
        },
    )
    assert summary_response.status_code == 201

    response = client.post(
        f"/api/v1/experiment-sessions/{experiment_session.id}"
        "/stages/stage_1/stage-one/complete",
        headers=auth_headers(student),
    )

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Stage one requires formal interview, visit notes, problem summary and evaluation"
    )
