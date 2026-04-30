from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict

from app.models.enums import SessionStatus, StageStatus


class ExperimentSessionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    course_id: uuid.UUID


class StageRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_id: uuid.UUID
    session_id: uuid.UUID
    stage_key: str
    stage_order: int
    status: StageStatus


class ExperimentSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    institution_id: uuid.UUID
    course_id: uuid.UUID
    student_user_id: uuid.UUID
    package_version_id: uuid.UUID
    status: SessionStatus
    stage_records: list[StageRecordResponse]
