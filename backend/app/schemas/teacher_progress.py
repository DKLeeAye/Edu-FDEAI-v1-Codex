from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

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


class TeacherReviewConfirmationRequest(BaseModel):
    decision: Literal["accept", "override"]
    teacher_score: int | None = Field(default=None, ge=0, le=100)
    override_reason: str | None = Field(default=None, max_length=1000)
    comment: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def validate_override_reason(self) -> "TeacherReviewConfirmationRequest":
        if self.decision == "override" and not (self.override_reason or "").strip():
            raise ValueError("override_reason is required when decision is override")
        return self


class TeacherGradeRubricScore(BaseModel):
    dimension_key: str = Field(min_length=1, max_length=80)
    dimension_name: str | None = Field(default=None, max_length=120)
    score: int = Field(ge=0)
    max_score: int = Field(ge=1)
    comment: str | None = Field(default=None, max_length=1000)


class TeacherGradeDraftRequest(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    rubric_scores: list[TeacherGradeRubricScore] = Field(default_factory=list)
    comment: str | None = Field(default=None, max_length=2000)
    evidence_artifact_ids: list[uuid.UUID] = Field(default_factory=list)


class TeacherGradePublicationRequest(BaseModel):
    draft_artifact_id: uuid.UUID
    publication_note: str | None = Field(default=None, max_length=1000)


class TeacherGradeExportRow(BaseModel):
    session_id: uuid.UUID
    student: TeacherStudentSummary
    grade_status: Literal["missing", "draft", "published"]
    published_score: int | None
    draft_artifact_id: uuid.UUID | None
    publication_artifact_id: uuid.UUID | None
    published_at: datetime | None
    comment: str | None


class TeacherGradeExportResponse(BaseModel):
    course_id: uuid.UUID
    course_title: str
    generated_at: datetime
    rows: list[TeacherGradeExportRow]


class TeacherRubricResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    package_version_id: uuid.UUID
    course_id: uuid.UUID | None
    stage_key: str
    name: str
    version: int
    total_score: int
    status: str
    rubric_json: dict[str, Any]
    scope: Literal["course", "package"]
    created_at: datetime
    updated_at: datetime


class TeacherRubricDraftRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    total_score: int = Field(ge=1, le=200)
    rubric_json: dict[str, Any] = Field(default_factory=dict)
