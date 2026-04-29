from __future__ import annotations

import uuid

from pydantic import BaseModel

from app.models.enums import UserRole


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    tenant_id: uuid.UUID
    institution_id: uuid.UUID
    role: UserRole
