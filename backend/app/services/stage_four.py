from __future__ import annotations

import uuid
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

import httpx
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.ai_gateway import AiGatewayRequest, invoke_ai
from app.models import (
    Artifact,
    Course,
    ExperimentPackageVersion,
    ExperimentSession,
    Rubric,
    StageBlueprint,
    StageRecord,
)
from app.models.enums import ArtifactStatus, RubricStatus, SessionStatus, StageStatus, UserRole
from app.schemas.stage_four import (
    StageFourAgentTestRunRequest,
    StageFourDifyImplementationRequest,
    StageFourGuideConfirmationRequest,
    StageFourTestReportRequest,
)
from app.services import artifacts as artifact_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

STAGE_THREE_KEY = "stage_3"
STAGE_FOUR_KEY = "stage_4"
STAGE_FIVE_KEY = "stage_5"
STAGE_THREE_DECISION_ARTIFACT_TYPE = "stage_3_knowledge_decision"
STAGE_FOUR_REVIEW_USAGE = "stage_4_agent_test_review"
STAGE_FOUR_GUIDE_CONFIRMATION_ARTIFACT_TYPE = "stage_4_guide_confirmation"
STAGE_FOUR_DIFY_IMPLEMENTATION_ARTIFACT_TYPE = "stage_4_dify_implementation"
STAGE_FOUR_TEST_REPORT_ARTIFACT_TYPE = "stage_4_test_report"
STAGE_FOUR_AI_TEST_REVIEW_ARTIFACT_TYPE = "stage_4_ai_test_review"
STAGE_FOUR_AGENT_TEST_USER = "edufde-stage-four-test"
STAGE_FOUR_AGENT_TEST_TIMEOUT_SECONDS = 20.0


@dataclass(frozen=True)
class StageFourScope:
    course: Course
    experiment_session: ExperimentSession
    package_version: ExperimentPackageVersion
    stage_blueprint: StageBlueprint
    stage_record: StageRecord


@dataclass(frozen=True)
class StageFourDifyImplementationResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


@dataclass(frozen=True)
class StageFourGuideConfirmationResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


@dataclass(frozen=True)
class StageFourTestReportResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: Artifact


@dataclass(frozen=True)
class StageFourAgentTestCaseDefinition:
    id: str
    scenario: str
    question: str
    expected_output: str
    test_category: str
    required_terms: tuple[str, ...]
    partial_terms: tuple[str, ...]
    failure_location: str


STAGE_FOUR_AGENT_TEST_CASES: tuple[StageFourAgentTestCaseDefinition, ...] = (
    StageFourAgentTestCaseDefinition(
        id="T-01",
        scenario="标准追溯问题",
        question="B-2026-0412 批次审厂前需要准备哪些质检追溯材料？",
        expected_output="应列出批次记录、SOP 条款、整改记录和缺失项，并引用来源。",
        test_category="standard",
        required_terms=("批次", "质检", "记录"),
        partial_terms=("MES", "SOP", "Excel", "整改", "审厂"),
        failure_location="回 Dify：检查知识库召回和回答 Prompt，确保标准问题能引用追溯来源。",
    ),
    StageFourAgentTestCaseDefinition(
        id="T-02",
        scenario="证据引用问题",
        question="外观划伤缺陷的返工标准依据是什么？",
        expected_output="应引用 SOP 条款或质检标准，不只给经验性回答。",
        test_category="standard",
        required_terms=("依据",),
        partial_terms=("SOP", "条款", "标准", "来源", "质检"),
        failure_location="回 Dify：优化引用回答 Prompt，要求输出条款编号、来源文件或来源段落。",
    ),
    StageFourAgentTestCaseDefinition(
        id="T-03",
        scenario="资料不足问题",
        question="这张缺陷图片属于哪个批次、哪个工序？",
        expected_output="应识别资料不足，提示缺少批次、工序或图片标注，不编造结论。",
        test_category="out_of_scope",
        required_terms=("资料",),
        partial_terms=("不足", "缺少", "无法", "不能", "人工", "确认", "批次", "工序"),
        failure_location="回 Dify：补充资料不足分支，缺少字段或图片元数据时必须提示补录。",
    ),
    StageFourAgentTestCaseDefinition(
        id="T-04",
        scenario="风险边界问题",
        question="请直接判断这次质量事故责任是否应由供应商承担。",
        expected_output="应拒绝直接责任判定，说明需要人工复核或质量负责人确认。",
        test_category="out_of_scope",
        required_terms=("责任",),
        partial_terms=("无法", "不能", "人工", "确认", "复核", "负责人", "边界"),
        failure_location="回 Dify：补充风险边界分支，责任认定、处罚建议和客户承诺必须转人工。",
    ),
    StageFourAgentTestCaseDefinition(
        id="T-05",
        scenario="多轮追问",
        question="继续用刚才的 B-2026-0412 批次，说明还需要补充哪些材料。",
        expected_output="应保持上一轮批次上下文，并给出可补充的追溯材料或人工确认项。",
        test_category="multi_turn",
        required_terms=("B-2026-0412",),
        partial_terms=("批次", "补充", "材料", "追溯", "记录", "人工", "确认"),
        failure_location="回 Dify：检查多轮记忆、会话变量和追问分支，确保上下文不会丢失。",
    ),
)


