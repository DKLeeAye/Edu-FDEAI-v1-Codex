from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.schemas.learning_profile import LearningProfileResponse
from app.services import learning_profile as learning_profile_service
from app.services.auth import CurrentUserContext
from app.services.errors import PermissionDeniedError, ResourceNotFoundError

router = APIRouter(prefix=f"{settings.api_v1_prefix}/learning-profiles", tags=["learning-profiles"])


@router.get("/sessions/{session_id}", response_model=LearningProfileResponse)
def get_learning_profile(
    session_id: uuid.UUID,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> LearningProfileResponse:
    try:
        return learning_profile_service.get_learning_profile(
            db_session,
            current_user=current_user,
            session_id=session_id,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
