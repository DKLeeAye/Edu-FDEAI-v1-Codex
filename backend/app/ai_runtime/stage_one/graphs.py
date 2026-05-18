from __future__ import annotations

import uuid
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph
from sqlalchemy.orm import Session

from app.ai_runtime.gateway import AiRuntimeScope, GatewayModelAdapter
from app.ai_runtime.stage_one.customer_config import (
    build_practice_evaluation_system_prompt,
    build_customer_fallback_response,
    build_customer_guard_retry_prompt,
    build_customer_system_prompt,
    build_feedback_system_prompt,
    classify_student_question,
    decide_customer_information_release,
    get_guided_level,
    resolve_customer_persona,
    validate_customer_response,
)

GUIDED_CUSTOMER_USAGE = "stage_1_guided_customer_response"
GUIDED_FEEDBACK_USAGE = "stage_1_guided_question_feedback"
PRACTICE_CUSTOMER_USAGE = "stage_1_practice_customer_response"
PRACTICE_EVALUATION_USAGE = "stage_1_practice_evaluation"


class StageOneTurnState(TypedDict, total=False):
    db_session: Any
    scope: AiRuntimeScope
    stage_key: str
    stage_title: str
    stage_blueprint: dict[str, Any]
    manifest: dict[str, Any]
    mode: str
    level_key: str
    level: dict[str, str]
    student_message: str
    customer_persona: dict[str, Any]
    student_intent: dict[str, Any]
    information_release: dict[str, Any]
    conversation_history: list[dict[str, str]]
    practice_context: dict[str, Any]
    customer_response: str
    customer_call_log_id: uuid.UUID | None
    customer_response_guard: dict[str, Any]
    feedback: dict[str, Any]
    feedback_call_log_id: uuid.UUID | None


class StageOneEvaluationState(TypedDict, total=False):
    db_session: Any
    scope: AiRuntimeScope
    stage_key: str
    stage_title: str
    stage_blueprint: dict[str, Any]
    manifest: dict[str, Any]
    customer_persona: dict[str, Any]
    interview_turns: list[dict[str, Any]]
    visit_notes: dict[str, Any]
    problem_summary: dict[str, Any]
    evaluation: dict[str, Any]
    evaluation_call_log_id: uuid.UUID | None


def run_stage_one_guided_turn(
    session: Session,
    *,
    scope: AiRuntimeScope,
    stage_key: str,
    stage_title: str,
    stage_blueprint: dict[str, Any],
    manifest: dict[str, Any],
    level_key: str,
    student_message: str,
    conversation_history: list[dict[str, str]] | None = None,
) -> StageOneTurnState:
    state = _guided_graph().invoke(
        {
            "db_session": session,
            "scope": scope,
            "stage_key": stage_key,
            "stage_title": stage_title,
            "stage_blueprint": stage_blueprint,
            "manifest": manifest,
            "mode": "guided",
            "level_key": level_key,
            "student_message": student_message,
            "conversation_history": conversation_history or [],
        }
    )
    return state


def run_stage_one_practice_turn(
    session: Session,
    *,
    scope: AiRuntimeScope,
    stage_key: str,
    stage_title: str,
    stage_blueprint: dict[str, Any],
    manifest: dict[str, Any],
    student_message: str,
    conversation_history: list[dict[str, str]] | None = None,
    practice_context: dict[str, Any] | None = None,
) -> StageOneTurnState:
    state = _practice_graph().invoke(
        {
            "db_session": session,
            "scope": scope,
            "stage_key": stage_key,
            "stage_title": stage_title,
            "stage_blueprint": stage_blueprint,
            "manifest": manifest,
            "mode": "practice",
            "student_message": student_message,
            "conversation_history": conversation_history or [],
            "practice_context": practice_context or {},
        }
    )
    return state


def run_stage_one_practice_evaluation(
    session: Session,
    *,
    scope: AiRuntimeScope,
    stage_key: str,
    stage_title: str,
    stage_blueprint: dict[str, Any],
    manifest: dict[str, Any],
    interview_turns: list[dict[str, Any]],
    visit_notes: dict[str, Any],
    problem_summary: dict[str, Any],
) -> StageOneEvaluationState:
    state = _practice_evaluation_graph().invoke(
        {
            "db_session": session,
            "scope": scope,
            "stage_key": stage_key,
            "stage_title": stage_title,
            "stage_blueprint": stage_blueprint,
            "manifest": manifest,
            "interview_turns": interview_turns,
            "visit_notes": visit_notes,
            "problem_summary": problem_summary,
        }
    )
    return state


