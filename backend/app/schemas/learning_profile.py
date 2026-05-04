from __future__ import annotations

import uuid

from pydantic import BaseModel

from app.models.enums import SessionStatus, StageStatus


class LearningProfileStudentSummary(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str


class LearningProfileStageStatus(BaseModel):
    stage_key: str
    stage_order: int
    status: StageStatus


class LearningProfileResponse(BaseModel):
    session_id: uuid.UUID
    session_status: SessionStatus
    student: LearningProfileStudentSummary
    stage_status_summary: list[LearningProfileStageStatus]
    artifact_count_by_stage: dict[str, int]
    ai_review_count_by_stage: dict[str, int]
    completed_stage_count: int
    total_stage_count: int
    completion_ratio: float
    strengths: list[str]
    risks: list[str]
    next_suggestions: list[str]
