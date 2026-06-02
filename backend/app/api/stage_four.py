from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai_gateway import AiGatewayError
from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.schemas.artifacts import ArtifactResponse
from app.schemas.stage_four import (
    StageFourAgentTestRunRequest,
    StageFourAiTestReviewResponse,
    StageFourCompletionResponse,
    StageFourDifyImplementationRequest,
    StageFourDifyImplementationResponse,
    StageFourGuideConfirmationRequest,
    StageFourTestReportRequest,
    StageFourTestReportResponse,
)
from app.services import stage_four as stage_four_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

router = APIRouter(prefix=settings.api_v1_prefix, tags=["stage-four"])


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-four/guide-confirmation",
    response_model=StageFourDifyImplementationResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_guide_confirmation(
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFourGuideConfirmationRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageFourDifyImplementationResponse:
    try:
        result = stage_four_service.save_guide_confirmation(
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

    return StageFourDifyImplementationResponse(
        session_id=result.session_id,
        stage_record_id=result.stage_record_id,
        stage_key=result.stage_key,
        artifact=ArtifactResponse.model_validate(result.artifact),
    )


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-four/dify-implementation",
    response_model=StageFourDifyImplementationResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_dify_implementation(
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFourDifyImplementationRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageFourDifyImplementationResponse:
    try:
        result = stage_four_service.save_dify_implementation(
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

    return StageFourDifyImplementationResponse(
        session_id=result.session_id,
        stage_record_id=result.stage_record_id,
        stage_key=result.stage_key,
        artifact=ArtifactResponse.model_validate(result.artifact),
    )


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-four/test-report",
    response_model=StageFourTestReportResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_test_report(
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFourTestReportRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageFourTestReportResponse:
    try:
        result = stage_four_service.save_test_report(
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

    return StageFourTestReportResponse(
        session_id=result.session_id,
        stage_record_id=result.stage_record_id,
        stage_key=result.stage_key,
        artifact=ArtifactResponse.model_validate(result.artifact),
    )


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-four/agent-tests",
    response_model=StageFourTestReportResponse,
    status_code=status.HTTP_201_CREATED,
)
def run_agent_tests(
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFourAgentTestRunRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageFourTestReportResponse:
    try:
        result = stage_four_service.run_agent_tests(
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

    return StageFourTestReportResponse(
        session_id=result.session_id,
        stage_record_id=result.stage_record_id,
        stage_key=result.stage_key,
        artifact=ArtifactResponse.model_validate(result.artifact),
    )


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-four/ai-test-review",
    response_model=StageFourAiTestReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def request_ai_test_review(
    session_id: uuid.UUID,
    stage_key: str,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageFourAiTestReviewResponse:
    try:
        result = stage_four_service.request_ai_test_review(
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

    return StageFourAiTestReviewResponse(
        session_id=result.session_id,
        stage_record_id=result.stage_record_id,
        stage_key=result.stage_key,
        ai_call_log_id=result.ai_call_log_id,
        artifact=ArtifactResponse.model_validate(result.artifact),
    )


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-four/complete",
    response_model=StageFourCompletionResponse,
)
def complete_stage_four(
    session_id: uuid.UUID,
    stage_key: str,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageFourCompletionResponse:
    try:
        result = stage_four_service.complete_stage_four(
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

    return StageFourCompletionResponse(
        session_id=result.session_id,
        completed_stage_record_id=result.completed_stage_record.id,
        completed_stage_key=result.completed_stage_record.stage_key,
        completed_stage_status=result.completed_stage_record.status,
        unlocked_stage_record_id=result.unlocked_stage_record.id,
        unlocked_stage_key=result.unlocked_stage_record.stage_key,
        unlocked_stage_status=result.unlocked_stage_record.status,
    )