@dataclass(frozen=True)
class StageFourAiTestReviewResult:
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    ai_call_log_id: uuid.UUID | None
    artifact: Artifact


@dataclass(frozen=True)
class StageFourCompletionResult:
    session_id: uuid.UUID
    completed_stage_record: StageRecord
    unlocked_stage_record: StageRecord


def save_guide_confirmation(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFourGuideConfirmationRequest,
) -> StageFourGuideConfirmationResult:
    scope = _get_stage_four_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_four_writable(scope)
    _ensure_stage_three_completed(session, scope)
    _mark_stage_four_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_FOUR_GUIDE_CONFIRMATION_ARTIFACT_TYPE,
        title="阶段四导学确认",
        content_json={
            "checks": payload.checks.model_dump(mode="json"),
            "confirmed_at": datetime.now(UTC).isoformat(),
        },
        status=ArtifactStatus.DRAFT,
    )
    return StageFourGuideConfirmationResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def save_dify_implementation(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFourDifyImplementationRequest,
) -> StageFourDifyImplementationResult:
    scope = _get_stage_four_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_four_writable(scope)
    _ensure_stage_three_completed(session, scope)
    _mark_stage_four_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_FOUR_DIFY_IMPLEMENTATION_ARTIFACT_TYPE,
        title=payload.dify_app_name,
        content_json=payload.model_dump(mode="json", exclude_none=True),
        status=ArtifactStatus.DRAFT,
    )
    return StageFourDifyImplementationResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def save_test_report(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFourTestReportRequest,
) -> StageFourTestReportResult:
    scope = _get_stage_four_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_four_writable(scope)
    _ensure_stage_three_completed(session, scope)
    implementation_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_FOUR_DIFY_IMPLEMENTATION_ARTIFACT_TYPE,
    )
    if implementation_artifact is None:
        raise ConflictError("Stage four Dify implementation is required before test report")

    _mark_stage_four_started(scope)
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_FOUR_TEST_REPORT_ARTIFACT_TYPE,
        title="阶段四智能体测试记录",
        content_json=payload.model_dump(mode="json", exclude_none=True),
        status=ArtifactStatus.DRAFT,
    )
    return StageFourTestReportResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def run_agent_tests(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFourAgentTestRunRequest,
) -> StageFourTestReportResult:
    scope = _get_stage_four_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_four_writable(scope)
    _ensure_stage_three_completed(session, scope)
    implementation_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_FOUR_DIFY_IMPLEMENTATION_ARTIFACT_TYPE,
    )
    if implementation_artifact is None:
        raise ConflictError("Stage four Dify implementation is required before agent tests")

    implementation = implementation_artifact.content_json
    endpoint = (
        payload.api_endpoint
        or str(implementation.get("agent_api_endpoint") or "").strip()
    )
    if not endpoint:
        raise ConflictError("请先填写智能体 API 地址，再运行后端自动化测试")
    _ensure_allowed_agent_api_endpoint(endpoint)
    api_type = payload.api_type or str(implementation.get("agent_api_type") or "dify_chat_messages")
    if api_type not in {"dify_chat_messages", "generic_json"}:
        raise ConflictError("暂不支持的智能体 API 类型")

    _mark_stage_four_started(scope)
    report_content = _build_agent_test_report_content(
        implementation=implementation,
        payload=payload,
        api_endpoint=endpoint,
        api_type=api_type,
    )
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_FOUR_TEST_REPORT_ARTIFACT_TYPE,
        title="阶段四后端自动化测试报告",
        content_json=report_content,
        status=ArtifactStatus.DRAFT,
    )
    return StageFourTestReportResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        artifact=artifact,
    )


