from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


SeverityLevel = Literal["LOW", "MEDIUM", "HIGH"]
HealthState = Literal["ON_TRACK", "SLIGHTLY_BEHIND", "NEEDS_ATTENTION"]
DailyStatus = Literal["stable", "needs_attention", "quiet"]


class GroupIntelligenceSignalOut(BaseModel):
    """UI-ready signal (severity normalized to uppercase)."""

    model_config = ConfigDict(from_attributes=True)

    signal_id: UUID | None = None
    group_id: UUID
    group_title: str | None = None
    cycle_id: UUID | None = None
    signal_type: str
    severity: SeverityLevel
    title: str
    message: str
    action_type: str
    action_target_type: str
    action_target_id: UUID | None = None
    resolved: bool = False
    created_at: datetime | str | None = None


class GroupIntelligenceRecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    recommendation_id: UUID | None = None
    group_id: UUID
    group_title: str | None = None
    cycle_id: UUID | None = None
    recommendation_type: str
    priority: int = Field(ge=1, le=5)
    title: str
    message: str
    action_type: str
    action_target_type: str
    action_target_id: UUID | None = None
    created_at: datetime | str | None = None


class GroupIntelligenceSummaryOut(BaseModel):
    active_group_count: int
    pooled_target_sum: Decimal | None
    pending_commitment_count: int
    overdue_commitment_count: int
    open_commitment_balance: Decimal
    open_share_debt_total: Decimal
    supporting_line: str | None = None


class GroupNudgeOut(BaseModel):
    commitment_id: UUID
    group_id: UUID
    group_title: str
    participant_id: UUID
    display_name: str
    committed_amount: Decimal
    paid_amount: Decimal
    amount_remaining: Decimal
    due_date: date | None
    status: str
    overdue_days: int
    cycle_label: str | None = None
    recommended_action_type: str
    recommended_cta: str


class GroupHealthRowOut(BaseModel):
    group_id: UUID
    title: str
    group_type: str
    duration_type: str
    funding_model: str
    cycle_id: UUID | None
    cycle_label: str | None
    health_state: HealthState
    pending_count: int
    overdue_count: int
    open_commitment_balance: Decimal
    open_share_debt: Decimal
    funding_pct: float | None = None
    story: str


class GroupTodayCardOut(BaseModel):
    id: str
    headline: str
    severity: Literal["calm", "low", "medium", "high"]
    cta_label: str
    group_id: UUID | None = None
    href_hint: str | None = None


class GroupHomeTodayOut(BaseModel):
    daily_status: DailyStatus
    daily_status_label: str
    top_cards: list[GroupTodayCardOut]
    payments_today_count: int
    reminders_today_count: int
    new_expenses_today_count: int
    new_groups_today_count: int
    week_activity_delta: int | None = None
    most_active_group_id: UUID | None = None
    most_active_group_title: str | None = None


class GroupMovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    activity_id: UUID
    group_id: UUID
    group_title: str | None = None
    cycle_id: UUID | None
    actor_id: str | None
    event_type: str
    message: str
    created_at: str | None = None
    is_today_utc: bool = False


class GroupCycleStatusOut(BaseModel):
    group_id: UUID
    current_cycle_id: UUID | None
    current_cycle_label: str | None
    cycle_start: date | None
    cycle_end: date | None
    days_remaining: int | None
    target_amount: Decimal | None
    collected_amount: Decimal | None
    funding_pct: float | None
    next_cycle_starts_in_days: int | None
    next_cycle_hint: str | None
    carry_over_amount: Decimal | None
    unsettled_expense_balance: Decimal


class GroupSummarySnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    snapshot_id: UUID
    group_id: UUID
    cycle_id: UUID | None
    date_key: date
    target_amount: Decimal | None
    committed_amount: Decimal
    paid_amount: Decimal
    pending_count: int
    overdue_count: int
    open_balance: Decimal
    health_state: str
    created_at: str | None = None


class GroupParticipantSnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    snapshot_id: UUID
    group_id: UUID
    cycle_id: UUID | None
    participant_id: UUID
    date_key: date
    committed_amount: Decimal
    paid_amount: Decimal
    remaining_amount: Decimal
    status: str
    created_at: str | None = None
