from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ArtifactStatus


class ArtifactCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    artifact_type: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=200)
    content_json: dict[str, Any] = Field(default_factory=dict)
    status: ArtifactStatus = ArtifactStatus.DRAFT


class ArtifactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    institution_id: uuid.UUID
    course_id: uuid.UUID
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    submitted_by_user_id: uuid.UUID | None
    artifact_type: str
    title: str
    content_json: dict[str, Any]
    version: int
    status: ArtifactStatus
    submitted_at: datetime | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime
