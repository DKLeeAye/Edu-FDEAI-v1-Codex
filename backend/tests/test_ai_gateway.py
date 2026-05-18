from __future__ import annotations

import importlib
import json
from collections.abc import Generator
from typing import Any

import httpx
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.db.base import Base
from app.models import AiCallLog, Course, ExperimentSession, StageRecord, User
from app.models.enums import AiCallStatus, StageStatus, UserRole
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


def load_ai_gateway() -> Any:
    try:
        return importlib.import_module("app.ai_gateway")
    except ModuleNotFoundError as exc:
        pytest.fail(f"app.ai_gateway is not implemented: {exc}")


def create_gateway_scope(
    db_session: Session,
) -> tuple[User, Course, ExperimentSession, StageRecord]:
    seed = seed_demo_data(db_session)
    student = db_session.scalar(select(User).where(User.role == UserRole.STUDENT))
    teacher = db_session.scalar(select(User).where(User.role == UserRole.TEACHER))
    assert student is not None
    assert teacher is not None
    course = Course(
        tenant_id=teacher.tenant_id,
        institution_id=teacher.institution_id,
        package_version_id=seed.package_version.id,
        created_by_user_id=teacher.id,
        title="制造业质检 AI 项目实训",
        code="MFG-QA-GATEWAY",
    )
    db_session.add(course)
    db_session.flush()
    experiment_session = ExperimentSession(
        tenant_id=student.tenant_id,
        institution_id=student.institution_id,
        course_id=course.id,
        student_user_id=student.id,
        package_version_id=seed.package_version.id,
    )
    db_session.add(experiment_session)
    db_session.flush()
    stage_record = StageRecord(
        tenant_id=student.tenant_id,
        institution_id=student.institution_id,
        course_id=course.id,
        session_id=experiment_session.id,
        stage_key="stage_1",
        stage_order=1,
        status=StageStatus.NOT_STARTED,
    )
    db_session.add(stage_record)
    db_session.commit()
    return student, course, experiment_session, stage_record


def test_fake_provider_returns_deterministic_result(db_session: Session) -> None:
    ai_gateway = load_ai_gateway()
    student, course, experiment_session, stage_record = create_gateway_scope(db_session)
    request = ai_gateway.AiGatewayRequest(
        tenant_id=student.tenant_id,
        institution_id=student.institution_id,
        course_id=course.id,
        session_id=experiment_session.id,
        stage_record_id=stage_record.id,
        user_id=student.id,
        usage_type="ai_tutor",
        input_text="Explain artifact scope",
        request_payload={"stage_key": "stage_1"},
    )

    first_response = ai_gateway.invoke_ai(db_session, request)
    second_response = ai_gateway.invoke_ai(db_session, request)

    assert first_response.content == "Fake ai_tutor response: Explain artifact scope"
    assert second_response.content == first_response.content
    assert first_response.provider == "fake"
    assert first_response.model_name == "fake-deterministic-v1"


