from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.config import settings
from app.models.enums import UserRole

PASSWORD_HASH_ALGORITHM = "pbkdf2_sha256"
PASSWORD_HASH_ITERATIONS = 390_000
PASSWORD_SALT_BYTES = 16
JWT_ALGORITHM = "HS256"


class InvalidTokenError(Exception):
    """Raised when a bearer token cannot be trusted."""


@dataclass(frozen=True)
class AccessTokenClaims:
    user_id: uuid.UUID
    tenant_id: uuid.UUID
    institution_id: uuid.UUID
    role: UserRole
    expires_at: datetime


def _base64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _base64url_decode(encoded: str) -> bytes:
    padding = "=" * (-len(encoded) % 4)
    return base64.urlsafe_b64decode(f"{encoded}{padding}")


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(PASSWORD_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_HASH_ITERATIONS,
    )
    return "$".join(
        [
            PASSWORD_HASH_ALGORITHM,
            str(PASSWORD_HASH_ITERATIONS),
            _base64url_encode(salt),
            _base64url_encode(digest),
        ]
    )


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt_text, digest_text = password_hash.split("$", maxsplit=3)
        if algorithm != PASSWORD_HASH_ALGORITHM:
            return False
        iterations = int(iterations_text)
        salt = _base64url_decode(salt_text)
        expected_digest = _base64url_decode(digest_text)
    except (ValueError, TypeError):
        return False

    actual_digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(actual_digest, expected_digest)


def create_access_token(
    *,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    institution_id: uuid.UUID,
    role: UserRole,
) -> str:
    issued_at = datetime.now(UTC)
    expires_at = issued_at + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "institution_id": str(institution_id),
        "role": role.value,
        "iat": int(issued_at.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    signing_input = ".".join(
        [
            _json_to_base64url(header),
            _json_to_base64url(payload),
        ]
    )
    signature = _sign(signing_input)
    return f"{signing_input}.{_base64url_encode(signature)}"


def decode_access_token(token: str) -> AccessTokenClaims:
    try:
        header_text, payload_text, signature_text = token.split(".", maxsplit=2)
    except ValueError as exc:
        raise InvalidTokenError("Token must contain header, payload, and signature") from exc

    signing_input = f"{header_text}.{payload_text}"
    expected_signature = _sign(signing_input)
    try:
        supplied_signature = _base64url_decode(signature_text)
    except ValueError as exc:
        raise InvalidTokenError("Token signature is not valid base64url") from exc
    if not hmac.compare_digest(supplied_signature, expected_signature):
        raise InvalidTokenError("Token signature mismatch")

    header = _base64url_json_to_dict(header_text)
    if header.get("alg") != JWT_ALGORITHM:
        raise InvalidTokenError("Unsupported token algorithm")

    payload = _base64url_json_to_dict(payload_text)
    return _claims_from_payload(payload)


def _json_to_base64url(value: dict[str, Any]) -> str:
    raw = json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return _base64url_encode(raw)


def _base64url_json_to_dict(encoded: str) -> dict[str, Any]:
    try:
        decoded = _base64url_decode(encoded)
        value = json.loads(decoded)
    except (ValueError, json.JSONDecodeError) as exc:
        raise InvalidTokenError("Token segment is not valid JSON") from exc
    if not isinstance(value, dict):
        raise InvalidTokenError("Token segment must be a JSON object")
    return value


def _sign(signing_input: str) -> bytes:
    return hmac.new(
        settings.jwt_secret_key.encode("utf-8"),
        signing_input.encode("ascii"),
        hashlib.sha256,
    ).digest()


def _claims_from_payload(payload: dict[str, Any]) -> AccessTokenClaims:
    try:
        expires_at = datetime.fromtimestamp(int(payload["exp"]), UTC)
        if datetime.now(UTC) >= expires_at:
            raise InvalidTokenError("Token has expired")
        return AccessTokenClaims(
            user_id=uuid.UUID(str(payload["sub"])),
            tenant_id=uuid.UUID(str(payload["tenant_id"])),
            institution_id=uuid.UUID(str(payload["institution_id"])),
            role=UserRole(str(payload["role"])),
            expires_at=expires_at,
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise InvalidTokenError("Token payload is missing required claims") from exc