def _guided_graph():
    graph = StateGraph(StageOneTurnState)
    graph.add_node("load_context", _load_guided_context)
    graph.add_node("classify_student_question", _classify_student_question)
    graph.add_node("decide_information_release", _decide_information_release)
    graph.add_node("customer_response", _customer_response)
    graph.add_node("customer_response_guard", _customer_response_guard)
    graph.add_node("question_feedback", _question_feedback)
    graph.add_edge(START, "load_context")
    graph.add_edge("load_context", "classify_student_question")
    graph.add_edge("classify_student_question", "decide_information_release")
    graph.add_edge("decide_information_release", "customer_response")
    graph.add_edge("customer_response", "customer_response_guard")
    graph.add_edge("customer_response_guard", "question_feedback")
    graph.add_edge("question_feedback", END)
    return graph.compile()


def _practice_graph():
    graph = StateGraph(StageOneTurnState)
    graph.add_node("load_context", _load_practice_context)
    graph.add_node("classify_student_question", _classify_student_question)
    graph.add_node("decide_information_release", _decide_information_release)
    graph.add_node("customer_response", _customer_response)
    graph.add_node("customer_response_guard", _customer_response_guard)
    graph.add_edge(START, "load_context")
    graph.add_edge("load_context", "classify_student_question")
    graph.add_edge("classify_student_question", "decide_information_release")
    graph.add_edge("decide_information_release", "customer_response")
    graph.add_edge("customer_response", "customer_response_guard")
    graph.add_edge("customer_response_guard", END)
    return graph.compile()


def _practice_evaluation_graph():
    graph = StateGraph(StageOneEvaluationState)
    graph.add_node("load_context", _load_practice_evaluation_context)
    graph.add_node("evaluate", _practice_evaluation)
    graph.add_edge(START, "load_context")
    graph.add_edge("load_context", "evaluate")
    graph.add_edge("evaluate", END)
    return graph.compile()


def _load_guided_context(state: StageOneTurnState) -> StageOneTurnState:
    manifest = state["manifest"]
    level = get_guided_level(state["level_key"])
    return {
        "level": level,
        "customer_persona": resolve_customer_persona(manifest, mode="guided"),
    }


def _load_practice_context(state: StageOneTurnState) -> StageOneTurnState:
    return {
        "customer_persona": resolve_customer_persona(state["manifest"], mode="practice"),
    }


def _classify_student_question(state: StageOneTurnState) -> StageOneTurnState:
    return {
        "student_intent": classify_student_question(
            state["student_message"],
            level_key=state.get("level_key"),
        )
    }


def _decide_information_release(state: StageOneTurnState) -> StageOneTurnState:
    return {
        "information_release": decide_customer_information_release(
            persona=state["customer_persona"],
            level=state.get("level"),
            student_intent=state["student_intent"],
            mode=state["mode"],
        )
    }


def _customer_response(state: StageOneTurnState) -> StageOneTurnState:
    adapter = GatewayModelAdapter(state["db_session"], state["scope"])
    payload = _base_payload(state) | {
        "conversation_history": state.get("conversation_history") or [],
        "practice_context": state.get("practice_context") or {},
        "customer_persona": state["customer_persona"],
        "student_intent": state["student_intent"],
        "information_release": state["information_release"],
        "system_prompt": _customer_system_prompt(state),
    }
    response = adapter.invoke(
        usage_type=GUIDED_CUSTOMER_USAGE if state["mode"] == "guided" else PRACTICE_CUSTOMER_USAGE,
        input_text=state["student_message"],
        request_payload=payload,
    )
    return {
        "customer_response": response.content,
        "customer_call_log_id": response.call_log_id,
    }


def _customer_response_guard(state: StageOneTurnState) -> StageOneTurnState:
    guard = validate_customer_response(
        state["customer_response"],
        information_release=state["information_release"],
    )
    if guard["is_valid"]:
        return {"customer_response_guard": guard}

    retry_response = _retry_customer_response_after_guard(state, guard)
    retry_guard = validate_customer_response(
        retry_response.content,
        information_release=state["information_release"],
    )
    if retry_guard["is_valid"]:
        retry_guard = retry_guard | {
            "retried": True,
            "recovered": True,
            "previous_violations": guard["violations"],
        }
        return {
            "customer_response": retry_response.content,
            "customer_call_log_id": retry_response.call_log_id,
            "customer_response_guard": retry_guard,
        }

    fallback_response = build_customer_fallback_response(
        persona=state["customer_persona"],
        student_intent=state["student_intent"],
    )
    fallback_guard = validate_customer_response(
        fallback_response,
        information_release=state["information_release"],
    ) | {
        "retried": True,
        "fallback_applied": True,
        "previous_violations": guard["violations"],
        "retry_violations": retry_guard["violations"],
    }
    return {
        "customer_response": fallback_response,
        "customer_call_log_id": retry_response.call_log_id,
        "customer_response_guard": fallback_guard,
    }


