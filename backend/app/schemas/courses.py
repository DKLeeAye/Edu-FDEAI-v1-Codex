from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CourseStatus


class CourseCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    code: str = Field(min_length=1, max_length=80)
    package_version_id: uuid.UUID


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    institution_id: uuid.UUID
    package_version_id: uuid.UUID
    created_by_user_id: uuid.UUID | None
    title: str
    code: str
    status: CourseStatus
