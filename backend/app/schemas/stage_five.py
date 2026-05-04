from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SessionStatus, StageStatus
from app.schemas.artifacts import ArtifactResponse


class StageFiveDeliveryDocumentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    project_name: str = Field(min_length=1, max_length=200)
    final_agent_url: str = Field(min_length=1, max_length=2000)
    delivery_summary: str = Field(min_length=1, max_length=4000)
    core_features: list[str] = Field(min_length=1, max_length=50)
    target_users: list[str] = Field(min_length=1, max_length=50)
    usage_instructions: str = Field(min_length=1, max_length=4000)
    known_limitations: list[str] = Field(default_factory=list, max_length=50)


class StageFiveAcceptancePackageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    acceptance_scope: str = Field(min_length=1, max_length=4000)
    acceptance_criteria: list[str] = Field(min_length=1, max_length=50)
    test_evidence_summary: str = Field(min_length=1, max_length=4000)
    unresolved_issues: list[str] = Field(default_factory=list, max_length=50)
    handover_checklist: list[str] = Field(min_length=1, max_length=50)


class StageFiveOperationsGuideRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    runtime_dependencies: list[str] = Field(min_length=1, max_length=50)
    data_update_plan: str = Field(min_length=1, max_length=4000)
    monitoring_plan: str = Field(min_length=1, max_length=4000)
    common_issues: list[str] = Field(default_factory=list, max_length=50)
    maintenance_owner_notes: str = Field(min_length=1, max_length=4000)


class StageFiveDeliveryDocumentResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse


class StageFiveAcceptancePackageResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse


class StageFiveOperationsGuideResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse


class StageFiveAiDeliveryReviewResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    ai_call_log_id: uuid.UUID | None
    artifact: ArtifactResponse


class StageFiveCompletionResponse(BaseModel):
    session_id: uuid.UUID
    completed_stage_record_id: uuid.UUID
    completed_stage_key: str
    completed_stage_status: StageStatus
    session_status: SessionStatus
