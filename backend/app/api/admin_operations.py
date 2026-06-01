from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.schemas.admin_operations import (
    AdminAccessGrantRevokeRequest,
    AdminDeploymentInstance,
    AdminDeploymentStatusUpdateRequest,
    AdminLicenseEntitlement,
    AdminLicenseEntitlementUpsertRequest,
    AdminOperationsAccessGrant,
    AdminOperationsOverviewResponse,
)
from app.services import admin_operations as admin_operations_service
from app.services.auth import CurrentUserContext
from app.services.errors import PermissionDeniedError, ResourceNotFoundError

router = APIRouter(prefix=f"{settings.api_v1_prefix}/admin/operations", tags=["admin-operations"])


@router.get("/overview", response_model=AdminOperationsOverviewResponse)
def get_admin_operations_overview(
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> AdminOperationsOverviewResponse:
    try:
        return admin_operations_service.get_admin_operations_overview(
            db_session,
            current_user=current_user,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/license-entitlements", response_model=AdminLicenseEntitlement)
def upsert_admin_license_entitlement(
    payload: AdminLicenseEntitlementUpsertRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> AdminLicenseEntitlement:
    try:
        return admin_operations_service.upsert_license_entitlement(
            db_session,
            current_user=current_user,
            payload=payload,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post(
    "/deployment-instances/{deployment_instance_id}/status",
    response_model=AdminDeploymentInstance,
)
def update_admin_deployment_instance_status(
    deployment_instance_id: uuid.UUID,
    payload: AdminDeploymentStatusUpdateRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> AdminDeploymentInstance:
    try:
        return admin_operations_service.update_deployment_instance_status(
            db_session,
            current_user=current_user,
            deployment_instance_id=deployment_instance_id,
            payload=payload,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/access-grants/{grant_id}/revoke",
    response_model=AdminOperationsAccessGrant,
)
def revoke_admin_operations_access_grant(
    grant_id: uuid.UUID,
    payload: AdminAccessGrantRevokeRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> AdminOperationsAccessGrant:
    try:
        return admin_operations_service.revoke_operations_access_grant(
            db_session,
            current_user=current_user,
            grant_id=grant_id,
            payload=payload,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
