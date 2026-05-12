from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.ai_gateway import AiGatewayRequest, AiGatewayResponse, invoke_ai


@dataclass(frozen=True)
class AiRuntimeScope:
    tenant_id: uuid.UUID
    institution_id: uuid.UUID
    course_id: uuid.UUID
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    user_id: uuid.UUID


class GatewayModelAdapter:
    """LangGraph-facing model adapter that keeps provider calls inside AI Gateway."""

    def __init__(self, session: Session, scope: AiRuntimeScope) -> None:
        self._session = session
        self._scope = scope

    def invoke(
        self,
        *,
        usage_type: str,
        input_text: str,
        request_payload: dict[str, Any],
        prompt_version_id: uuid.UUID | None = None,
    ) -> AiGatewayResponse:
        return invoke_ai(
            self._session,
            AiGatewayRequest(
                tenant_id=self._scope.tenant_id,
                institution_id=self._scope.institution_id,
                course_id=self._scope.course_id,
                session_id=self._scope.session_id,
                stage_record_id=self._scope.stage_record_id,
                user_id=self._scope.user_id,
                usage_type=usage_type,
                input_text=input_text,
                request_payload=request_payload,
                prompt_version_id=prompt_version_id,
            ),
        )
