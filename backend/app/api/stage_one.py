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
    StageOneCompletionResponse,
    StageOneGuidedLevelCompletionResponse,
    StageOneGuidedTrainingResponse,
    StageOneGuidedTurnItem,
    StageOneGuidedTurnRequest,
    StageOneGuidedTurnResponse,
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


@router.get(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-one/guided-training",
    response_model=StageOneGuidedTrainingResponse,
)
def get_guided_training(
    session_id: uuid.UUID,
    stage_key: str,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageOneGuidedTrainingResponse:
    try:
        result = stage_one_service.get_guided_training(
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
    return _guided_training_response(result)


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-one/guided-training/turns",
    response_model=StageOneGuidedTurnResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_guided_training_turn(
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageOneGuidedTurnRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageOneGuidedTurnResponse:
    try:
        result = stage_one_service.create_guided_training_turn(
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
    except AiGatewayError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    turn = result.turn
    return StageOneGuidedTurnResponse(
        attempt_id=result.attempt.id,
        turn_id=turn.id,
        session_id=turn.session_id,
        stage_record_id=turn.stage_record_id,
        stage_key="stage_1",
        level_key=turn.level_key,
        student_message=turn.student_message,
        customer_response=turn.customer_response,
        feedback=turn.feedback_json,
        customer_call_log_id=turn.customer_call_log_id,
        feedback_call_log_id=turn.feedback_call_log_id,
    )


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-one/"
    "guided-training/levels/{level_key}/complete",
    response_model=StageOneGuidedLevelCompletionResponse,
)
def complete_guided_training_level(
    session_id: uuid.UUID,
    stage_key: str,
    level_key: str,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageOneGuidedLevelCompletionResponse:
    try:
        result = stage_one_service.complete_guided_training_level(
            db_session,
            current_user=current_user,
            session_id=session_id,
            stage_key=stage_key,
            level_key=level_key,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    attempt = result.attempt
    return StageOneGuidedLevelCompletionResponse(
        attempt_id=attempt.id,
        session_id=attempt.session_id,
        stage_record_id=attempt.stage_record_id,
        stage_key="stage_1",
        active_level=attempt.active_level,
        completed_levels=attempt.completed_levels_json,
        status=attempt.status,
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


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-one/complete",
    response_model=StageOneCompletionResponse,
)
def complete_stage_one(
    session_id: uuid.UUID,
    stage_key: str,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageOneCompletionResponse:
    try:
        result = stage_one_service.complete_stage_one(
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

    return StageOneCompletionResponse(
        session_id=result.session_id,
        completed_stage_record_id=result.completed_stage_record.id,
        completed_stage_key=result.completed_stage_record.stage_key,
        completed_stage_status=result.completed_stage_record.status,
        unlocked_stage_record_id=result.unlocked_stage_record.id,
        unlocked_stage_key=result.unlocked_stage_record.stage_key,
        unlocked_stage_status=result.unlocked_stage_record.status,
    )


def _guided_training_response(
    result: stage_one_service.StageOneGuidedTrainingResult,
) -> StageOneGuidedTrainingResponse:
    attempt = result.attempt
    return StageOneGuidedTrainingResponse(
        attempt_id=attempt.id,
        session_id=attempt.session_id,
        stage_record_id=attempt.stage_record_id,
        stage_key="stage_1",
        active_level=attempt.active_level,
        completed_levels=attempt.completed_levels_json,
        status=attempt.status,
        customer_persona=result.customer_persona,
        turns=[
            StageOneGuidedTurnItem(
                turn_id=turn.id,
                level_key=turn.level_key,
                student_message=turn.student_message,
                customer_response=turn.customer_response,
                feedback=turn.feedback_json,
                customer_call_log_id=turn.customer_call_log_id,
                feedback_call_log_id=turn.feedback_call_log_id,
            )
            for turn in result.turns
        ],
    )