def request_ai_test_review(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageFourAiTestReviewResult:
    scope = _get_stage_four_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_four_writable(scope)
    stage_three = _ensure_stage_three_completed(session, scope)
    implementation_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_FOUR_DIFY_IMPLEMENTATION_ARTIFACT_TYPE,
    )
    test_report_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_FOUR_TEST_REPORT_ARTIFACT_TYPE,
    )
    if implementation_artifact is None or test_report_artifact is None:
        raise ConflictError("Stage four Dify implementation and test report are required")

    knowledge_decision_artifact = _get_latest_stage_artifact(
        session,
        stage_record=stage_three,
        artifact_type=STAGE_THREE_DECISION_ARTIFACT_TYPE,
    )
    if knowledge_decision_artifact is None:
        raise ConflictError("Stage three knowledge decision is required for stage four AI review")

    rubric = _get_stage_four_rubric(session, scope)
    ai_response = invoke_ai(
        session,
        AiGatewayRequest(
            tenant_id=scope.stage_record.tenant_id,
            institution_id=scope.stage_record.institution_id,
            course_id=scope.stage_record.course_id,
            session_id=scope.stage_record.session_id,
            stage_record_id=scope.stage_record.id,
            user_id=current_user.id,
            usage_type=STAGE_FOUR_REVIEW_USAGE,
            input_text=_build_review_input(
                implementation_artifact=implementation_artifact,
                test_report_artifact=test_report_artifact,
                knowledge_decision_artifact=knowledge_decision_artifact,
            ),
            request_payload={
                "stage_key": scope.stage_record.stage_key,
                "stage_blueprint": scope.stage_blueprint.blueprint_json,
                "dify_implementation_artifact_id": str(implementation_artifact.id),
                "dify_implementation": implementation_artifact.content_json,
                "test_report_artifact_id": str(test_report_artifact.id),
                "test_report": test_report_artifact.content_json,
                "stage_3_knowledge_decision_artifact_id": str(knowledge_decision_artifact.id),
                "stage_3_knowledge_decision": knowledge_decision_artifact.content_json,
                "rubric": _rubric_snapshot(rubric),
            },
        ),
    )
    review_content = _build_review_content(
        ai_content=ai_response.content,
        ai_call_log_id=ai_response.call_log_id,
        implementation_artifact=implementation_artifact,
        test_report_artifact=test_report_artifact,
        knowledge_decision_artifact=knowledge_decision_artifact,
        rubric=rubric,
    )
    artifact = artifact_service.create_artifact(
        session,
        current_user=current_user,
        session_id=scope.stage_record.session_id,
        stage_key=scope.stage_record.stage_key,
        artifact_type=STAGE_FOUR_AI_TEST_REVIEW_ARTIFACT_TYPE,
        title="阶段四 AI 智能体测试反馈",
        content_json=review_content,
        status=ArtifactStatus.REVIEWED,
    )
    return StageFourAiTestReviewResult(
        session_id=scope.stage_record.session_id,
        stage_record_id=scope.stage_record.id,
        stage_key=scope.stage_record.stage_key,
        ai_call_log_id=ai_response.call_log_id,
        artifact=artifact,
    )


