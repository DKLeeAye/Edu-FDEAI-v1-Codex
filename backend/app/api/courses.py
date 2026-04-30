from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.schemas.courses import CourseCreateRequest, CourseResponse
from app.services import courses as course_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

router = APIRouter(prefix=f"{settings.api_v1_prefix}/courses", tags=["courses"])


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreateRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> CourseResponse:
    try:
        return course_service.create_course(
            db_session,
            current_user=current_user,
            title=payload.title,
            code=payload.code,
            package_version_id=payload.package_version_id,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("", response_model=list[CourseResponse])
def list_courses(
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> list[CourseResponse]:
    return course_service.list_courses(db_session, current_user=current_user)


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: uuid.UUID,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> CourseResponse:
    try:
        return course_service.get_course(db_session, current_user=current_user, course_id=course_id)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
