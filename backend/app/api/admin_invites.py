from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.schemas.invites import (
    RegistrationInviteCreateRequest,
    RegistrationInviteCreateResponse,
    RegistrationInviteResponse,
)
from app.services import invites as invite_service
from app.services.auth import CurrentUserContext
from app.services.errors import PermissionDeniedError, ResourceNotFoundError

router = APIRouter(prefix=f"{settings.api_v1_prefix}/admin/invites", tags=["admin-invites"])


@router.post("", response_model=RegistrationInviteCreateResponse, status_code=status.HTTP_201_CREATED)
def create_registration_invite(
    payload: RegistrationInviteCreateRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> RegistrationInviteCreateResponse:
    try:
        invite, invite_code = invite_service.create_registration_invite(
            db_session,
            current_user=current_user,
            payload=payload,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    base = RegistrationInviteResponse.model_validate(invite, from_attributes=True)
    return RegistrationInviteCreateResponse(**base.model_dump(), invite_code=invite_code)


@router.get("", response_model=list[RegistrationInviteResponse])
def list_registration_invites(
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> list[RegistrationInviteResponse]:
    try:
        return invite_service.list_registration_invites(
            db_session,
            current_user=current_user,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/{invite_id}/revoke", response_model=RegistrationInviteResponse)
def revoke_registration_invite(
    invite_id: uuid.UUID,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> RegistrationInviteResponse:
    try:
        return invite_service.revoke_registration_invite(
            db_session,
            current_user=current_user,
            invite_id=invite_id,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
