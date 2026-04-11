from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# --- Group moment ---


class GroupParticipantSeed(BaseModel):
    """Participant at group creation (invite or link profile)."""

    display_name: str = Field(max_length=120)
    user_id: str | None = Field(default=None, max_length=128)
    role: str = Field(default="member", max_length=16)
    invite_email: str | None = Field(default=None, max_length=255)


class GroupMomentCreate(BaseModel):
    title: str = Field(max_length=255)
    group_type: str = Field(max_length=32)
    duration_type: str | None = Field(default=None, max_length=16)
    cycle_type: str | None = Field(default=None, max_length=16)
    funding_model: str | None = Field(default=None, max_length=24)
    split_rule_type: str | None = Field(default=None, max_length=24)
    target_amount: Decimal | None = None
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = None
    status: str = Field(default="active", max_length=16)
    participants: list[GroupParticipantSeed] = Field(default_factory=list)


class GroupMomentUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    group_type: str | None = Field(default=None, max_length=32)
    duration_type: str | None = Field(default=None, max_length=16)
    cycle_type: str | None = Field(default=None, max_length=16)
    funding_model: str | None = Field(default=None, max_length=24)
    split_rule_type: str | None = Field(default=None, max_length=24)
    target_amount: Decimal | None = None
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = None
    status: str | None = Field(default=None, max_length=16)


class GroupMomentSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    group_id: UUID
    created_by: str
    title: str
    group_type: str
    duration_type: str
    cycle_type: str
    funding_model: str
    split_rule_type: str
    target_amount: Decimal | None
    start_date: date | None
    end_date: date | None
    status: str
    created_at: str | None = None
    updated_at: str | None = None


class GroupSummaryBlock(BaseModel):
    """Computed snapshot for UI."""

    collected_amount: Decimal
    target_amount: Decimal | None
    pending_commitment_count: int
    overdue_commitment_count: int
    open_share_debt: Decimal


class GroupMomentDetailOut(GroupMomentSummaryOut):
    summary: GroupSummaryBlock
    participants: list["GroupParticipantOut"] = Field(default_factory=list)
    cycles: list["GroupCycleOut"] = Field(default_factory=list)
    active_cycle: "GroupCycleOut | None" = None


# --- Participants ---


class GroupParticipantCreate(BaseModel):
    display_name: str = Field(max_length=120)
    user_id: str | None = Field(default=None, max_length=128)
    role: str = Field(default="member", max_length=16)
    invite_email: str | None = Field(default=None, max_length=255)


class GroupParticipantUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    role: str | None = Field(default=None, max_length=16)
    status: str | None = Field(default=None, max_length=16)
    invite_email: str | None = Field(default=None, max_length=255)


class GroupParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    participant_id: UUID
    group_id: UUID
    user_id: str | None
    display_name: str
    role: str
    status: str
    joined_at: str | None = None
    created_at: str | None = None
    invite_email: str | None = None
    invite_sent_at: str | None = None


class GroupInvitePreviewOut(BaseModel):
    group_id: UUID
    group_title: str
    display_name: str


class GroupInviteSendBody(BaseModel):
    invite_email: str | None = Field(default=None, max_length=255)


class GroupInviteSendOut(BaseModel):
    join_url: str
    email_sent: bool
    message: str | None = None


class GroupInviteAcceptBody(BaseModel):
    token: str = Field(min_length=8, max_length=256)


class GroupInviteAcceptOut(BaseModel):
    group_id: UUID


# --- Cycles ---


class GroupCycleCreate(BaseModel):
    label: str = Field(max_length=80)
    start_date: date
    end_date: date
    target_amount: Decimal = Field(default=Decimal("0"))
    status: str = Field(default="active", max_length=16)


class GroupCycleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cycle_id: UUID
    group_id: UUID
    label: str
    start_date: date
    end_date: date
    target_amount: Decimal
    collected_amount: Decimal
    status: str
    created_at: str | None = None


# --- Commitments ---


class CommitmentLineCreate(BaseModel):
    participant_id: UUID
    committed_amount: Decimal
    due_date: date | None = None


class GroupCommitmentsBulkCreate(BaseModel):
    cycle_id: UUID | None = None
    equal_split_total: Decimal | None = None
    lines: list[CommitmentLineCreate] = Field(default_factory=list)
    due_date: date | None = None


class GroupCommitmentUpdate(BaseModel):
    committed_amount: Decimal | None = None
    due_date: date | None = None
    status: str | None = Field(default=None, max_length=16)


class GroupCommitmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    commitment_id: UUID
    group_id: UUID
    cycle_id: UUID | None
    participant_id: UUID
    committed_amount: Decimal
    paid_amount: Decimal
    due_date: date | None
    status: str
    created_at: str | None = None
    updated_at: str | None = None
    commitment_type: str = "planned"
    source: str = "auto_seeded"
    expense_id: UUID | None = None


