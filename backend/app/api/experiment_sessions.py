from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.schemas.experiment_sessions import (
    ExperimentSessionCreateRequest,
    ExperimentSessionResponse,
)
from app.services import experiment_sessions as session_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

router = APIRouter(
    prefix=f"{settings.api_v1_prefix}/experiment-sessions",
    tags=["experiment-sessions"],
)


@router.post("", response_model=ExperimentSessionResponse, status_code=status.HTTP_201_CREATED)
def create_experiment_session(
    payload: ExperimentSessionCreateRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> ExperimentSessionResponse:
    try:
        experiment_session = session_service.create_experiment_session(
            db_session,
            current_user=current_user,
            course_id=payload.course_id,
        )
        return _to_response(experiment_session)
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("", response_model=list[ExperimentSessionResponse])
def list_experiment_sessions(
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> list[ExperimentSessionResponse]:
    return [
        _to_response(experiment_session)
        for experiment_session in session_service.list_experiment_sessions(
            db_session,
            current_user=current_user,
        )
    ]


@router.get("/{session_id}", response_model=ExperimentSessionResponse)
def get_experiment_session(
    session_id: uuid.UUID,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> ExperimentSessionResponse:
    try:
        experiment_session = session_service.get_experiment_session(
            db_session,
            current_user=current_user,
            session_id=session_id,
        )
        return _to_response(experiment_session)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


def _to_response(experiment_session) -> ExperimentSessionResponse:
    experiment_session.stage_records = sorted(
        experiment_session.stage_records,
        key=lambda stage_record: stage_record.stage_order,
    )
    return ExperimentSessionResponse.model_validate(experiment_session)
