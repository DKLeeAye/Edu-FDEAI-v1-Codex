from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import StageStatus
from app.schemas.artifacts import ArtifactResponse

StageFourAppMode = Literal["chatflow", "workflow", "agent"]
StageFourAgentApiType = Literal["dify_chat_messages", "generic_json"]
StageFourAppAccessCheckResult = Literal[
    "unchecked",
    "manual_confirmed",
    "reachable",
    "blocked",
]
StageFourTestCategory = Literal["standard", "out_of_scope", "multi_turn", "custom"]
StageFourTestCaseResult = Literal["passed", "failed", "partial"]
StageFourOverallResult = Literal["passed", "needs_revision"]


class StageFourDifyImplementationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    dify_app_name: str = Field(min_length=1, max_length=200)
    dify_app_url: str = Field(min_length=1, max_length=2000)
    dify_app_id: str | None = Field(default=None, min_length=1, max_length=200)
    agent_api_endpoint: str | None = Field(default=None, min_length=1, max_length=2000)
    agent_api_type: StageFourAgentApiType | None = None
    app_mode: StageFourAppMode
    knowledge_base_notes: str = Field(min_length=1, max_length=4000)
    prompt_or_instruction_notes: str = Field(min_length=1, max_length=4000)
    tool_configuration_notes: str = Field(min_length=1, max_length=4000)
    implementation_notes: str = Field(min_length=1, max_length=4000)
    known_limitations: list[str] = Field(default_factory=list, max_length=30)
    app_access_check_notes: str | None = Field(default=None, min_length=1, max_length=2000)
    app_access_check_result: StageFourAppAccessCheckResult | None = None
    build_task_checklist: list[str] | None = Field(default=None, max_length=20)
    onboarding_checklist: list[str] | None = Field(default=None, max_length=20)
    stage_three_alignment_notes: str | None = Field(default=None, min_length=1, max_length=4000)


class StageFourGuideChecks(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agentArchitecture: bool
    riskBoundaries: bool
    stageThreeTransfer: bool
    testableRules: bool


class StageFourGuideConfirmationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    checks: StageFourGuideChecks


class StageFourTestCase(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    scenario: str = Field(min_length=1, max_length=500)
    input: str = Field(min_length=1, max_length=4000)
    expected_output: str = Field(min_length=1, max_length=4000)
    actual_output: str = Field(min_length=1, max_length=4000)
    result: StageFourTestCaseResult
    notes: str | None = Field(default=None, min_length=1, max_length=2000)
    evidence_note: str | None = Field(default=None, min_length=1, max_length=2000)
    test_category: StageFourTestCategory | None = None


class StageFourTestReportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    test_goal: str = Field(min_length=1, max_length=4000)
    test_cases: list[StageFourTestCase] = Field(min_length=1, max_length=50)
    coverage_notes: str | None = Field(default=None, min_length=1, max_length=4000)
    observed_failures: list[str] = Field(default_factory=list, max_length=50)
    improvement_actions: list[str] = Field(default_factory=list, max_length=50)
    overall_result: StageFourOverallResult


class StageFourAgentTestRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    app_name: str | None = Field(default=None, min_length=1, max_length=200)
    knowledge_name: str | None = Field(default=None, min_length=1, max_length=200)
    publish_url: str | None = Field(default=None, min_length=1, max_length=2000)
    access_note: str | None = Field(default=None, min_length=1, max_length=2000)
    api_endpoint: str | None = Field(default=None, min_length=1, max_length=2000)
    api_key: str | None = Field(default=None, min_length=1, max_length=4000)
    api_type: StageFourAgentApiType | None = None


class StageFourDifyImplementationResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse


class StageFourTestReportResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse


class StageFourAiTestReviewResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    ai_call_log_id: uuid.UUID | None
    artifact: ArtifactResponse


class StageFourCompletionResponse(BaseModel):
    session_id: uuid.UUID
    completed_stage_record_id: uuid.UUID
    completed_stage_key: str
    completed_stage_status: StageStatus
    unlocked_stage_record_id: uuid.UUID
    unlocked_stage_key: str
    unlocked_stage_status: StageStatus
