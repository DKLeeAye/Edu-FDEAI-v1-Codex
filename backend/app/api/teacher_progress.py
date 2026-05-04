from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.schemas.teacher_progress import (
    TeacherArtifactSummaryResponse,
    TeacherCourseProgressResponse,
)
from app.services import teacher_progress as teacher_progress_service
from app.services.auth import CurrentUserContext
from app.services.errors import PermissionDeniedError, ResourceNotFoundError

router = APIRouter(prefix=f"{settings.api_v1_prefix}/teacher/progress", tags=["teacher-progress"])


@router.get("/courses", response_model=list[TeacherCourseProgressResponse])
def list_teacher_course_progress(
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> list[TeacherCourseProgressResponse]:
    try:
        return teacher_progress_service.list_teacher_course_progress(
            db_session,
            current_user=current_user,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get(
    "/sessions/{session_id}/stages/{stage_key}/artifacts",
    response_model=list[TeacherArtifactSummaryResponse],
)
def list_teacher_stage_artifact_summaries(
    session_id: uuid.UUID,
    stage_key: str,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> list[TeacherArtifactSummaryResponse]:
    try:
        return teacher_progress_service.list_teacher_stage_artifact_summaries(
            db_session,
            current_user=current_user,
            session_id=session_id,
            stage_key=stage_key,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