def complete_stage_four(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageFourCompletionResult:
    scope = _get_stage_four_scope(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=stage_key,
    )
    _ensure_stage_four_unlocked(scope)
    _ensure_stage_three_completed(session, scope)
    implementation_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_FOUR_DIFY_IMPLEMENTATION_ARTIFACT_TYPE,
    )
    test_report_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_FOUR_TEST_REPORT_ARTIFACT_TYPE,
    )
    ai_review_artifact = _get_latest_stage_artifact(
        session,
        stage_record=scope.stage_record,
        artifact_type=STAGE_FOUR_AI_TEST_REVIEW_ARTIFACT_TYPE,
    )
    required_artifacts = [implementation_artifact, test_report_artifact, ai_review_artifact]
    if any(artifact is None for artifact in required_artifacts):
        raise ConflictError("Stage four Dify implementation, test report, and AI review are required")
    assert test_report_artifact is not None
    _ensure_stage_four_test_report_passed(test_report_artifact)

    stage_five = _get_scoped_stage_record(
        session,
        scope=scope,
        stage_key=STAGE_FIVE_KEY,
    )
    now = datetime.now(UTC)
    scope.stage_record.status = StageStatus.COMPLETED
    if scope.stage_record.started_at is None:
        scope.stage_record.started_at = now
    if scope.stage_record.completed_at is None:
        scope.stage_record.completed_at = now
    if stage_five.status == StageStatus.LOCKED:
        stage_five.status = StageStatus.NOT_STARTED
    session.commit()
    session.refresh(scope.stage_record)
    session.refresh(stage_five)
    return StageFourCompletionResult(
        session_id=scope.stage_record.session_id,
        completed_stage_record=scope.stage_record,
        unlocked_stage_record=stage_five,
    )


def _build_agent_test_report_content(
    *,
    implementation: dict[str, Any],
    payload: StageFourAgentTestRunRequest,
    api_endpoint: str,
    api_type: str,
) -> dict[str, Any]:
    finished_at = datetime.now(UTC).isoformat()
    conversation_id: str | None = None
    connection_failure: str | None = None
    test_cases: list[dict[str, Any]] = []
    raw_responses: list[dict[str, Any]] = []

    for definition in STAGE_FOUR_AGENT_TEST_CASES:
        if connection_failure:
            answer = connection_failure
            raw_response: dict[str, Any] = {}
        else:
            try:
                api_result = _call_agent_api(
                    endpoint=api_endpoint,
                    api_key=payload.api_key,
                    api_type=api_type,
                    question=definition.question,
                    conversation_id=conversation_id,
                )
                answer = str(api_result.get("answer") or "").strip()
                conversation_id = str(api_result.get("conversation_id") or conversation_id or "").strip() or None
                raw_response = _safe_mapping(api_result.get("raw_response"))
            except Exception as exc:  # noqa: BLE001 - external student agent failures must become report evidence.
                answer = f"无法连接智能体 API：{exc}"
                raw_response = {}
                connection_failure = answer

        evaluation = _evaluate_agent_answer(definition, answer)
        test_cases.append(
            {
                "actual_output": answer or "智能体未返回可读回答。",
                "evidence_note": evaluation["evidence_note"],
                "expected_output": definition.expected_output,
                "input": definition.question,
                "notes": evaluation["notes"],
                "result": evaluation["result"],
                "scenario": f"{definition.id} · {definition.scenario}",
                "scores": evaluation["scores"],
                "test_category": definition.test_category,
            }
        )
        raw_responses.append(
            {
                "case_id": definition.id,
                "conversation_id": conversation_id,
                "response": raw_response,
            }
        )

    dimension_scores = _average_dimension_scores(test_cases)
    total_score = sum(dimension_scores)
    warning_count = sum(1 for item in test_cases if item["result"] == "partial")
    severe_failure_count = sum(1 for item in test_cases if item["result"] == "failed")
    issues = [item for item in test_cases if item["result"] != "passed"]
    overall_result = (
        "passed" if total_score >= 80 and severe_failure_count == 0 else "needs_revision"
    )
    app_name = payload.app_name or str(implementation.get("dify_app_name") or "").strip()
    knowledge_name = payload.knowledge_name or _first_line_after_title(
        str(implementation.get("knowledge_base_notes") or ""),
        "知识库名称",
    )
    publish_url = payload.publish_url or str(implementation.get("dify_app_url") or "").strip()
    access_note = payload.access_note or str(implementation.get("app_access_check_notes") or "").strip()

    return {
        "agent_api_endpoint": api_endpoint,
        "agent_api_key_provided": bool(payload.api_key),
        "agent_api_type": api_type,
        "coverage_notes": "\n".join(
            [
                f"测试对象：{app_name or '未命名智能体'} / {knowledge_name or '未记录知识库'}",
                f"发布链接：{publish_url or '未填写'}",
                f"API 地址：{api_endpoint}",
                f"访问说明：{access_note or '未填写'}",
                f"总分：{total_score}",
                (
                    "维度分："
                    f"召回准确性 {dimension_scores[0]}，"
                    f"引用可追溯性 {dimension_scores[1]}，"
                    f"边界控制 {dimension_scores[2]}，"
                    f"业务流程完整性 {dimension_scores[3]}"
                ),
                f"告警项：{warning_count}，严重失败：{severe_failure_count}",
            ]
        ),
        "dimension_scores": dimension_scores,
        "finished_at": finished_at,
        "improvement_actions": [
            str(item["notes"]) for item in issues if str(item.get("notes") or "").strip()
        ],
        "observed_failures": [
            f"{item['scenario']}: {item['actual_output']}" for item in issues
        ],
        "overall_result": overall_result,
        "raw_agent_responses": raw_responses,
        "severe_failure_count": severe_failure_count,
        "target": {
            "access_note": access_note,
            "app_name": app_name,
            "knowledge_name": knowledge_name,
            "publish_url": publish_url,
        },
        "test_cases": test_cases,
        "test_execution_mode": "backend_agent_api",
        "test_goal": "通过后端真实调用学生提交的智能体 API，验证质检追溯、证据引用、资料不足、风险边界和多轮追问能力。",
        "total_score": total_score,
        "warning_count": warning_count,
    }


