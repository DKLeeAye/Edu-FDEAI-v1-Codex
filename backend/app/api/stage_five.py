from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai_gateway import AiGatewayError
from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.schemas.artifacts import ArtifactResponse
from app.schemas.stage_five import (
    StageFiveAcceptancePackageRequest,
    StageFiveAcceptancePackageResponse,
    StageFiveAiDeliveryReviewResponse,
    StageFiveCompletionResponse,
    StageFiveDeliveryDocumentRequest,
    StageFiveDeliveryDocumentResponse,
    StageFiveOperationsGuideRequest,
    StageFiveOperationsGuideResponse,
)
from app.services import stage_five as stage_five_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

router = APIRouter(prefix=settings.api_v1_prefix, tags=["stage-five"])


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-five/delivery-document",
    response_model=StageFiveDeliveryDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_delivery_document(
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFiveDeliveryDocumentRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageFiveDeliveryDocumentResponse:
    try:
        result = stage_five_service.save_delivery_document(
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

    return StageFiveDeliveryDocumentResponse(
        session_id=result.session_id,
        stage_record_id=result.stage_record_id,
        stage_key=result.stage_key,
        artifact=ArtifactResponse.model_validate(result.artifact),
    )


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-five/acceptance-package",
    response_model=StageFiveAcceptancePackageResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_acceptance_package(
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFiveAcceptancePackageRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageFiveAcceptancePackageResponse:
    try:
        result = stage_five_service.save_acceptance_package(
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

    return StageFiveAcceptancePackageResponse(
        session_id=result.session_id,
        stage_record_id=result.stage_record_id,
        stage_key=result.stage_key,
        artifact=ArtifactResponse.model_validate(result.artifact),
    )


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-five/operations-guide",
    response_model=StageFiveOperationsGuideResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_operations_guide(
    session_id: uuid.UUID,
    stage_key: str,
    payload: StageFiveOperationsGuideRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageFiveOperationsGuideResponse:
    try:
        result = stage_five_service.save_operations_guide(
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

    return StageFiveOperationsGuideResponse(
        session_id=result.session_id,
        stage_record_id=result.stage_record_id,
        stage_key=result.stage_key,
        artifact=ArtifactResponse.model_validate(result.artifact),
    )


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-five/ai-delivery-review",
    response_model=StageFiveAiDeliveryReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def request_ai_delivery_review(
    session_id: uuid.UUID,
    stage_key: str,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageFiveAiDeliveryReviewResponse:
    try:
        result = stage_five_service.request_ai_delivery_review(
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

    return StageFiveAiDeliveryReviewResponse(
        session_id=result.session_id,
        stage_record_id=result.stage_record_id,
        stage_key=result.stage_key,
        ai_call_log_id=result.ai_call_log_id,
        artifact=ArtifactResponse.model_validate(result.artifact),
    )


@router.post(
    "/experiment-sessions/{session_id}/stages/{stage_key}/stage-five/complete",
    response_model=StageFiveCompletionResponse,
)
def complete_stage_five(
    session_id: uuid.UUID,
    stage_key: str,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> StageFiveCompletionResponse:
    try:
        result = stage_five_service.complete_stage_five(
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

    return StageFiveCompletionResponse(
        session_id=result.session_id,
        completed_stage_record_id=result.completed_stage_record.id,
        completed_stage_key=result.completed_stage_record.stage_key,
        completed_stage_status=result.completed_stage_record.status,
        session_status=result.experiment_session.status,
    )
