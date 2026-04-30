from __future__ import annotations


class ServiceError(Exception):
    """Base error for application service-layer failures."""


class PermissionDeniedError(ServiceError):
    """Raised when the current user role cannot perform an action."""


class ResourceNotFoundError(ServiceError):
    """Raised when a resource does not exist in the current user's scope."""


class ConflictError(ServiceError):
    """Raised when a request conflicts with existing scoped data."""