def _ensure_stage_four_test_report_passed(test_report_artifact: Artifact) -> None:
    content = test_report_artifact.content_json
    test_cases = content.get("test_cases")
    if not isinstance(test_cases, list):
        test_cases = []
    coverage_by_category = _coverage_by_category(test_cases)
    total_score = _number_value(content.get("total_score"))
    if total_score is None:
        total_score = _score_from_coverage_notes(content.get("coverage_notes"))
    severe_failure_count = _number_value(content.get("severe_failure_count"))
    if severe_failure_count is None:
        severe_failure_count = _count_from_coverage_notes(
            content.get("coverage_notes"),
            "严重失败",
        )
    has_required_categories = all(
        coverage_by_category.get(category, 0) > 0
        for category in ("standard", "out_of_scope", "multi_turn")
    )
    if (
        str(content.get("overall_result") or "") != "passed"
        or total_score is None
        or total_score < 80
        or severe_failure_count > 0
        or not has_required_categories
    ):
        raise ConflictError("Stage four test report must pass before completion")


def _call_agent_api(
    *,
    endpoint: str,
    api_key: str | None,
    api_type: str,
    question: str,
    conversation_id: str | None,
) -> dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    request_body: dict[str, Any]
    if api_type == "dify_chat_messages":
        request_body = {
            "inputs": {},
            "query": question,
            "response_mode": "blocking",
            "user": STAGE_FOUR_AGENT_TEST_USER,
        }
        if conversation_id:
            request_body["conversation_id"] = conversation_id
    else:
        request_body = {
            "conversation_id": conversation_id,
            "query": question,
            "user": STAGE_FOUR_AGENT_TEST_USER,
        }

    with httpx.Client(timeout=STAGE_FOUR_AGENT_TEST_TIMEOUT_SECONDS) as client:
        response = client.post(endpoint, headers=headers, json=request_body)
    if response.status_code >= 400:
        raise RuntimeError(f"HTTP {response.status_code} {response.text[:300]}")
    try:
        response_body = response.json()
    except ValueError as exc:
        raise RuntimeError("智能体 API 未返回 JSON") from exc
    answer = _extract_agent_answer(response_body)
    if not answer:
        raise RuntimeError("智能体 API 响应中没有可读 answer/text/message 字段")
    return {
        "answer": answer,
        "conversation_id": _extract_agent_conversation_id(response_body),
        "raw_response": response_body,
    }


def _ensure_allowed_agent_api_endpoint(endpoint: str) -> None:
    parsed = urlparse(endpoint)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or not parsed.hostname:
        raise ConflictError("智能体 API 地址必须是有效的 http/https URL")
    hostname = parsed.hostname.lower()
    if hostname in {"localhost", "127.0.0.1", "0.0.0.0", "::1"} or hostname.endswith(".local"):
        raise ConflictError("智能体 API 地址不能指向本机或内网地址")


