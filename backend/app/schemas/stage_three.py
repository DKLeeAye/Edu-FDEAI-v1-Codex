from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import StageStatus
from app.schemas.artifacts import ArtifactResponse

KnowledgeStrategy = Literal["prompt_only", "rag", "tool_calling", "hybrid"]


class StageThreeKnowledgeDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    knowledge_goal: str = Field(min_length=1, max_length=4000)
    required_knowledge_types: list[str] = Field(min_length=1, max_length=20)
    source_inventory: list[str] = Field(min_length=1, max_length=30)
    selected_strategy: KnowledgeStrategy
    strategy_rationale: str = Field(min_length=1, max_length=4000)
    data_quality_risks: list[str] = Field(min_length=1, max_length=30)
    maintenance_plan: str = Field(min_length=1, max_length=4000)
    evaluation_plan: str = Field(min_length=1, max_length=4000)
    stage_4_build_plan: str = Field(min_length=1, max_length=4000)


class StageThreeKnowledgeDecisionResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse


class StageThreeAiReviewResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    ai_call_log_id: uuid.UUID | None
    artifact: ArtifactResponse


class StageThreeCompletionResponse(BaseModel):
    session_id: uuid.UUID
    completed_stage_record_id: uuid.UUID
    completed_stage_key: str
    completed_stage_status: StageStatus
    unlocked_stage_record_id: uuid.UUID
    unlocked_stage_key: str
    unlocked_stage_status: StageStatus
