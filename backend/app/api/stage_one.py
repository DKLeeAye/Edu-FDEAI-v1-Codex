from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai_gateway import AiGatewayError
from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.schemas.artifacts import ArtifactResponse
from app.schemas.stage_one import (
    StageOneInterviewRequest,
    StageOneInterviewResponse,
    StageOneSummaryRequest,
    StageOneSummaryResponse,
)
from app.services import stage_one as stage_one_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

router = APIRouter(prefix=settings.api_v1_prefix, tags=["stage-one"])


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-one/interview-turns",
    response_model=StageOneInterviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def ask_ai_customer(
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageOneInterviewRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageOneInterviewResponse:
    try:
        result = stage_one_service.ask_ai_customer(
            db_session,
            current_user=current_user,
            session_id=session_id,
            stage_key=stage_key,
            message=payload.message,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except AiGatewayError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return StageOneInterviewResponse(
        session_id=result.session_id,
        stage_record_id=result.stage_record_id,
        stage_key=result.stage_key,
        user_message=result.user_message,
        ai_customer_response=result.ai_customer_response,
        ai_call_log_id=result.ai_call_log_id,
        artifact=ArtifactResponse.model_validate(result.artifact),
    )


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-one/summary",
    response_model=StageOneSummaryResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_problem_summary(
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageOneSummaryRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageOneSummaryResponse:
    try:
        result = stage_one_service.save_problem_summary(
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

    return StageOneSummaryResponse(
        session_id=result.session_id,
        stage_record_id=result.stage_record_id,
        stage_key=result.stage_key,
        artifact=ArtifactResponse.model_validate(result.artifact),
    )