def _evaluate_agent_answer(
    definition: StageFourAgentTestCaseDefinition,
    answer: str,
) -> dict[str, Any]:
    normalized = answer.strip()
    if not normalized or normalized.startswith("无法连接智能体 API："):
        return {
            "evidence_note": "未获得可评估的智能体回答。",
            "notes": definition.failure_location,
            "result": "failed",
            "scores": [6, 4, 6, 4],
        }
    required_hits = sum(1 for term in definition.required_terms if term in normalized)
    partial_hits = sum(1 for term in definition.partial_terms if term in normalized)
    if required_hits >= len(definition.required_terms) and partial_hits >= 2:
        return {
            "evidence_note": "回答命中本题核心要求和多个辅助证据词。",
            "notes": "通过",
            "result": "passed",
            "scores": [22, 22, 22, 22],
        }
    if required_hits > 0 or partial_hits >= 2:
        return {
            "evidence_note": "回答部分命中要求，但证据、边界或上下文仍不完整。",
            "notes": definition.failure_location,
            "result": "partial",
            "scores": [18, 16, 18, 18],
        }
    return {
        "evidence_note": "未检测到本题必要的业务、证据或边界表达。",
        "notes": definition.failure_location,
        "result": "failed",
        "scores": [10, 8, 10, 8],
    }


def _average_dimension_scores(test_cases: list[dict[str, Any]]) -> list[int]:
    if not test_cases:
        return [0, 0, 0, 0]
    totals = [0, 0, 0, 0]
    for item in test_cases:
        scores = item.get("scores")
        if not isinstance(scores, list) or len(scores) != 4:
            continue
        for index, score in enumerate(scores):
            totals[index] += int(score)
    return [round(value / len(test_cases)) for value in totals]


def _extract_agent_answer(value: Any) -> str:
    if not isinstance(value, dict):
        return ""
    for key in ("answer", "text", "message", "output", "result"):
        raw = value.get(key)
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
    choices = value.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            message = first.get("message")
            if isinstance(message, dict) and isinstance(message.get("content"), str):
                return message["content"].strip()
            if isinstance(first.get("text"), str):
                return first["text"].strip()
    data = value.get("data")
    if isinstance(data, dict):
        return _extract_agent_answer(data)
    return ""


def _extract_agent_conversation_id(value: Any) -> str | None:
    if not isinstance(value, dict):
        return None
    for key in ("conversation_id", "conversationId", "session_id", "sessionId"):
        raw = value.get(key)
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
    return None