def _question_feedback(state: StageOneTurnState) -> StageOneTurnState:
    adapter = GatewayModelAdapter(state["db_session"], state["scope"])
    payload = _base_payload(state) | {
        "conversation_history": state.get("conversation_history") or [],
        "customer_persona": state["customer_persona"],
        "customer_response": state["customer_response"],
        "customer_response_guard": state.get("customer_response_guard"),
        "student_intent": state.get("student_intent"),
        "information_release": state.get("information_release"),
        "level": state["level"],
        "system_prompt": build_feedback_system_prompt(
            level=state["level"],
            persona=state["customer_persona"],
        ),
    }
    response = adapter.invoke(
        usage_type=GUIDED_FEEDBACK_USAGE,
        input_text=state["student_message"],
        request_payload=payload,
    )
    feedback = {
        "summary": response.content,
        "can_continue": len(state["student_message"].strip()) >= 12,
        "dimensions": {
            "openness": "学生问题越开放，越容易获得客户业务语境。",
            "focus": "本轮问题应聚焦当前关卡目标。",
            "evidence_awareness": "继续追问可验证事实、数据或样例。",
            "follow_up_depth": "避免停留在表层诉求。",
        },
    }
    return {
        "feedback": feedback,
        "feedback_call_log_id": response.call_log_id,
    }


def _load_practice_evaluation_context(state: StageOneEvaluationState) -> StageOneEvaluationState:
    return {
        "customer_persona": resolve_customer_persona(state["manifest"], mode="practice"),
    }


def _practice_evaluation(state: StageOneEvaluationState) -> StageOneEvaluationState:
    adapter = GatewayModelAdapter(state["db_session"], state["scope"])
    persona = state["customer_persona"]
    payload = {
        "stage_key": state["stage_key"],
        "stage_title": state["stage_title"],
        "stage_blueprint": state["stage_blueprint"],
        "mode": "practice",
        "scenario": state["manifest"].get("scenario"),
        "company_profile": state["manifest"].get("company_profile"),
        "customer_persona": persona,
        "interview_turns": state["interview_turns"],
        "visit_notes": state["visit_notes"],
        "problem_summary": state["problem_summary"],
        "system_prompt": build_practice_evaluation_system_prompt(persona=persona),
    }
    response = adapter.invoke(
        usage_type=PRACTICE_EVALUATION_USAGE,
        input_text="stage_1_practice_evaluation",
        request_payload=payload,
    )
    return {
        "evaluation": {
            "review_summary": response.content,
            "coverage_dimensions": {
                "business_context": "检查是否说明现有流程、角色分工和工作场景。",
                "pain_points": "检查是否把客户表述追问成可验证影响。",
                "constraints": "检查是否覆盖预算、时间、系统边界和落地阻力。",
                "data_feasibility": "检查是否确认数据来源、字段质量和样例可用性。",
                "summary_alignment": "检查是否形成客户可确认的问题定义和下一步材料。",
            },
            "next_stage_risks": [],
            "ai_call_log_id": str(response.call_log_id) if response.call_log_id else None,
        },
        "evaluation_call_log_id": response.call_log_id,
    }


def _base_payload(state: StageOneTurnState) -> dict[str, Any]:
    return {
        "stage_key": state["stage_key"],
        "stage_title": state["stage_title"],
        "stage_blueprint": state["stage_blueprint"],
        "mode": state["mode"],
        "level_key": state.get("level_key"),
        "scenario": state["manifest"].get("scenario"),
        "company_profile": state["manifest"].get("company_profile"),
        "practice_context": state.get("practice_context") or {},
    }


def _customer_system_prompt(state: StageOneTurnState) -> str:
    return build_customer_system_prompt(
        manifest=state["manifest"],
        persona=state["customer_persona"],
        mode=state["mode"],
        level=state.get("level"),
        student_intent=state["student_intent"],
        information_release=state["information_release"],
    )


def _retry_customer_response_after_guard(
    state: StageOneTurnState,
    guard: dict[str, Any],
):
    adapter = GatewayModelAdapter(state["db_session"], state["scope"])
    retry_prompt = build_customer_guard_retry_prompt(
        base_prompt=_customer_system_prompt(state),
        guard=guard,
    )
    payload = _base_payload(state) | {
        "conversation_history": state.get("conversation_history") or [],
        "customer_persona": state["customer_persona"],
        "student_intent": state["student_intent"],
        "information_release": state["information_release"],
        "invalid_customer_response": state["customer_response"],
        "customer_response_guard": guard,
        "retry_attempt": 1,
        "system_prompt": retry_prompt,
    }
    return adapter.invoke(
        usage_type=GUIDED_CUSTOMER_USAGE if state["mode"] == "guided" else PRACTICE_CUSTOMER_USAGE,
        input_text=state["student_message"],
        request_payload=payload,
    )
