from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BusinessWorkspaceCreate(BaseModel):
    title: str = Field(max_length=255)
    business_type: str = Field(max_length=64)
    total_budget: Decimal | None = None
    currency: str = Field(default="INR", max_length=8)
    status: str = Field(default="active", max_length=16)


class BusinessWorkspaceUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    business_type: str | None = Field(default=None, max_length=64)
    total_budget: Decimal | None = None
    currency: str | None = Field(default=None, max_length=8)
    status: str | None = Field(default=None, max_length=16)


class BusinessWorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    workspace_id: UUID
    title: str
    business_type: str
    total_budget: Decimal | None
    currency: str
    created_by: str
    status: str
    created_at: str | None = None
    updated_at: str | None = None


class BusinessUnitCreate(BaseModel):
    name: str = Field(max_length=160)
    unit_type: str = Field(max_length=32)
    location: str | None = Field(default=None, max_length=255)
    manager_user_id: str | None = Field(default=None, max_length=128)
    budget_limit: Decimal | None = None
    status: str = Field(default="active", max_length=16)


class BusinessUnitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    unit_id: UUID
    workspace_id: UUID
    name: str
    unit_type: str
    location: str | None
    manager_user_id: str | None
    budget_limit: Decimal | None
    status: str
    created_at: str | None = None


class BusinessMemberCreate(BaseModel):
    user_id: str = Field(max_length=128)
    role: str = Field(max_length=24)
    unit_id: UUID | None = None


class BusinessMemberUpdate(BaseModel):
    role: str | None = Field(default=None, max_length=24)
    unit_id: UUID | None = None


class BusinessMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    member_id: UUID
    workspace_id: UUID
    user_id: str
    role: str
    unit_id: UUID | None
    created_at: str | None = None