class PayCommitmentBody(BaseModel):
    amount: Decimal


# --- Expenses & shares ---


class ExpenseShareLine(BaseModel):
    participant_id: UUID
    owed_amount: Decimal


class GroupExpenseCreate(BaseModel):
    title: str = Field(max_length=255)
    amount: Decimal
    paid_by_participant_id: UUID
    category: str | None = Field(default=None, max_length=80)
    description: str | None = None
    expense_date: date
    cycle_id: UUID | None = None
    split_rule: str = Field(default="equal", max_length=24)  # equal | custom_amounts | percentages
    shares: list[ExpenseShareLine] = Field(default_factory=list)


class GroupExpenseShareOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    share_id: UUID
    expense_id: UUID
    participant_id: UUID
    owed_amount: Decimal
    settled_amount: Decimal
    status: str
    created_at: str | None = None


class GroupExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    expense_id: UUID
    group_id: UUID
    cycle_id: UUID | None
    title: str
    amount: Decimal
    paid_by_participant_id: UUID
    category: str | None
    description: str | None
    expense_date: date
    created_at: str | None = None
    source_recurring_id: UUID | None = None
    shares: list[GroupExpenseShareOut] = Field(default_factory=list)


class GroupRecurringExpenseCreate(BaseModel):
    title: str = Field(max_length=255)
    amount: Decimal
    paid_by_participant_id: UUID
    category: str | None = Field(default=None, max_length=80)
    description: str | None = None
    split_rule: str = Field(default="equal", max_length=24)
    shares: list[ExpenseShareLine] = Field(default_factory=list)
    is_active: bool = True


class GroupRecurringExpenseUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    amount: Decimal | None = None
    paid_by_participant_id: UUID | None = None
    category: str | None = Field(default=None, max_length=80)
    description: str | None = None
    split_rule: str | None = Field(default=None, max_length=24)
    shares: list[ExpenseShareLine] | None = None
    is_active: bool | None = None


class GroupRecurringExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    recurring_id: UUID
    group_id: UUID
    title: str
    amount: Decimal
    paid_by_participant_id: UUID
    category: str | None
    description: str | None
    split_rule: str
    shares: list[ExpenseShareLine] = Field(default_factory=list)
    is_active: bool
    created_at: str | None = None
    updated_at: str | None = None


class GroupRecurringApplyBody(BaseModel):
    cycle_id: UUID | None = None


class GroupRecurringApplyOut(BaseModel):
    created_count: int
    skipped_count: int


# --- Settlements ---


class GroupSettlementCreate(BaseModel):
    from_participant_id: UUID
    to_participant_id: UUID
    amount: Decimal
    cycle_id: UUID | None = None


class GroupSettlementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    settlement_id: UUID
    group_id: UUID
    cycle_id: UUID | None
    from_participant_id: UUID
    to_participant_id: UUID
    amount: Decimal
    status: str
    settled_at: str | None = None
    created_at: str | None = None


# --- Reminders (stub) ---


class GroupReminderCreate(BaseModel):
    participant_id: UUID
    reminder_type: str = Field(max_length=32)
    message: str
    cycle_id: UUID | None = None


class GroupReminderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    reminder_id: UUID
    group_id: UUID
    cycle_id: UUID | None
    participant_id: UUID
    reminder_type: str
    message: str
    sent_by: str | None
    sent_at: str | None
    created_at: str | None = None


# --- Activity & signals ---


class GroupActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    activity_id: UUID
    group_id: UUID
    cycle_id: UUID | None
    actor_id: str | None
    event_type: str
    message: str
    created_at: str | None = None


class GroupSignalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    signal_id: UUID
    group_id: UUID
    cycle_id: UUID | None
    signal_type: str
    severity: str
    title: str | None = None
    message: str
    action_type: str | None = None
    action_target_type: str | None = None
    action_target_id: UUID | None = None
    resolved: bool
    created_at: str | None = None


class PendingCommitmentHomeRow(BaseModel):
    commitment_id: UUID
    group_id: UUID
    group_title: str
    participant_id: UUID
    display_name: str
    committed_amount: Decimal
    paid_amount: Decimal
    due_date: date | None
    status: str


class GroupHomeOut(BaseModel):
    trigger_message: str
    trigger_severity: str | None
    active_group_count: int
    pending_commitment_count: int
    overdue_commitment_count: int
    groups: list[GroupMomentSummaryOut]
    pending_commitments: list[PendingCommitmentHomeRow]
    recent_activity: list[GroupActivityOut]
    top_signals: list[GroupSignalOut]


# --- Positions ---


class GroupPositionOut(BaseModel):
    participant_id: UUID
    display_name: str
    planned_commitment: Decimal
    paid_contribution: Decimal
    net_position: Decimal


# Resolve forward refs
GroupMomentDetailOut.model_rebuild()