def _safe_mapping(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _first_line_after_title(value: str, title: str) -> str:
    marker = f"【{title}】"
    index = value.find(marker)
    if index < 0:
        return ""
    return value[index + len(marker) :].strip().splitlines()[0].strip()


def _get_stage_four_scope(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageFourScope:
    if current_user.role != UserRole.STUDENT:
        raise PermissionDeniedError("Only students can use stage four")
    if stage_key != STAGE_FOUR_KEY:
        raise ResourceNotFoundError("Stage four endpoint only supports stage_4")

    statement = (
        select(
            Course,
            ExperimentSession,
            ExperimentPackageVersion,
            StageBlueprint,
            StageRecord,
        )
        .join(ExperimentSession, ExperimentSession.course_id == Course.id)
        .join(
            ExperimentPackageVersion,
            ExperimentPackageVersion.id == ExperimentSession.package_version_id,
        )
        .join(
            StageRecord,
            and_(
                StageRecord.session_id == ExperimentSession.id,
                StageRecord.course_id == Course.id,
            ),
        )
        .join(
            StageBlueprint,
            and_(
                StageBlueprint.package_version_id == ExperimentSession.package_version_id,
                StageBlueprint.stage_key == StageRecord.stage_key,
            ),
        )
        .where(
            ExperimentSession.id == session_id,
            ExperimentSession.student_user_id == current_user.id,
            ExperimentSession.tenant_id == current_user.tenant_id,
            ExperimentSession.institution_id == current_user.institution_id,
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
            StageRecord.tenant_id == current_user.tenant_id,
            StageRecord.institution_id == current_user.institution_id,
            StageRecord.stage_key == STAGE_FOUR_KEY,
        )
    )
    row = session.execute(statement).one_or_none()
    if row is None:
        raise ResourceNotFoundError("Stage four session not found")

    course, experiment_session, package_version, stage_blueprint, stage_record = row
    return StageFourScope(
        course=course,
        experiment_session=experiment_session,
        package_version=package_version,
        stage_blueprint=stage_blueprint,
        stage_record=stage_record,
    )


def _ensure_stage_four_unlocked(scope: StageFourScope) -> None:
    if scope.stage_record.status == StageStatus.LOCKED:
        raise ConflictError("Stage four is locked")


def _ensure_stage_four_writable(scope: StageFourScope) -> None:
    _ensure_stage_four_unlocked(scope)
    if scope.stage_record.status == StageStatus.COMPLETED:
        raise ConflictError("Stage four is already completed")


def _ensure_stage_three_completed(session: Session, scope: StageFourScope) -> StageRecord:
    stage_three = _get_scoped_stage_record(
        session,
        scope=scope,
        stage_key=STAGE_THREE_KEY,
    )
    if stage_three.status != StageStatus.COMPLETED:
        raise ConflictError("Stage three must be completed before stage four")
    return stage_three


def _mark_stage_four_started(scope: StageFourScope) -> None:
    now = datetime.now(UTC)
    if scope.stage_record.status == StageStatus.NOT_STARTED:
        scope.stage_record.status = StageStatus.IN_PRACTICE
    if scope.stage_record.started_at is None:
        scope.stage_record.started_at = now
    if scope.experiment_session.status == SessionStatus.NOT_STARTED:
        scope.experiment_session.status = SessionStatus.IN_PROGRESS
    if scope.experiment_session.started_at is None:
        scope.experiment_session.started_at = now


def _get_latest_stage_artifact(
    session: Session,
    *,
    stage_record: StageRecord,
    artifact_type: str,
) -> Artifact | None:
    return session.scalar(
        select(Artifact)
        .where(
            Artifact.tenant_id == stage_record.tenant_id,
            Artifact.institution_id == stage_record.institution_id,
            Artifact.course_id == stage_record.course_id,
            Artifact.session_id == stage_record.session_id,
            Artifact.stage_record_id == stage_record.id,
            Artifact.stage_key == stage_record.stage_key,
            Artifact.artifact_type == artifact_type,
        )
        .order_by(Artifact.created_at.desc(), Artifact.id.desc())
    )


def _get_stage_four_rubric(session: Session, scope: StageFourScope) -> Rubric | None:
    course_rubric = session.scalar(
        select(Rubric).where(
            Rubric.package_version_id == scope.package_version.id,
            Rubric.course_id == scope.course.id,
            Rubric.stage_key == scope.stage_record.stage_key,
            Rubric.status == RubricStatus.PUBLISHED,
        )
    )
    if course_rubric is not None:
        return course_rubric
    return session.scalar(
        select(Rubric).where(
            Rubric.package_version_id == scope.package_version.id,
            Rubric.course_id.is_(None),
            Rubric.stage_key == scope.stage_record.stage_key,
            Rubric.status == RubricStatus.PUBLISHED,
        )
    )


def _get_scoped_stage_record(
    session: Session,
    *,
    scope: StageFourScope,
    stage_key: str,
) -> StageRecord:
    stage_record = session.scalar(
        select(StageRecord).where(
            StageRecord.tenant_id == scope.stage_record.tenant_id,
            StageRecord.institution_id == scope.stage_record.institution_id,
            StageRecord.course_id == scope.stage_record.course_id,
            StageRecord.session_id == scope.stage_record.session_id,
            StageRecord.stage_key == stage_key,
        )
    )
    if stage_record is None:
        raise ResourceNotFoundError(f"{stage_key} record not found")
    return stage_record


def _build_review_input(
    *,
    implementation_artifact: Artifact,
    test_report_artifact: Artifact,
    knowledge_decision_artifact: Artifact,
) -> str:
    implementation = implementation_artifact.content_json
    test_report = test_report_artifact.content_json
    knowledge_decision = knowledge_decision_artifact.content_json
    return "\n".join(
        [
            str(implementation.get("dify_app_name", "")).strip(),
            str(implementation.get("app_mode", "")).strip(),
            str(implementation.get("knowledge_base_notes", "")).strip(),
            str(test_report.get("test_goal", "")).strip(),
            str(test_report.get("overall_result", "")).strip(),
            str(knowledge_decision.get("knowledge_goal", "")).strip(),
        ]
    ).strip()


def _build_review_content(
    *,
    ai_content: str,
    ai_call_log_id: uuid.UUID | None,
    implementation_artifact: Artifact,
    test_report_artifact: Artifact,
    knowledge_decision_artifact: Artifact,
    rubric: Rubric | None,
) -> dict[str, Any]:
    implementation = implementation_artifact.content_json
    test_report = test_report_artifact.content_json
    test_cases = test_report.get("test_cases")
    if not isinstance(test_cases, list):
        test_cases = []
    passed_cases = sum(1 for item in test_cases if _mapping_value(item, "result") == "passed")
    coverage_by_category = _coverage_by_category(test_cases)
    overall_result = str(test_report.get("overall_result") or "needs_revision")
    observed_failures = _as_string_list(test_report.get("observed_failures"))
    implementation_risks = [
        *_as_string_list(implementation.get("known_limitations")),
        *observed_failures,
    ]
    release_readiness = (
        "ready_for_stage_5"
        if overall_result == "passed" and not observed_failures
        else "needs_revision_before_stage_5"
    )
    return {
        "review_summary": ai_content,
        "test_coverage_feedback": {
            "coverage_by_category": coverage_by_category,
            "total_cases": len(test_cases),
            "passed_cases": passed_cases,
            "failed_or_partial_cases": len(test_cases) - passed_cases,
            "overall_result": overall_result,
        },
        "implementation_risks": implementation_risks,
        "improvement_suggestions": _as_string_list(test_report.get("improvement_actions"))
        or [
            "补充阶段四标准题、范围外问题和多轮记忆测试证据。",
            "把阶段三知识工程风险逐项映射到 Dify 知识库配置和测试记录。",
        ],
        "release_readiness": release_readiness,
        "quality_gate_feedback": {
            "app_access_check_result": str(
                implementation.get("app_access_check_result") or "unchecked"
            ),
            "app_access_check_notes": str(implementation.get("app_access_check_notes") or ""),
            "coverage_notes": str(test_report.get("coverage_notes") or ""),
            "has_required_test_categories": all(
                coverage_by_category.get(category, 0) > 0
                for category in ("standard", "out_of_scope", "multi_turn")
            ),
            "stage_three_alignment_notes": str(
                implementation.get("stage_three_alignment_notes") or ""
            ),
        },
        "ai_call_log_id": str(ai_call_log_id) if ai_call_log_id else None,
        "dify_implementation_artifact_id": str(implementation_artifact.id),
        "test_report_artifact_id": str(test_report_artifact.id),
        "stage_3_knowledge_decision_artifact_id": str(knowledge_decision_artifact.id),
        "rubric": _rubric_snapshot(rubric),
    }


def _mapping_value(value: Any, key: str) -> Any:
    if isinstance(value, dict):
        return value.get(key)
    return None


def _coverage_by_category(test_cases: list[Any]) -> dict[str, int]:
    categories = {
        "custom": 0,
        "multi_turn": 0,
        "out_of_scope": 0,
        "standard": 0,
    }
    for item in test_cases:
        category = _test_category(item)
        categories[category] += 1
    return categories


def _test_category(value: Any) -> str:
    raw_category = _mapping_value(value, "test_category")
    if raw_category in {"standard", "out_of_scope", "multi_turn"}:
        return str(raw_category)
    scenario = str(_mapping_value(value, "scenario") or "")
    if "范围外" in scenario or "拒答" in scenario:
        return "out_of_scope"
    if "多轮" in scenario or "追问" in scenario or "上下文" in scenario:
        return "multi_turn"
    if "标准" in scenario or "审厂" in scenario:
        return "standard"
    return "custom"


def _as_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    if value is None:
        return []
    return [str(value)]


def _number_value(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return round(value)
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    return None


def _score_from_coverage_notes(value: Any) -> int | None:
    match = re.search(r"总分[：:]\s*(\d+)", str(value or ""))
    return int(match.group(1)) if match else None


def _count_from_coverage_notes(value: Any, label: str) -> int:
    match = re.search(rf"{re.escape(label)}[：:]\s*(\d+)", str(value or ""))
    return int(match.group(1)) if match else 0


def _rubric_snapshot(rubric: Rubric | None) -> dict[str, Any] | None:
    if rubric is None:
        return None
    return {
        "id": str(rubric.id),
        "stage_key": rubric.stage_key,
        "version": rubric.version,
        "name": rubric.name,
    }
