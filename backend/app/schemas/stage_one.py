from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.artifacts import ArtifactResponse


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


class StageOneSummaryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    problem_statement: str = Field(min_length=1, max_length=4000)
    target_user: str = Field(min_length=1, max_length=1000)
    business_context: str = Field(min_length=1, max_length=4000)
    pain_points: list[str] = Field(min_length=1, max_length=20)
    success_criteria: list[str] = Field(min_length=1, max_length=20)


class StageOneSummaryResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse
