from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import StageStatus
from app.schemas.artifacts import ArtifactResponse

KnowledgeStrategy = Literal["prompt_only", "rag", "tool_calling", "hybrid"]
CaseTeachingLessonKey = Literal[
    "data_quality",
    "chunking_failure",
    "retrieval_failure",
    "diagnostic_map",
]
LabLayerName = Literal[
    "数据准备",
    "分块策略",
    "向量化与存储",
    "召回策略",
    "效果评估",
]


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


class StageThreeCaseStudyRecordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    visited_lesson_keys: list[CaseTeachingLessonKey] = Field(min_length=1, max_length=4)
    key_takeaways: list[str] = Field(default_factory=list, max_length=12)
    diagnostic_summary: str = Field(default="", max_length=2000)


class StageThreeLayerObservationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    layer: LabLayerName
    knowledge_point: str = Field(min_length=1, max_length=1000)
    observation: str = Field(min_length=1, max_length=1000)


class StageThreeLabExperimentRecordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    observations: list[StageThreeLayerObservationRequest] = Field(min_length=1, max_length=5)
    selected_parameters: dict[str, object] = Field(default_factory=dict)


class StageThreeKnowledgeDecisionResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse


class StageThreeProcessArtifactResponse(BaseModel):
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
