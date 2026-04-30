from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AiGatewayRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tenant_id: uuid.UUID
    institution_id: uuid.UUID
    usage_type: str = Field(min_length=1, max_length=80)
    input_text: str = ""
    request_payload: dict[str, Any] = Field(default_factory=dict)
    course_id: uuid.UUID | None = None
    session_id: uuid.UUID | None = None
    stage_record_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    prompt_version_id: uuid.UUID | None = None


class AiGatewayResponse(BaseModel):
    provider: str
    model_name: str
    content: str
    response_payload: dict[str, Any] = Field(default_factory=dict)
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_ms: int = 0
