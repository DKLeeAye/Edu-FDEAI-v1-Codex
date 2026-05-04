from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import StageStatus
from app.schemas.artifacts import ArtifactResponse


class StageTwoSolutionDefinitionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    solution_title: str = Field(min_length=1, max_length=200)
    problem_statement_ref: uuid.UUID | None = None
    problem_summary: str | None = Field(default=None, min_length=1, max_length=4000)
    proposed_agent_capability: str = Field(min_length=1, max_length=4000)
    target_workflow: str = Field(min_length=1, max_length=4000)
    data_sources: list[str] = Field(min_length=1, max_length=20)
    tool_or_system_dependencies: list[str] = Field(min_length=1, max_length=20)
    feasibility_risks: list[str] = Field(min_length=1, max_length=20)
    expected_value: str = Field(min_length=1, max_length=4000)

    @model_validator(mode="after")
    def require_problem_reference(self) -> StageTwoSolutionDefinitionRequest:
        if self.problem_statement_ref is None and not self.problem_summary:
            raise ValueError("problem_statement_ref or problem_summary is required")
        return self


class StageTwoSolutionDefinitionResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse


class StageTwoAiReviewResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    ai_call_log_id: uuid.UUID | None
    artifact: ArtifactResponse


class StageTwoCompletionResponse(BaseModel):
    session_id: uuid.UUID
    completed_stage_record_id: uuid.UUID
    completed_stage_key: str
    completed_stage_status: StageStatus
    unlocked_stage_record_id: uuid.UUID
    unlocked_stage_key: str
    unlocked_stage_status: StageStatus
