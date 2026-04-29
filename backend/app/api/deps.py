from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import InvalidTokenError, decode_access_token
from app.db.session import get_session
from app.services.auth import CurrentUserContext, get_active_user_for_token

bearer_scheme = HTTPBearer(auto_error=False)


def authentication_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> CurrentUserContext:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise authentication_exception()

    try:
        claims = decode_access_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise authentication_exception() from exc

    user = get_active_user_for_token(session, claims)
    if user is None:
        raise authentication_exception()

    return CurrentUserContext.from_user(user)