def test_settings_default_ai_provider_is_siliconflow(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import Settings

    monkeypatch.delenv("AI_PROVIDER", raising=False)

    assert Settings().ai_provider == "siliconflow"


def test_ai_gateway_success_call_creates_log(db_session: Session) -> None:
    ai_gateway = load_ai_gateway()
    student, course, experiment_session, stage_record = create_gateway_scope(db_session)
    request = ai_gateway.AiGatewayRequest(
        tenant_id=student.tenant_id,
        institution_id=student.institution_id,
        course_id=course.id,
        session_id=experiment_session.id,
        stage_record_id=stage_record.id,
        user_id=student.id,
        usage_type="doc_review",
        input_text="Review my requirement hypothesis",
        request_payload={"artifact_type": "requirement_hypothesis"},
    )

    response = ai_gateway.invoke_ai(db_session, request)

    log = db_session.scalar(select(AiCallLog).where(AiCallLog.usage_type == "doc_review"))
    assert log is not None
    assert log.tenant_id == student.tenant_id
    assert log.institution_id == student.institution_id
    assert log.course_id == course.id
    assert log.session_id == experiment_session.id
    assert log.stage_record_id == stage_record.id
    assert log.user_id == student.id
    assert log.provider == "fake"
    assert log.model_name == "fake-deterministic-v1"
    assert log.status == AiCallStatus.SUCCEEDED
    assert log.request_metadata_json["summary"] == "Review my requirement hypothesis"
    assert log.response_metadata_json["summary"] == response.content
    assert isinstance(log.latency_ms, int)
    assert log.prompt_tokens == 0
    assert log.completion_tokens == 0
    assert log.total_tokens == 0
    assert log.error_message is None


def test_ai_gateway_failure_creates_failed_log(db_session: Session) -> None:
    ai_gateway = load_ai_gateway()
    student, course, experiment_session, stage_record = create_gateway_scope(db_session)

    class BrokenProvider:
        provider = "fake"
        model_name = "broken-fake"

        def generate(self, request: Any) -> Any:
            raise RuntimeError("forced provider failure")

    request = ai_gateway.AiGatewayRequest(
        tenant_id=student.tenant_id,
        institution_id=student.institution_id,
        course_id=course.id,
        session_id=experiment_session.id,
        stage_record_id=stage_record.id,
        user_id=student.id,
        usage_type="ai_client",
        input_text="Trigger a failed AI customer call",
        request_payload={"force_error": True},
    )

    with pytest.raises(ai_gateway.AiGatewayError, match="forced provider failure"):
        ai_gateway.invoke_ai(db_session, request, provider=BrokenProvider())

    log = db_session.scalar(select(AiCallLog).where(AiCallLog.usage_type == "ai_client"))
    assert log is not None
    assert log.provider == "fake"
    assert log.model_name == "broken-fake"
    assert log.status == AiCallStatus.FAILED
    assert log.request_metadata_json["summary"] == "Trigger a failed AI customer call"
    assert log.response_metadata_json == {}
    assert "forced provider failure" in str(log.error_message)
    assert isinstance(log.latency_ms, int)


def test_siliconflow_provider_builds_chat_completion_request() -> None:
    ai_gateway = load_ai_gateway()
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["authorization"] = request.headers.get("Authorization")
        captured["content_type"] = request.headers.get("Content-Type")
        captured["json"] = request.read()
        return httpx.Response(
            200,
            json={
                "id": "chatcmpl-test",
                "object": "chat.completion",
                "created": 123,
                "model": "test-siliconflow-chat-model",
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": "我们现在最大的问题是返工定位太慢。",
                        },
                        "finish_reason": "stop",
                    }
                ],
                "usage": {
                    "prompt_tokens": 12,
                    "completion_tokens": 8,
                    "total_tokens": 20,
                },
            },
        )

    provider = ai_gateway.SiliconFlowProvider(
        api_key="test-api-key",
        base_url="https://api.siliconflow.com/v1",
        model_name="test-siliconflow-chat-model",
        timeout_seconds=7,
        http_client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    request = ai_gateway.AiGatewayRequest(
        tenant_id="00000000-0000-0000-0000-000000000001",
        institution_id="00000000-0000-0000-0000-000000000002",
        usage_type="stage_1_customer_interview",
        input_text="目前质检流程最大的痛点是什么？",
        request_payload={"system_prompt": "你是制造业质检项目客户。"},
    )

    response = provider.generate(request)

    assert captured["url"] == "https://api.siliconflow.com/v1/chat/completions"
    assert captured["authorization"] == "Bearer test-api-key"
    assert captured["content_type"] == "application/json"
    body = json.loads(captured["json"])
    assert body == {
        "model": "test-siliconflow-chat-model",
        "messages": [
            {"role": "system", "content": "你是制造业质检项目客户。"},
            {"role": "user", "content": "目前质检流程最大的痛点是什么？"},
        ],
        "stream": False,
    }
    assert response.provider == "siliconflow"
    assert response.model_name == "test-siliconflow-chat-model"
    assert response.content == "我们现在最大的问题是返工定位太慢。"
    assert response.prompt_tokens == 12
    assert response.completion_tokens == 8
    assert response.total_tokens == 20


def test_siliconflow_provider_routes_usage_types_to_configured_models() -> None:
    ai_gateway = load_ai_gateway()
    requested_models: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.read())
        requested_models.append(body["model"])
        return httpx.Response(
            200,
            json={
                "id": "chatcmpl-routed",
                "object": "chat.completion",
                "created": 123,
                "model": body["model"],
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": f"routed to {body['model']}",
                        },
                        "finish_reason": "stop",
                    }
                ],
                "usage": {
                    "prompt_tokens": 1,
                    "completion_tokens": 1,
                    "total_tokens": 2,
                },
            },
        )

    provider = ai_gateway.SiliconFlowProvider(
        api_key="test-api-key",
        base_url="https://api.siliconflow.com/v1",
        model_name="fallback-model",
        customer_model_name="deepseek-ai/DeepSeek-V4-Flash",
        reasoning_model_name="Pro/zai-org/GLM-5.1",
        timeout_seconds=7,
        http_client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    customer_response = provider.generate(
        ai_gateway.AiGatewayRequest(
            tenant_id="00000000-0000-0000-0000-000000000001",
            institution_id="00000000-0000-0000-0000-000000000002",
            usage_type="stage_1_practice_customer_response",
            input_text="您现在最担心什么？",
        )
    )
    review_response = provider.generate(
        ai_gateway.AiGatewayRequest(
            tenant_id="00000000-0000-0000-0000-000000000001",
            institution_id="00000000-0000-0000-0000-000000000002",
            usage_type="stage_1_practice_evaluation",
            input_text="stage_1_practice_evaluation",
        )
    )
    fallback_response = provider.generate(
        ai_gateway.AiGatewayRequest(
            tenant_id="00000000-0000-0000-0000-000000000001",
            institution_id="00000000-0000-0000-0000-000000000002",
            usage_type="unrouted_usage",
            input_text="Use fallback model",
        )
    )

    assert requested_models == [
        "deepseek-ai/DeepSeek-V4-Flash",
        "Pro/zai-org/GLM-5.1",
        "fallback-model",
    ]
    assert customer_response.model_name == "deepseek-ai/DeepSeek-V4-Flash"
    assert review_response.model_name == "Pro/zai-org/GLM-5.1"
    assert fallback_response.model_name == "fallback-model"


def test_siliconflow_provider_parses_success_response() -> None:
    ai_gateway = load_ai_gateway()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "id": "chatcmpl-success",
                "object": "chat.completion",
                "created": 456,
                "model": "test-siliconflow-chat-model",
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": "如果只能先做一个功能，我希望先解决质检异常追溯。",
                        },
                        "finish_reason": "stop",
                    }
                ],
                "usage": {
                    "prompt_tokens": 21,
                    "completion_tokens": 13,
                    "total_tokens": 34,
                },
            },
        )

    provider = ai_gateway.SiliconFlowProvider(
        api_key="test-api-key",
        base_url="https://api.siliconflow.com/v1/",
        model_name="test-siliconflow-chat-model",
        timeout_seconds=10,
        http_client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    request = ai_gateway.AiGatewayRequest(
        tenant_id="00000000-0000-0000-0000-000000000001",
        institution_id="00000000-0000-0000-0000-000000000002",
        usage_type="stage_1_customer_interview",
        input_text="如果只能先做一个功能，您最希望先解决什么？",
    )

    response = provider.generate(request)

    assert response.content == "如果只能先做一个功能，我希望先解决质检异常追溯。"
    assert response.response_payload == {
        "id": "chatcmpl-success",
        "object": "chat.completion",
        "created": 456,
        "model": "test-siliconflow-chat-model",
        "finish_reason": "stop",
    }
    assert response.prompt_tokens == 21
    assert response.completion_tokens == 13
    assert response.total_tokens == 34


def test_siliconflow_failure_creates_failed_log(db_session: Session) -> None:
    ai_gateway = load_ai_gateway()
    student, course, experiment_session, stage_record = create_gateway_scope(db_session)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={"message": "upstream unavailable"})

    provider = ai_gateway.SiliconFlowProvider(
        api_key="test-api-key",
        base_url="https://api.siliconflow.com/v1",
        model_name="test-siliconflow-chat-model",
        timeout_seconds=10,
        http_client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    request = ai_gateway.AiGatewayRequest(
        tenant_id=student.tenant_id,
        institution_id=student.institution_id,
        course_id=course.id,
        session_id=experiment_session.id,
        stage_record_id=stage_record.id,
        user_id=student.id,
        usage_type="stage_1_customer_interview",
        input_text="请介绍现在的质检追溯流程。",
    )

    with pytest.raises(ai_gateway.AiGatewayError, match="SiliconFlow request failed with status 503"):
        ai_gateway.invoke_ai(db_session, request, provider=provider)

    log = db_session.scalar(
        select(AiCallLog).where(AiCallLog.usage_type == "stage_1_customer_interview")
    )
    assert log is not None
    assert log.provider == "siliconflow"
    assert log.model_name == "test-siliconflow-chat-model"
    assert log.status == AiCallStatus.FAILED
    assert log.response_metadata_json == {}
    assert "SiliconFlow request failed with status 503" in str(log.error_message)


def test_siliconflow_missing_config_creates_failed_log(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ai_gateway = load_ai_gateway()
    student, course, experiment_session, stage_record = create_gateway_scope(db_session)
    monkeypatch.setenv("AI_PROVIDER", "siliconflow")
    monkeypatch.setenv("SILICONFLOW_API_KEY", "")
    monkeypatch.setenv("SILICONFLOW_BASE_URL", "")
    monkeypatch.setenv("SILICONFLOW_MODEL", "")
    get_settings.cache_clear()
    request = ai_gateway.AiGatewayRequest(
        tenant_id=student.tenant_id,
        institution_id=student.institution_id,
        course_id=course.id,
        session_id=experiment_session.id,
        stage_record_id=stage_record.id,
        user_id=student.id,
        usage_type="stage_1_customer_interview",
        input_text="请介绍现在的质检追溯流程。",
    )

    with pytest.raises(ai_gateway.AiGatewayError, match="SiliconFlow provider is enabled"):
        ai_gateway.invoke_ai(db_session, request)

    log = db_session.scalar(
        select(AiCallLog).where(AiCallLog.usage_type == "stage_1_customer_interview")
    )
    assert log is not None
    assert log.provider == "siliconflow"
    assert log.model_name == "unconfigured"
    assert log.status == AiCallStatus.FAILED
    assert "SILICONFLOW_API_KEY" in str(log.error_message)
    assert "SILICONFLOW_BASE_URL" in str(log.error_message)
    assert "SILICONFLOW_MODEL" in str(log.error_message)
