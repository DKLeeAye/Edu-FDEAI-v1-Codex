from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai_gateway import AiGatewayError
from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.schemas.artifacts import ArtifactResponse
from app.schemas.stage_three import (
    StageThreeAiReviewResponse,
    StageThreeCompletionResponse,
    StageThreeKnowledgeDecisionRequest,
    StageThreeKnowledgeDecisionResponse,
)
from app.services import stage_three as stage_three_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

router = APIRouter(prefix=settings.api_v1_prefix, tags=["stage-three"])


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-three/knowledge-decision",
    response_model=StageThreeKnowledgeDecisionResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_knowledge_decision(
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageThreeKnowledgeDecisionRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageThreeKnowledgeDecisionResponse:
    try:
        result = stage_three_service.save_knowledge_decision(
            db_session,
            current_user=current_user,
            session_id=session_id,
            stage_key=stage_key,
            payload=payload,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return StageThreeKnowledgeDecisionResponse(
        session_id=result.session_id,
        stage_record_id=result.stage_record_id,
        stage_key=result.stage_key,
        artifact=ArtifactResponse.model_validate(result.artifact),
    )


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-three/ai-review",
    response_model=StageThreeAiReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def request_ai_review(
    session_id: uuid.UUID,
    stage_key: str,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageThreeAiReviewResponse:
    try:
        result = stage_three_service.request_ai_review(
            db_session,
            current_user=current_user,
            session_id=session_id,
            stage_key=stage_key,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except AiGatewayError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return StageThreeAiReviewResponse(
        session_id=result.session_id,
        stage_record_id=result.stage_record_id,
        stage_key=result.stage_key,
        ai_call_log_id=result.ai_call_log_id,
        artifact=ArtifactResponse.model_validate(result.artifact),
    )


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-three/complete",
    response_model=StageThreeCompletionResponse,
)
def complete_stage_three(
    session_id: uuid.UUID,
    stage_key: str,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageThreeCompletionResponse:
    try:
        result = stage_three_service.complete_stage_three(
            db_session,
            current_user=current_user,
            session_id=session_id,
            stage_key=stage_key,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return StageThreeCompletionResponse(
        session_id=result.session_id,
        completed_stage_record_id=result.completed_stage_record.id,
        completed_stage_key=result.completed_stage_record.stage_key,
        completed_stage_status=result.completed_stage_record.status,
        unlocked_stage_record_id=result.unlocked_stage_record.id,
        unlocked_stage_key=result.unlocked_stage_record.stage_key,
        unlocked_stage_status=result.unlocked_stage_record.status,
    )
