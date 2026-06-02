from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import UserRole


class RegisterWithInviteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    invite_code: str = Field(min_length=8, max_length=80)
    email: str = Field(min_length=3, max_length=320)
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class RegistrationInviteCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1, max_length=160)
    role: UserRole = UserRole.STUDENT
    course_id: uuid.UUID | None = None
    max_uses: int = Field(default=1, ge=1, le=500)
    expires_at: datetime | None = None
    metadata_json: dict[str, object] = Field(default_factory=dict)


class RegistrationInviteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    institution_id: uuid.UUID
    created_by_user_id: uuid.UUID | None
    course_id: uuid.UUID | None
    label: str
    role: UserRole
    max_uses: int
    used_count: int
    expires_at: datetime | None
    is_active: bool
    metadata_json: dict[str, object]
    created_at: datetime
    updated_at: datetime


class RegistrationInviteCreateResponse(RegistrationInviteResponse):
    invite_code: str

