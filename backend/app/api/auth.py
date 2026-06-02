from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import get_session
from app.schemas.auth import CurrentUserResponse, LoginRequest, TokenResponse
from app.schemas.invites import RegisterWithInviteRequest
from app.services.auth import CurrentUserContext, authenticate_user
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError
from app.services.invites import register_with_invite

router = APIRouter(prefix=f"{settings.api_v1_prefix}/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, session: Session = Depends(get_session)) -> TokenResponse:
    user = authenticate_user(session, email=payload.email, password=payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(
        access_token=create_access_token(
            user_id=user.id,
            tenant_id=user.tenant_id,
            institution_id=user.institution_id,
            role=user.role,
        )
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterWithInviteRequest,
    session: Session = Depends(get_session),
) -> TokenResponse:
    try:
        user = register_with_invite(
            session,
            invite_code=payload.invite_code,
            email=payload.email,
            full_name=payload.full_name,
            password=payload.password,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return TokenResponse(
        access_token=create_access_token(
            user_id=user.id,
            tenant_id=user.tenant_id,
            institution_id=user.institution_id,
            role=user.role,
        )
    )


@router.get("/me", response_model=CurrentUserResponse)
def read_current_user(
    current_user: CurrentUserContext = Depends(get_current_user),
) -> CurrentUserResponse:
    return CurrentUserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        tenant_id=current_user.tenant_id,
        institution_id=current_user.institution_id,
        role=current_user.role,
    )
