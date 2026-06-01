from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AdminScopeSummary(BaseModel):
    id: uuid.UUID
    name: str


class AdminDeploymentInstance(BaseModel):
    id: str
    name: str
    environment: Literal["local", "staging", "production"]
    status: Literal["running", "idle"]
    courses_count: int
    sessions_count: int
    active_users_count: int
    package_versions_count: int
    last_activity_at: datetime | None


class AdminLicenseEntitlement(BaseModel):
    key: str
    label: str
    status: Literal["active", "unused"]
    used: int
    limit: int | None
    unit: str
    source: str


class AdminLicenseEntitlementUpsertRequest(BaseModel):
    entitlement_key: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=120)
    limit_value: int | None = Field(default=None, ge=0)
    unit: str = Field(min_length=1, max_length=40)
    status: Literal["active", "inactive"] = "active"


class AdminDeploymentStatusUpdateRequest(BaseModel):
    status: Literal["running", "maintenance", "idle"]
    last_health_check_now: bool = False


class AdminAccessGrantRevokeRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class AdminAiUsageByType(BaseModel):
    usage_type: str
    call_count: int
    failed_count: int
    total_tokens: int


class AdminAiUsageSummary(BaseModel):
    total_calls: int
    succeeded_calls: int
    failed_calls: int
    total_tokens: int
    average_latency_ms: int | None
    by_usage_type: list[AdminAiUsageByType]


class AdminDataExportItem(BaseModel):
    key: str
    label: str
    status: Literal["ready", "empty"]
    record_count: int
    last_updated_at: datetime | None


class AdminOperationsAccessGrant(BaseModel):
    id: uuid.UUID
    deployment_instance_id: uuid.UUID
    status: str
    reason: str
    scope: dict[str, object]
    starts_at: datetime | None
    expires_at: datetime | None
    created_at: datetime


class AdminOperationsOverviewResponse(BaseModel):
    tenant: AdminScopeSummary
    institution: AdminScopeSummary
    deployment_instances: list[AdminDeploymentInstance]
    license_entitlements: list[AdminLicenseEntitlement]
    operations_access_grants: list[AdminOperationsAccessGrant]
    ai_usage: AdminAiUsageSummary
    data_exports: list[AdminDataExportItem]
