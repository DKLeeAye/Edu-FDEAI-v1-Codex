from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.enums import ArtifactStatus, CourseStatus, SessionStatus, StageStatus


class TeacherStudentSummary(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str


class TeacherStageProgressResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    session_id: uuid.UUID
    stage_key: str
    stage_order: int
    status: StageStatus
    artifact_count: int
    updated_at: datetime


class TeacherSessionProgressResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    student: TeacherStudentSummary
    status: SessionStatus
    stage_records: list[TeacherStageProgressResponse]
    artifact_total_count: int
    updated_at: datetime


class TeacherCourseProgressResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    institution_id: uuid.UUID
    package_version_id: uuid.UUID
    created_by_user_id: uuid.UUID | None
    title: str
    code: str
    status: CourseStatus
    sessions: list[TeacherSessionProgressResponse]


class TeacherArtifactSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
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
    created_at: datetime
    updated_at: datetime
