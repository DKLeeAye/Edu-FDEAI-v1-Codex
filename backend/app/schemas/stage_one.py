from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import StageStatus
from app.schemas.artifacts import ArtifactResponse


class StageOneCustomerPersonaResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    name: str | None = None
    position: str | None = None
    responsibilities: list[str] = Field(default_factory=list)
    project_concerns: list[str] = Field(default_factory=list)
    release_rules: list[str] = Field(default_factory=list)


class StageOneInterviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    message: str = Field(min_length=1, max_length=4000)


class StageOneInterviewResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    user_message: str
    ai_customer_response: str
    ai_call_log_id: uuid.UUID | None
    artifact: ArtifactResponse


class StageOneGuidedTurnRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    level_key: str = Field(min_length=1, max_length=80)
    message: str = Field(min_length=1, max_length=4000)


class StageOneGuidedTurnResponse(BaseModel):
    attempt_id: uuid.UUID
    turn_id: uuid.UUID
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    level_key: str
    student_message: str
    customer_response: str
    feedback: dict[str, object]
    customer_call_log_id: uuid.UUID | None
    feedback_call_log_id: uuid.UUID | None


class StageOneGuidedTurnItem(BaseModel):
    turn_id: uuid.UUID
    level_key: str
    student_message: str
    customer_response: str
    feedback: dict[str, object]
    customer_call_log_id: uuid.UUID | None
    feedback_call_log_id: uuid.UUID | None


class StageOneGuidedTrainingResponse(BaseModel):
    attempt_id: uuid.UUID
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    active_level: str
    completed_levels: list[str]
    status: str
    customer_persona: StageOneCustomerPersonaResponse
    turns: list[StageOneGuidedTurnItem]


class StageOneGuidedLevelCompletionResponse(BaseModel):
    attempt_id: uuid.UUID
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    active_level: str
    completed_levels: list[str]
    status: str


class StageOneSummaryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    problem_statement: str = Field(min_length=1, max_length=4000)
    target_user: str = Field(min_length=1, max_length=1000)
    business_context: str = Field(min_length=1, max_length=4000)
    pain_points: list[str] = Field(min_length=1, max_length=20)
    success_criteria: list[str] = Field(min_length=1, max_length=20)
    unconfirmed_questions: list[str] = Field(default_factory=list, max_length=20)
    evidence_artifact_ids: list[uuid.UUID] = Field(default_factory=list, max_length=50)


class StageOneVisitNotesRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    confirmed_information: list[str] = Field(min_length=1, max_length=30)
    requirement_hypotheses: list[str] = Field(default_factory=list, max_length=20)
    risks_and_questions: list[str] = Field(default_factory=list, max_length=30)
    next_visit_plan: str = Field(min_length=1, max_length=4000)
    customer_visible_summary: str = Field(min_length=1, max_length=4000)


class StageOneSummaryResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse


class StageOneVisitNotesResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse


class StageOneEvaluationResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse


class StageOneCompletionResponse(BaseModel):
    session_id: uuid.UUID
    completed_stage_record_id: uuid.UUID
    completed_stage_key: str
    completed_stage_status: StageStatus
    unlocked_stage_record_id: uuid.UUID
    unlocked_stage_key: str
    unlocked_stage_status: StageStatus