class BusinessInviteSendBody(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    role: str = Field(max_length=24)
    unit_id: UUID | None = None


class BusinessInviteSendOut(BaseModel):
    invite_id: UUID
    workspace_id: UUID
    email: str
    role: str
    unit_id: UUID | None = None
    token: str | None = None
    join_url: str
    sent: bool
    message: str | None = None
    created_at: str | None = None


class BusinessInvitePreviewOut(BaseModel):
    workspace_id: UUID
    workspace_title: str
    email: str
    role: str
    unit_id: UUID | None = None
    unit_name: str | None = None


class BusinessInviteAcceptBody(BaseModel):
    token: str = Field(min_length=8, max_length=255)


class BusinessInviteAcceptOut(BaseModel):
    workspace_id: UUID
    member_id: UUID
    role: str
    unit_id: UUID | None = None


class BusinessInviteOut(BaseModel):
    invite_id: UUID
    workspace_id: UUID
    email: str
    role: str
    unit_id: UUID | None = None
    accepted_at: str | None = None
    expires_at: str | None = None
    created_at: str | None = None


class BusinessCostCenterCreate(BaseModel):
    name: str = Field(max_length=160)
    budget_limit: Decimal | None = None


class BusinessCostCenterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cost_center_id: UUID
    workspace_id: UUID
    name: str
    budget_limit: Decimal | None
    created_at: str | None = None


class BusinessVendorCreate(BaseModel):
    name: str = Field(max_length=200)
    vendor_type: str = Field(max_length=64)
    contact_info: str | None = None


class BusinessVendorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    vendor_id: UUID
    workspace_id: UUID
    name: str
    vendor_type: str
    contact_info: str | None
    created_at: str | None = None


class BusinessSpendCreate(BaseModel):
    unit_id: UUID
    title: str = Field(max_length=255)
    amount: Decimal | None = None
    price_per_unit: Decimal | None = None
    quantity: Decimal | None = None
    measurement_unit: str | None = Field(default=None, max_length=32)
    spend_type: str = Field(default="operational", max_length=64)
    cost_center_id: UUID | None = None
    vendor_id: UUID | None = None


class BusinessSpendOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    spend_id: UUID
    workspace_id: UUID
    unit_id: UUID
    title: str
    amount: Decimal
    price_per_unit: Decimal | None = None
    quantity: Decimal | None = None
    measurement_unit: str | None = None
    spend_type: str
    cost_center_id: UUID | None
    vendor_id: UUID | None
    status: str
    submitted_by: str
    approved_by: str | None
    submitted_at: str | None = None
    approved_at: str | None = None
    rejection_reason: str | None = None
    created_at: str | None = None


class BusinessRejectBody(BaseModel):
    reason: str = Field(min_length=1, max_length=2000)


class BusinessSignalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    signal_id: UUID
    workspace_id: UUID
    unit_id: UUID | None
    signal_type: str
    severity: str
    title: str | None = None
    message: str
    action_type: str | None = None
    action_target_type: str | None = None
    action_target_id: str | None = None
    resolved: bool
    created_at: str | None = None


class BusinessRecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    recommendation_id: UUID | None = None
    workspace_id: UUID
    recommendation_type: str
    priority: int
    title: str
    message: str
    action_type: str
    action_target_type: str
    action_target_id: str | None = None
    created_at: str | None = None


class BusinessControlSummaryOut(BaseModel):
    total_budget: Decimal | None
    approved_spend: Decimal
    pending_spend: Decimal
    remaining_budget: Decimal | None
    approvals_count: int
    control_score: int | None = None
    control_label: str


class BusinessTodayCardOut(BaseModel):
    signal_type: str
    severity: str
    title: str
    message: str
    action_type: str
    action_target_type: str
    action_target_id: str | None = None


class BusinessTodayOut(BaseModel):
    top_cards: list[BusinessTodayCardOut] = Field(default_factory=list)
    spend_today_amount: Decimal
    spends_submitted_today: int
    approvals_handled_today: int
    daily_status: str
    daily_status_label: str


class BusinessUnitPerformanceOut(BaseModel):
    key: str
    label: str
    unit_type: str | None = None
    amount: Decimal
    pending_amount: Decimal | None = None
    budget_limit: Decimal | None = None
    utilization_ratio: float | None = None
    utilization_pct: float | None = None
    performance_state: str


class BusinessUnitPerformanceResponseOut(BaseModel):
    rows: list[BusinessUnitPerformanceOut] = Field(default_factory=list)
    top_unit_id: str | None = None
    top_unit_label: str | None = None
    at_risk_unit_id: str | None = None
    at_risk_unit_label: str | None = None


class BusinessCostCenterBreakdownOut(BaseModel):
    key: str
    label: str
    amount: Decimal
    pending_amount: Decimal | None = None
    budget_limit: Decimal | None = None
    utilization_ratio: float | None = None
    utilization_pct: float | None = None
    state: str


class BusinessInsightsOut(BaseModel):
    trend_weekly_pct: float | None = None
    trend_weekly_label: str
    spend_today_amount: Decimal
    top_unit_week_label: str | None = None
    top_vendor_week_label: str | None = None
    top_vendor_week_share_pct: float | None = None
    monthly_budget_usage_pct: float | None = None
    monthly_approvals_count: int
    chips: list[str] = Field(default_factory=list)


class BusinessActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    activity_id: UUID
    workspace_id: UUID
    unit_id: UUID | None
    spend_id: UUID | None
    actor_id: str | None
    event_type: str
    message: str
    created_at: str | None = None


class BusinessSummaryOut(BaseModel):
    total_budget: Decimal | None
    total_spent: Decimal
    pending_amount: Decimal
    remaining: Decimal | None


class BusinessBreakdownRowOut(BaseModel):
    key: str
    label: str
    amount: Decimal
    budget_limit: Decimal | None = None
    utilization_ratio: float | None = None


class BusinessDashboardOut(BaseModel):
    summary: BusinessSummaryOut
    pending_approvals: list[BusinessSpendOut] = Field(default_factory=list)
    approved_spends: list[BusinessSpendOut] = Field(default_factory=list)
    cost_center_breakdown: list[BusinessBreakdownRowOut] = Field(default_factory=list)
    unit_breakdown: list[BusinessBreakdownRowOut] = Field(default_factory=list)
    signals: list[BusinessSignalOut] = Field(default_factory=list)
    activity: list[BusinessActivityOut] = Field(default_factory=list)

