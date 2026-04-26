from __future__ import annotations

import base64
import hashlib
import json
import os
import threading
from contextlib import contextmanager
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from collections import defaultdict
from typing import Any, Literal, Sequence
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request
from uuid import uuid4

import firebase_admin
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, Header, HTTPException, Query, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    create_engine,
    desc,
    func,
    nullslast,
    or_,
    select,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

load_dotenv()

# Serialize Firebase Admin default-app init — concurrent /api/auth/exchange calls race otherwise.
_firebase_init_lock = threading.Lock()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./momentra.db")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
FIREBASE_AUTH_DISABLED = os.getenv("FIREBASE_AUTH_DISABLED", "false").lower() == "true"
PUBLIC_APP_BASE_URL = (
    os.getenv("PUBLIC_APP_BASE_URL")
    or os.getenv("MOMENTRA_APP_INVITE_BASE_URL")
    or "https://momentra.app"
).rstrip("/")
MOMENTRA_UPLOAD_DIR = Path(os.getenv("MOMENTRA_UPLOAD_DIR", str(Path.cwd() / "uploads")))


def _env_strip(val: str | None) -> str | None:
    if val is None:
        return None
    s = val.strip().strip('"').strip("'")
    return s if s else None


RESEND_API_KEY = _env_strip(os.getenv("RESEND_API_KEY") or os.getenv("MOMENTRA_RESEND_API_KEY"))
RESEND_FROM_EMAIL = (
    _env_strip(os.getenv("RESEND_FROM_EMAIL") or os.getenv("MOMENTRA_RESEND_FROM"))
    or "Momentra <no-reply@momentra.app>"
)

engine = create_engine(
    DATABASE_URL,
    future=True,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)


class Base(DeclarativeBase):
    pass


class AppUser(Base):
    __tablename__ = "app_users"

    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    upi_or_phone: Mapped[str | None] = mapped_column(String(128), nullable=True)
    primary_use: Mapped[str | None] = mapped_column(String(32), nullable=True)
    primary_focus: Mapped[str | None] = mapped_column(String(32), nullable=True)
    default_currency: Mapped[str | None] = mapped_column(String(16), nullable=True)
    organization_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    setup_completed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    last_sign_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PersonalMoment(Base):
    __tablename__ = "personal_moments"

    moment_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    title: Mapped[str] = mapped_column(String(200))
    moment_type: Mapped[str] = mapped_column(String(64))
    duration_type: Mapped[str] = mapped_column(String(64))
    target_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    saving_mode: Mapped[str | None] = mapped_column(String(32), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    milestones_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="active")
    is_private_moment: Mapped[bool] = mapped_column(Boolean, default=True)
    weekly_reminders: Mapped[bool] = mapped_column(Boolean, default=True)
    milestone_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    low_velocity_warning: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_archive_on_complete: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_via_push: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_via_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)
    notify_via_email: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class PersonalAccount(Base):
    __tablename__ = "personal_accounts"

    account_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    name: Mapped[str] = mapped_column(String(120))
    account_type: Mapped[str] = mapped_column(String(32), default="cash")
    icon_emoji: Mapped[str | None] = mapped_column(String(16), nullable=True)
    color_hex: Mapped[str | None] = mapped_column(String(9), nullable=True)
    balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0"),
        server_default="0",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class PersonalBudget(Base):
    __tablename__ = "personal_budgets"

    budget_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    month_key: Mapped[str] = mapped_column(String(7), index=True)  # YYYY-MM
    cap_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0"),
        server_default="0",
    )
    spent_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0"),
        server_default="0",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class PersonalTransaction(Base):
    __tablename__ = "personal_transactions"

    transaction_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    account_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    account_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    kind: Mapped[str] = mapped_column(String(16))  # expense | income
    category: Mapped[str] = mapped_column(String(64))
    subcategory_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    subcategory_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    txn_date: Mapped[date] = mapped_column(Date, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class PersonalCategory(Base):
    __tablename__ = "personal_categories"

    category_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    kind: Mapped[str] = mapped_column(String(16))  # expense | income
    name: Mapped[str] = mapped_column(String(64))
    icon_emoji: Mapped[str | None] = mapped_column(String(16), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class PersonalSubcategory(Base):
    __tablename__ = "personal_subcategories"

    subcategory_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    category_id: Mapped[str] = mapped_column(String(32), index=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    name: Mapped[str] = mapped_column(String(120))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class BusinessBudget(Base):
    __tablename__ = "business_budgets"

    budget_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    owner_uid: Mapped[str] = mapped_column(String(128), index=True)
    budget_name: Mapped[str] = mapped_column(String(200))
    budget_type: Mapped[str] = mapped_column(String(64))
    total_budget: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    budget_period: Mapped[str] = mapped_column(String(64), default="Monthly")
    department: Mapped[str] = mapped_column(String(64), default="Marketing")
    approval_threshold: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    spending_policies_json: Mapped[str] = mapped_column(Text, default="{}")
    spent_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0"),
        server_default="0",
    )
    expenses_blocked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    status: Mapped[str] = mapped_column(String(24), default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    reminder_prefs_json: Mapped[str] = mapped_column(Text, default="{}")
    join_token: Mapped[str | None] = mapped_column(String(96), unique=True, nullable=True, index=True)


class BusinessBudgetAuditEvent(Base):
    __tablename__ = "business_budget_audit_events"

    event_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    budget_id: Mapped[str] = mapped_column(String(32), index=True)
    actor_uid: Mapped[str] = mapped_column(String(128))
    action: Mapped[str] = mapped_column(String(64))
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class BusinessBudgetMember(Base):
    __tablename__ = "business_budget_members"

    member_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    budget_id: Mapped[str] = mapped_column(String(32), index=True)
    firebase_uid: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    initials: Mapped[str | None] = mapped_column(String(16), nullable=True)
    display_name: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(64), default="employee")
    spend_limit: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_added: Mapped[bool] = mapped_column(Boolean, default=True)
    invite_status: Mapped[str] = mapped_column(String(24), default="pending")
    invited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    invite_token: Mapped[str | None] = mapped_column(String(96), unique=True, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class BusinessBudgetVendor(Base):
    __tablename__ = "business_budget_vendors"

    vendor_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    budget_id: Mapped[str] = mapped_column(String(32), index=True)
    vendor_name: Mapped[str] = mapped_column(String(200))
    created_by_uid: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class BusinessBudgetCategory(Base):
    __tablename__ = "business_budget_categories"

    category_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    budget_id: Mapped[str] = mapped_column(String(32), index=True)
    name: Mapped[str] = mapped_column(String(120))
    allocated_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    spent_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class BusinessCategoryTemplate(Base):
    __tablename__ = "business_category_templates"

    template_category_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    entry_kind: Mapped[str] = mapped_column(String(16), index=True)
    name: Mapped[str] = mapped_column(String(120))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class BusinessCategoryTemplateSubcategory(Base):
    __tablename__ = "business_category_template_subcategories"

    template_subcategory_id: Mapped[str] = mapped_column(String(96), primary_key=True)
    template_category_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(120))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class BusinessBudgetCategoryMapping(Base):
    __tablename__ = "business_budget_category_mappings"

    mapping_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    budget_id: Mapped[str] = mapped_column(String(32), index=True)
    entry_kind: Mapped[str] = mapped_column(String(16), index=True)
    template_category_id: Mapped[str] = mapped_column(String(64), index=True)
    budget_category_id: Mapped[str] = mapped_column(String(32), index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class BusinessBudgetSubcategory(Base):
    __tablename__ = "business_budget_subcategories"

    budget_subcategory_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    budget_id: Mapped[str] = mapped_column(String(32), index=True)
    entry_kind: Mapped[str] = mapped_column(String(16), index=True)
    template_category_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(120))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class BusinessBudgetApproval(Base):
    __tablename__ = "business_budget_approvals"

    approval_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    budget_id: Mapped[str] = mapped_column(String(32), index=True)
    title: Mapped[str] = mapped_column(String(200))
    requester_name: Mapped[str] = mapped_column(String(200))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    submitter_uid: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    department: Mapped[str | None] = mapped_column(String(64), nullable=True)
    category_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    subcategory_label: Mapped[str | None] = mapped_column(String(200), nullable=True)
    entry_kind: Mapped[str] = mapped_column(String(16), default="expense")
    paid_mode: Mapped[str | None] = mapped_column(String(24), nullable=True)
    purchase_payment_status: Mapped[str | None] = mapped_column(String(24), nullable=True)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(12, 3), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(8), nullable=True)
    price_per_unit: Mapped[Decimal | None] = mapped_column(Numeric(12, 3), nullable=True)
    total_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    paid_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    vendor_balance_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    payment_splits_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    vendor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    invoice_number: Mapped[str | None] = mapped_column(String(120), nullable=True)
    expense_or_purchase: Mapped[str] = mapped_column(String(16), default="expense")
    payment_mode: Mapped[str | None] = mapped_column(String(32), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(32), nullable=True)
    tax_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    approver_uid: Mapped[str | None] = mapped_column(String(128), nullable=True)
    receipt_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    receipt_mime: Mapped[str | None] = mapped_column(String(128), nullable=True)
    receipt_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    receipt_attached: Mapped[bool] = mapped_column(Boolean, default=False)
    receipt_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    receipt_followup_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(24), default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class GroupMoment(Base):
    __tablename__ = "group_moments"

    moment_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    owner_uid: Mapped[str] = mapped_column(String(128), index=True)
    title: Mapped[str] = mapped_column(String(200))
    moment_type: Mapped[str] = mapped_column(String(64), default="trip_fund")
    target_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    destination: Mapped[str | None] = mapped_column(Text, nullable=True)
    trip_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    trip_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    split_mode: Mapped[str] = mapped_column(String(24), default="equal")
    contribution_due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    send_payment_reminders: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_notify_on_contribution: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_partial_payments: Mapped[bool] = mapped_column(Boolean, default=True)
    require_receipt_for_expenses: Mapped[bool] = mapped_column(Boolean, default=False)
    require_organiser_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    join_token: Mapped[str] = mapped_column(String(96), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(24), default="active")
    milestones_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class GroupMomentMember(Base):
    __tablename__ = "group_moment_members"

    member_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    moment_id: Mapped[str] = mapped_column(String(32), index=True)
    firebase_uid: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(24), default="member")
    status: Mapped[str] = mapped_column(String(24), default="invited")
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class GroupMomentInvite(Base):
    __tablename__ = "group_moment_invites"

    invite_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    moment_id: Mapped[str] = mapped_column(String(32), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    invite_token: Mapped[str] = mapped_column(String(96), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(24), default="pending")
    resend_count: Mapped[int] = mapped_column(Integer, default=0)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class GroupBudgetCategory(Base):
    __tablename__ = "group_budget_categories"

    category_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    moment_id: Mapped[str] = mapped_column(String(32), index=True)
    category_key: Mapped[str] = mapped_column(String(64), index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    cap_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class GroupExpense(Base):
    __tablename__ = "group_expenses"

    expense_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    moment_id: Mapped[str] = mapped_column(String(32), index=True)
    category_key: Mapped[str] = mapped_column(String(64), index=True)
    subcategory: Mapped[str | None] = mapped_column(String(200), nullable=True)
    title: Mapped[str] = mapped_column(String(300))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    expense_date: Mapped[date] = mapped_column(Date)
    paid_by_member_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    receipt_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    receipt_mime: Mapped[str | None] = mapped_column(String(128), nullable=True)
    receipt_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    split_mode: Mapped[str] = mapped_column(String(24), default="equal")
    splits_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="approved")
    created_by_uid: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class GroupContribution(Base):
    __tablename__ = "group_contributions"

    contribution_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    moment_id: Mapped[str] = mapped_column(String(32), index=True)
    member_id: Mapped[str] = mapped_column(String(32), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_uid: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class GroupActivityEvent(Base):
    __tablename__ = "group_activity_events"

    activity_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    moment_id: Mapped[str] = mapped_column(String(32), index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(400))
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor_uid: Mapped[str | None] = mapped_column(String(128), nullable=True)
    actor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    meta_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class MomentHealthSnapshot(Base):
    __tablename__ = "moment_health_snapshots"

    snapshot_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    scope_type: Mapped[str] = mapped_column(String(16), index=True)  # group | personal
    moment_id: Mapped[str] = mapped_column(String(64), index=True)
    composite_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0"))
    health_state: Mapped[str] = mapped_column(String(32), default="ON_TRACK")
    trend: Mapped[str | None] = mapped_column(String(32), nullable=True)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class V1SignalResolution(Base):
    __tablename__ = "v1_signal_resolutions"

    resolution_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    signal_fingerprint: Mapped[str] = mapped_column(String(64), index=True)
    resolved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class V1GuidanceRead(Base):
    __tablename__ = "v1_guidance_reads"

    read_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    guidance_fingerprint: Mapped[str] = mapped_column(String(64), index=True)
    read_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


@contextmanager
def db_session() -> Any:
    with Session(engine) as session:
        yield session


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    return token


def _decode_jwt_claims_unverified(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        return {}
    payload = parts[1]
    payload += "=" * (-len(payload) % 4)
    try:
        decoded = base64.urlsafe_b64decode(payload.encode("utf-8")).decode("utf-8")
        claims = json.loads(decoded)
        return claims if isinstance(claims, dict) else {}
    except (ValueError, json.JSONDecodeError):
        return {}


def _load_firebase_credential() -> credentials.Base:
    raw_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if raw_json:
        return credentials.Certificate(json.loads(raw_json))

    raw_json_b64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON_B64", "").strip().rstrip("%")
    if raw_json_b64:
        decoded = base64.b64decode(raw_json_b64.encode("utf-8")).decode("utf-8")
        return credentials.Certificate(json.loads(decoded))

    credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    if credentials_path:
        path = Path(credentials_path)
        if path.exists():
            return credentials.Certificate(str(path))

    raise HTTPException(
        status_code=503,
        detail="Firebase Admin credentials are not configured on backend.",
    )


def _ensure_firebase_app_initialized() -> None:
    """Initialize the default Firebase Admin app once, safely under concurrent requests."""
    if FIREBASE_AUTH_DISABLED:
        return
    try:
        firebase_admin.get_app()
        return
    except ValueError:
        pass
    with _firebase_init_lock:
        try:
            firebase_admin.get_app()
            return
        except ValueError:
            pass
        credential = _load_firebase_credential()
        firebase_admin.initialize_app(
            credential,
            {"projectId": FIREBASE_PROJECT_ID} if FIREBASE_PROJECT_ID else None,
        )


def _verify_firebase_token(id_token: str) -> dict[str, Any]:
    if FIREBASE_AUTH_DISABLED:
        claims = _decode_jwt_claims_unverified(id_token)
        uid = str(claims.get("user_id") or claims.get("sub") or "").strip()
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid Firebase ID token")
        return claims

    _ensure_firebase_app_initialized()

    try:
        return firebase_auth.verify_id_token(id_token, check_revoked=False)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase ID token") from exc


def _user_from_auth_header(authorization: str | None) -> dict[str, str | None]:
    token = _extract_bearer_token(authorization)
    claims = _verify_firebase_token(token)
    uid = str(claims.get("uid") or claims.get("user_id") or claims.get("sub") or "").strip()
    if not uid:
        raise HTTPException(status_code=401, detail="Firebase token missing uid")
    return {
        "uid": uid,
        "email": (str(claims.get("email")) if claims.get("email") else None),
        "phone_number": (str(claims.get("phone_number")) if claims.get("phone_number") else None),
    }


class SyncUserRequest(BaseModel):
    display_name: str | None = None
    photo_url: str | None = None
    upi_or_phone: str | None = None
    primary_use: str | None = None
    primary_focus: str | None = None
    default_currency: str | None = None
    organization_name: str | None = None
    setup_completed: bool | None = None


class MeResponse(BaseModel):
    uid: str | None = None
    email: str | None = None
    phone_number: str | None = None
    display_name: str | None = None
    primary_use: str | None = None
    primary_focus: str | None = None
    default_currency: str | None = None
    organization_name: str | None = None
    setup_completed: bool = False


class PersonalMomentMilestoneIn(BaseModel):
    title: str
    meta: str | None = None


class PersonalMomentCreateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    moment_type: str
    duration_type: str
    target_amount: float | None = None
    start_date: date | None = None
    end_date: date | None = None
    saving_mode: str | None = None
    description: str | None = None
    milestones: list[PersonalMomentMilestoneIn] = Field(default_factory=list)
    status: str = "active"
    is_private_moment: bool = True
    weekly_reminders: bool = True
    milestone_alerts: bool = True
    low_velocity_warning: bool = False
    auto_archive_on_complete: bool = True
    notify_via_push: bool = True
    notify_via_whatsapp: bool = False
    notify_via_email: bool = True


class PersonalMomentCreateOut(BaseModel):
    moment_id: str = Field(alias="moment_id")
    title: str
    moment_type: str = Field(alias="moment_type")
    duration_type: str = Field(alias="duration_type")


class PersonalMomentMilestoneOut(BaseModel):
    title: str
    meta: str | None = None


class PersonalMomentItemOut(BaseModel):
    moment_id: str
    title: str
    moment_type: str
    duration_type: str
    status: str
    target_amount: float | None = None
    start_date: date | None = None
    end_date: date | None = None
    saving_mode: str | None = None
    description: str | None = None
    is_private_moment: bool = True
    milestones: list[PersonalMomentMilestoneOut] = Field(default_factory=list)


class PersonalMomentPatchIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = None
    target_amount: float | None = None
    duration_type: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = None
    saving_mode: str | None = None
    is_private_moment: bool | None = None
    append_contribution_amount: float | None = None


class PersonalMomentListResponse(BaseModel):
    moments: list[PersonalMomentItemOut]


class PersonalAccountOut(BaseModel):
    account_id: str
    name: str
    account_type: str
    icon_emoji: str | None = None
    color_hex: str | None = None
    balance: float = 0


class PersonalAccountsListOut(BaseModel):
    accounts: list[PersonalAccountOut] = Field(default_factory=list)


class PersonalTransactionOut(BaseModel):
    transaction_id: str
    title: str
    category: str
    subcategory_id: str | None = None
    subcategory_label: str | None = None
    account_name: str | None = None
    amount: float
    is_income: bool
    txn_date: date
    subtitle: str
    emoji: str
    note: str | None = None


class PersonalTransactionListOut(BaseModel):
    transactions: list[PersonalTransactionOut] = Field(default_factory=list)


class PersonalTransactionCreateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    is_income: bool = False
    amount: float = Field(gt=0)
    category: str
    subcategory_id: str | None = None
    subcategory_label: str | None = None
    account_id: str | None = None
    title: str | None = None
    note: str | None = None
    txn_date: date | None = None


class PersonalTransactionPatchIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    is_income: bool | None = None
    amount: float | None = None
    category: str | None = None
    subcategory_id: str | None = None
    subcategory_label: str | None = None
    account_id: str | None = None
    title: str | None = None
    note: str | None = None
    txn_date: date | None = None


class PersonalSubcategoryOut(BaseModel):
    subcategory_id: str
    name: str


class PersonalCategoryOut(BaseModel):
    category_id: str
    kind: str
    name: str
    icon_emoji: str | None = None
    subcategories: list[PersonalSubcategoryOut] = Field(default_factory=list)


class PersonalCategoryListOut(BaseModel):
    categories: list[PersonalCategoryOut] = Field(default_factory=list)


class PersonalHomeOut(BaseModel):
    net_balance: float
    month_spend: float
    month_income: float
    budget_spent: float
    budget_cap: float
    accounts: list[PersonalAccountOut] = Field(default_factory=list)
    recent: list[PersonalTransactionOut] = Field(default_factory=list)


class BusinessBudgetMemberIn(BaseModel):
    initials: str | None = None
    display_name: str
    role: str = "employee"
    firebase_uid: str | None = None
    email: str | None = None
    limit: str | None = None
    added: bool = True


class BusinessBudgetPoliciesIn(BaseModel):
    require_receipt_for_all_expenses: bool = False
    auto_approve_below_threshold: bool = True
    manager_approval_required: bool = True
    notify_admin_on_submission: bool = True
    over_budget_alerts: bool = True
    lock_budget_when_limit_hit: bool = False


class BusinessBudgetReminderPrefsOut(BaseModel):
    weekly_digest: bool = True
    pending_approval_alerts: bool = True
    over_budget_alerts: bool = True
    period_close_reminder: bool = True


class BusinessBudgetReminderPrefsPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")

    weekly_digest: bool | None = None
    pending_approval_alerts: bool | None = None
    over_budget_alerts: bool | None = None
    period_close_reminder: bool | None = None


class BusinessBudgetCategoryAllocPatch(BaseModel):
    category_id: str
    allocated_amount: float = Field(ge=0)


class BusinessBudgetPatchIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    budget_name: str | None = None
    budget_period: str | None = None
    total_budget: float | None = None
    department: str | None = None
    approval_threshold: float | None = None
    spending_policies: BusinessBudgetPoliciesIn | None = None
    reminder_prefs: BusinessBudgetReminderPrefsPatch | None = None
    categories: list[BusinessBudgetCategoryAllocPatch] | None = None


class BusinessBudgetCreateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    budget_name: str
    budget_type: str
    total_budget: float | None = None
    budget_period: str = "Monthly"
    department: str = "Marketing"
    approval_threshold: float | None = None
    team_members: list[BusinessBudgetMemberIn] = Field(default_factory=list)
    spending_policies: BusinessBudgetPoliciesIn = Field(default_factory=BusinessBudgetPoliciesIn)
    reminder_prefs: BusinessBudgetReminderPrefsOut | None = None


class BusinessBudgetCategoryOut(BaseModel):
    category_id: str
    name: str
    allocated_amount: float
    spent_amount: float


class BusinessCatalogCategoryOut(BaseModel):
    template_category_id: str
    budget_category_id: str
    name: str
    entry_kind: str
    sort_order: int = 0
    active: bool = True
    subcategories: list[str] = Field(default_factory=list)


class BusinessCatalogOut(BaseModel):
    expense: list[BusinessCatalogCategoryOut] = Field(default_factory=list)
    purchase: list[BusinessCatalogCategoryOut] = Field(default_factory=list)


class BusinessCatalogSubcategoryCreateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    entry_kind: Literal["expense", "purchase"]
    template_category_id: str
    name: str
    sort_order: int | None = None


class BusinessCatalogSubcategoryPatchIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = None
    sort_order: int | None = None
    active: bool | None = None


class BusinessCatalogCategoryMappingPatchIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    entry_kind: Literal["expense", "purchase"]
    template_category_id: str
    budget_category_id: str
    active: bool | None = None


class BusinessCatalogCategoryStatePatchIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    active: bool


class BusinessBudgetTeamMemberOut(BaseModel):
    member_id: str
    display_name: str
    role: str
    firebase_uid: str | None = None
    email: str | None = None
    spend_limit: str | None = None
    is_added: bool = True
    invite_status: str = "pending"
    joined_at: datetime | None = None


class BusinessBudgetPendingApprovalOut(BaseModel):
    approval_id: str
    title: str
    requester_name: str
    amount: float
    submitter_uid: str | None = None
    approver_uid: str | None = None
    department: str | None = None
    category_id: str | None = None
    subcategory_label: str | None = None
    entry_kind: str = "expense"
    paid_mode: str | None = None
    purchase_payment_status: str | None = None
    quantity: float | None = None
    unit: str | None = None
    price_per_unit: float | None = None
    total_amount: float | None = None
    paid_amount: float | None = None
    vendor_balance_amount: float | None = None
    payment_splits: list[dict[str, Any]] = Field(default_factory=list)
    vendor_name: str | None = None
    invoice_number: str | None = None
    expense_or_purchase: str = "expense"
    payment_mode: str | None = None
    due_date: date | None = None
    gstin: str | None = None
    tax_amount: float | None = None
    receipt_name: str | None = None
    receipt_attached: bool = False
    receipt_verified: bool = False
    receipt_followup_requested: bool = False
    status: str = "pending"
    resolved_at: datetime | None = None


class BusinessBudgetApprovalSummaryOut(BaseModel):
    pending_count: int = 0
    approved_count: int = 0
    rejected_count: int = 0
    my_pending_count: int = 0
    my_total_submissions: int = 0


class BusinessVendorBalanceOut(BaseModel):
    vendor_name: str
    total_amount: float = 0.0
    paid_amount: float = 0.0
    balance_amount: float = 0.0


class BusinessVendorOut(BaseModel):
    vendor_id: str
    vendor_name: str


class BusinessBudgetCreateOut(BaseModel):
    budget_id: str
    budget_name: str
    budget_type: str
    total_budget: float | None = None
    budget_period: str
    department: str
    approval_threshold: float | None = None
    spent_amount: float = 0.0
    status: str
    expenses_blocked: bool = False
    team_members_count: int
    invited_members_count: int
    categories: list[BusinessBudgetCategoryOut] = Field(default_factory=list)
    pending_approvals: list[BusinessBudgetPendingApprovalOut] = Field(default_factory=list)
    recent_approvals: list[BusinessBudgetPendingApprovalOut] = Field(default_factory=list)
    my_submissions: list[BusinessBudgetPendingApprovalOut] = Field(default_factory=list)
    approval_summary: BusinessBudgetApprovalSummaryOut = Field(default_factory=BusinessBudgetApprovalSummaryOut)
    vendor_balances: list[BusinessVendorBalanceOut] = Field(default_factory=list)
    vendors: list[BusinessVendorOut] = Field(default_factory=list)
    approved_expense_count: int = 0
    team_members: list[BusinessBudgetTeamMemberOut] = Field(default_factory=list)
    reminder_prefs: BusinessBudgetReminderPrefsOut = Field(default_factory=BusinessBudgetReminderPrefsOut)


class BusinessBudgetListOut(BaseModel):
    budgets: list[BusinessBudgetCreateOut] = Field(default_factory=list)


class BusinessPendingInviteOut(BaseModel):
    budget_id: str
    budget_name: str
    member_id: str
    role: str
    invited_at: datetime | None = None
    invite_token: str


class BusinessPendingInvitesOut(BaseModel):
    invites: list[BusinessPendingInviteOut] = Field(default_factory=list)


class BusinessExpenseIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    amount: float = Field(gt=0)
    category_id: str
    category_key: str | None = None
    title: str = "Expense"
    requester_name: str | None = None
    subcategory_label: str | None = None
    entry_kind: Literal["expense", "purchase"] | None = None
    paid_mode: Literal["cash", "upi", "card"] | None = None
    purchase_payment_status: Literal["paid", "partially_paid", "credit"] | None = None
    quantity: float | None = Field(default=None, gt=0)
    unit: Literal["kg", "lt", "gm"] | None = None
    price_per_unit: float | None = Field(default=None, gt=0)
    total_amount: float | None = Field(default=None, gt=0)
    paid_amount: float | None = Field(default=None, ge=0)
    payment_splits: list[dict[str, Any]] = Field(default_factory=list)
    approval_note: str | None = None
    vendor_name: str | None = None
    invoice_number: str | None = None
    expense_or_purchase: Literal["expense", "purchase"] = "expense"
    payment_mode: str | None = None
    due_date: date | None = None
    gstin: str | None = None
    tax_amount: float | None = Field(default=None, ge=0)
    receipt_attached: bool = False


class BusinessExportOut(BaseModel):
    format: str = "csv"
    filename: str = "budget-export.csv"
    csv_text: str
    message: str = ""


class BusinessAuditEventOut(BaseModel):
    event_id: str
    action: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class BusinessAuditListOut(BaseModel):
    events: list[BusinessAuditEventOut] = Field(default_factory=list)
    next_offset: int | None = None


class BusinessApprovalQueueOut(BaseModel):
    pending_approvals: list[BusinessBudgetPendingApprovalOut] = Field(default_factory=list)
    my_submissions: list[BusinessBudgetPendingApprovalOut] = Field(default_factory=list)
    approval_summary: BusinessBudgetApprovalSummaryOut = Field(default_factory=BusinessBudgetApprovalSummaryOut)


class BusinessBudgetMemberPatchIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    display_name: str | None = None
    role: str | None = None
    firebase_uid: str | None = None
    email: str | None = None
    invite_status: str | None = None
    limit: str | None = None
    added: bool | None = None


class BusinessVendorIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    vendor_name: str


class BusinessVendorPatchIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    vendor_name: str


class GroupMemberSeedIn(BaseModel):
    display_name: str
    email: str | None = None
    role: str = "member"


class GroupMomentRulesIn(BaseModel):
    send_payment_reminders: bool = True
    auto_notify_on_contribution: bool = True
    allow_partial_payments: bool = True
    require_receipt_for_expenses: bool = False
    require_organiser_approval: bool = False


GROUP_SPLIT_MODE_VALUES: frozenset[str] = frozenset({"equal", "exact", "percent", "shares"})
BUSINESS_ROLE_VALUES: frozenset[str] = frozenset({"owner", "admin", "employee"})
BUSINESS_APPROVER_ROLES: frozenset[str] = frozenset({"owner", "admin"})
BUSINESS_ENTRY_KIND_VALUES: frozenset[str] = frozenset({"expense", "purchase"})
BUSINESS_PAID_MODE_VALUES: frozenset[str] = frozenset({"cash", "upi", "card"})
BUSINESS_PURCHASE_PAYMENT_STATUS_VALUES: frozenset[str] = frozenset({"paid", "partially_paid", "credit"})
BUSINESS_PURCHASE_UNIT_VALUES: frozenset[str] = frozenset({"kg", "lt", "gm"})
BUSINESS_PAYMENT_METHOD_VALUES: frozenset[str] = frozenset({"cash", "upi", "creditcard", "bank"})
BUSINESS_CATALOG_EDIT_ROLES: frozenset[str] = frozenset({"owner", "admin"})

BUSINESS_CATALOG_DEFAULTS: dict[str, list[dict[str, Any]]] = {
    "expense": [
        {
            "template_category_id": "tmpl_exp_operations",
            "name": "Operations",
            "subcategories": ["Rent", "Utilities", "Maintenance", "Office Supplies"],
        },
        {
            "template_category_id": "tmpl_exp_marketing",
            "name": "Marketing",
            "subcategories": ["Digital Ads", "Print Ads", "Promotions", "Branding"],
        },
        {
            "template_category_id": "tmpl_exp_payroll",
            "name": "Payroll",
            "subcategories": ["Salaries", "Contractors", "Bonuses", "Staff Welfare"],
        },
        {
            "template_category_id": "tmpl_exp_logistics",
            "name": "Logistics",
            "subcategories": ["Fuel", "Transport", "Delivery", "Packaging"],
        },
    ],
    "purchase": [
        {
            "template_category_id": "tmpl_pur_raw_materials",
            "name": "Raw Materials",
            "subcategories": ["Seeds", "Oil Cakes", "Ingredients", "Bulk Inputs"],
        },
        {
            "template_category_id": "tmpl_pur_inventory_stock",
            "name": "Inventory Stock",
            "subcategories": ["Finished Goods", "Retail Stock", "Wholesale Stock"],
        },
        {
            "template_category_id": "tmpl_pur_packaging_purchase",
            "name": "Packaging Purchase",
            "subcategories": ["Bottles", "Labels", "Boxes", "Pouches"],
        },
        {
            "template_category_id": "tmpl_pur_equipment_purchase",
            "name": "Equipment Purchase",
            "subcategories": ["Machinery", "Tools", "Spare Parts", "Appliances"],
        },
    ],
}


class GroupMomentCreateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    moment_type: str = "trip_fund"
    target_amount: float | None = None
    destination: str | None = None
    trip_start_date: date | None = None
    trip_end_date: date | None = None
    split_mode: str = "equal"
    contribution_due_date: date | None = None
    members: list[GroupMemberSeedIn] = Field(default_factory=list)
    rules: GroupMomentRulesIn = Field(default_factory=GroupMomentRulesIn)


class GroupInviteEmailIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    emails: list[str] = Field(default_factory=list)
    message: str | None = None
    resend: bool = False


class GroupInviteLinkOut(BaseModel):
    join_url: str


class GroupMemberOut(BaseModel):
    member_id: str
    firebase_uid: str | None = None
    display_name: str | None = None
    email: str | None = None
    role: str
    status: str
    joined_at: datetime | None = None


class GroupInviteOut(BaseModel):
    invite_id: str
    email: str
    status: str
    resend_count: int
    sent_at: datetime | None = None
    joined_at: datetime | None = None
    last_error: str | None = None


class GroupPendingInviteOut(BaseModel):
    invite_id: str
    moment_id: str
    moment_title: str
    email: str
    status: str
    sent_at: datetime | None = None
    created_at: datetime | None = None
    invite_token: str


class GroupPendingInvitesOut(BaseModel):
    invites: list[GroupPendingInviteOut] = Field(default_factory=list)


class GroupMomentOut(BaseModel):
    moment_id: str
    owner_uid: str
    title: str
    moment_type: str
    target_amount: float | None = None
    destination: str | None = None
    trip_start_date: date | None = None
    trip_end_date: date | None = None
    split_mode: str
    contribution_due_date: date | None = None
    status: str
    join_url: str
    joined_count: int
    invited_count: int
    raised_amount: float = 0.0


class GroupMomentRulesOut(BaseModel):
    send_payment_reminders: bool
    auto_notify_on_contribution: bool
    allow_partial_payments: bool
    require_receipt_for_expenses: bool
    require_organiser_approval: bool


class GroupMemberLedgerOut(BaseModel):
    member_id: str
    firebase_uid: str | None = None
    display_name: str | None = None
    email: str | None = None
    role: str
    status: str
    joined_at: datetime | None = None
    expected_share: float
    contributed_total: float
    paid: bool


class GroupBudgetCategoryOut(BaseModel):
    category_id: str
    category_key: str
    display_name: str
    cap_amount: float
    spent_amount: float


class GroupExpenseSplitDetailOut(BaseModel):
    member_id: str
    display_name: str | None = None
    amount: float


class GroupExpenseOut(BaseModel):
    expense_id: str
    category_key: str
    subcategory: str | None
    title: str
    amount: float
    expense_date: date
    paid_by_member_id: str | None
    paid_by_name: str | None = None
    split_mode: str = "equal"
    split_lines: list[GroupExpenseSplitDetailOut] = Field(default_factory=list)
    status: str
    has_receipt: bool
    created_at: datetime


class GroupContributionOut(BaseModel):
    contribution_id: str
    member_id: str
    amount: float
    note: str | None
    created_at: datetime


class GroupActivityOut(BaseModel):
    activity_id: str
    event_type: str
    title: str
    detail: str | None
    actor_name: str | None
    created_at: datetime


class GroupTotalsOut(BaseModel):
    raised_amount: float
    spent_expenses_amount: float
    last_activity_at: datetime | None = None


class GroupMomentDetailOut(BaseModel):
    moment: GroupMomentOut
    members: list[GroupMemberLedgerOut] = Field(default_factory=list)
    invites: list[GroupInviteOut] = Field(default_factory=list)
    rules: GroupMomentRulesOut
    budget_categories: list[GroupBudgetCategoryOut] = Field(default_factory=list)
    expenses: list[GroupExpenseOut] = Field(default_factory=list)
    contributions: list[GroupContributionOut] = Field(default_factory=list)
    activity: list[GroupActivityOut] = Field(default_factory=list)
    totals: GroupTotalsOut


class GroupMomentUpdateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = None
    target_amount: float | None = None
    destination: str | None = None
    contribution_due_date: date | None = None
    rules: GroupMomentRulesIn | None = None
    status: str | None = None


class GroupExpenseSplitLineIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    member_id: str
    value: float = Field(ge=0)


class GroupExpenseCreateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    category_key: str
    subcategory: str | None = None
    title: str
    amount: float = Field(gt=0)
    expense_date: date
    paid_by_member_id: str
    receipt_notes: str | None = None
    split_mode: str = "equal"
    split_lines: list[GroupExpenseSplitLineIn] = Field(default_factory=list)


class GroupContributionCreateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    member_id: str
    amount: float = Field(gt=0)
    note: str | None = None


class GroupMomentListOut(BaseModel):
    moments: list[GroupMomentOut] = Field(default_factory=list)


class GroupInviteEmailOut(BaseModel):
    sent: int
    failed: int
    total: int
    error_messages: list[str] = Field(default_factory=list)


def _milestones_from_json(raw: Any) -> list[dict[str, Any]]:
    if not raw:
        return []
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    if isinstance(raw, dict):
        return [raw]
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _ensure_app_user(session: Session, auth_user: dict[str, str | None]) -> None:
    existing_user = session.execute(
        select(AppUser).where(AppUser.firebase_uid == auth_user["uid"]),
    ).scalar_one_or_none()
    if existing_user is not None:
        return
    now = datetime.now(timezone.utc)
    session.add(
        AppUser(
            firebase_uid=str(auth_user["uid"]),
            email=auth_user["email"],
            phone_number=auth_user["phone_number"],
            created_at=now,
            updated_at=now,
            last_sign_in_at=now,
        ),
    )


def _business_role_norm(raw: str | None) -> str:
    role = (raw or "").strip().lower()
    if role == "member":
        role = "employee"
    return role if role in BUSINESS_ROLE_VALUES else "employee"


def _resolve_business_actor(
    session: Session,
    budget_id: str,
    uid: str,
) -> tuple[BusinessBudget, str, BusinessBudgetMember | None]:
    budget = session.get(BusinessBudget, budget_id)
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found")
    if budget.owner_uid == uid:
        return budget, "owner", None
    member = session.scalar(
        select(BusinessBudgetMember)
        .where(BusinessBudgetMember.budget_id == budget_id)
        .where(BusinessBudgetMember.firebase_uid == uid)
        .where(BusinessBudgetMember.is_added.is_(True))
        .order_by(desc(BusinessBudgetMember.created_at))
        .limit(1),
    )
    if member is None:
        raise HTTPException(status_code=404, detail="Budget not found")
    status_norm = (member.invite_status or "").strip().lower()
    if status_norm not in {"joined", "accepted"}:
        raise HTTPException(status_code=403, detail="Join this business budget first")
    role = _business_role_norm(member.role)
    return budget, role, member


def _require_business_role(role: str, allowed: set[str] | frozenset[str]) -> None:
    if role not in allowed:
        raise HTTPException(status_code=403, detail="You do not have permission for this action")


_DEFAULT_PERSONAL_ACCOUNTS: list[dict[str, str]] = [
    {"name": "Cash", "account_type": "cash", "icon_emoji": "💵", "color_hex": "#064E35"},
    {"name": "HDFC Bank", "account_type": "bank", "icon_emoji": "🏦", "color_hex": "#2D1F5E"},
    {"name": "UPI / GPay", "account_type": "upi", "icon_emoji": "📱", "color_hex": "#1E3A5F"},
]

_DEFAULT_PERSONAL_CATEGORY_TREE: list[dict[str, Any]] = [
    {
        "kind": "expense",
        "name": "Food",
        "icon_emoji": "🍽",
        "subcategories": ["Dining Out", "Groceries", "Coffee & Snacks"],
    },
    {
        "kind": "expense",
        "name": "Transport",
        "icon_emoji": "🚖",
        "subcategories": ["Fuel", "Cabs", "Public Transit"],
    },
    {
        "kind": "expense",
        "name": "Bills",
        "icon_emoji": "🧾",
        "subcategories": ["Electricity", "Internet", "Phone"],
    },
    {
        "kind": "expense",
        "name": "Shopping",
        "icon_emoji": "🛍️",
        "subcategories": ["Clothing", "Home", "Electronics"],
    },
    {
        "kind": "income",
        "name": "Salary",
        "icon_emoji": "💰",
        "subcategories": ["Monthly Salary", "Bonus", "Reimbursement"],
    },
    {
        "kind": "income",
        "name": "Business Income",
        "icon_emoji": "🏢",
        "subcategories": ["Client Payment", "Commission", "Interest"],
    },
]


def _month_key(d: date) -> str:
    return d.strftime("%Y-%m")


def _normalize_name(value: str) -> str:
    return value.strip().lower()


def _txn_emoji(category: str, is_income: bool) -> str:
    if is_income:
        return "💰"
    mapping = {
        "food": "🍽",
        "dining": "🍽",
        "groceries": "🛒",
        "transport": "🚖",
        "travel": "✈️",
        "health": "💊",
        "shopping": "🛍️",
        "bills": "🧾",
        "education": "📚",
        "entertainment": "🎬",
    }
    key = category.strip().lower()
    return mapping.get(key, "💸")


def _personal_account_out(acc: PersonalAccount) -> PersonalAccountOut:
    return PersonalAccountOut(
        account_id=str(acc.account_id),
        name=acc.name,
        account_type=acc.account_type,
        icon_emoji=acc.icon_emoji,
        color_hex=acc.color_hex,
        balance=float(acc.balance or 0),
    )


def _personal_txn_out(txn: PersonalTransaction) -> PersonalTransactionOut:
    is_income = txn.kind == "income"
    day_label = txn.txn_date.strftime("%b %-d") if os.name != "nt" else txn.txn_date.strftime("%b %#d")
    category_label = txn.category
    if txn.subcategory_label:
        category_label = f"{txn.category} / {txn.subcategory_label}"
    subtitle = f"{category_label}  ·  {day_label}"
    return PersonalTransactionOut(
        transaction_id=str(txn.transaction_id),
        title=txn.title,
        category=txn.category,
        subcategory_id=txn.subcategory_id,
        subcategory_label=txn.subcategory_label,
        account_name=txn.account_name,
        amount=float(txn.amount or 0),
        is_income=is_income,
        txn_date=txn.txn_date,
        subtitle=subtitle,
        emoji=_txn_emoji(txn.category, is_income),
        note=txn.note,
    )


def _reverse_personal_transaction_effects(session: Session, txn: PersonalTransaction, now: datetime) -> None:
    uid = str(txn.firebase_uid)
    amount = Decimal(txn.amount or 0)
    kind = str(txn.kind)
    txn_date = txn.txn_date
    if txn.account_id:
        account = session.get(PersonalAccount, txn.account_id)
        if account is not None and str(account.firebase_uid) == uid:
            if kind == "income":
                account.balance = Decimal(account.balance or 0) - amount
            else:
                account.balance = Decimal(account.balance or 0) + amount
            account.updated_at = now
    if kind == "expense":
        budget = session.execute(
            select(PersonalBudget).where(
                PersonalBudget.firebase_uid == uid,
                PersonalBudget.month_key == _month_key(txn_date),
            ),
        ).scalar_one_or_none()
        if budget is not None:
            budget.spent_amount = Decimal(budget.spent_amount or 0) - amount
            budget.updated_at = now


def _apply_personal_transaction_effects(
    session: Session,
    uid: str,
    account: PersonalAccount | None,
    kind: str,
    amount: Decimal,
    txn_date: date,
    now: datetime,
) -> None:
    if account is not None:
        if kind == "income":
            account.balance = Decimal(account.balance or 0) + amount
        else:
            account.balance = Decimal(account.balance or 0) - amount
        account.updated_at = now
    budget = _ensure_personal_budget(session, uid, _month_key(txn_date), now)
    if kind == "expense":
        budget.spent_amount = Decimal(budget.spent_amount or 0) + amount
        budget.updated_at = now


def _seed_personal_accounts_if_missing(session: Session, uid: str, now: datetime) -> None:
    count = session.execute(
        select(func.count()).select_from(PersonalAccount).where(PersonalAccount.firebase_uid == uid),
    ).scalar_one()
    if int(count or 0) > 0:
        return
    for item in _DEFAULT_PERSONAL_ACCOUNTS:
        session.add(
            PersonalAccount(
                firebase_uid=uid,
                name=item["name"],
                account_type=item["account_type"],
                icon_emoji=item["icon_emoji"],
                color_hex=item["color_hex"],
                balance=Decimal("0"),
                is_active=True,
                created_at=now,
                updated_at=now,
            ),
        )


def _seed_personal_categories_if_missing(session: Session, uid: str, now: datetime) -> None:
    count = session.execute(
        select(func.count()).select_from(PersonalCategory).where(PersonalCategory.firebase_uid == uid),
    ).scalar_one()
    if int(count or 0) > 0:
        return
    for category_order, item in enumerate(_DEFAULT_PERSONAL_CATEGORY_TREE):
        category = PersonalCategory(
            firebase_uid=uid,
            kind=str(item["kind"]),
            name=str(item["name"]),
            icon_emoji=(str(item.get("icon_emoji")) if item.get("icon_emoji") else None),
            sort_order=category_order,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        session.add(category)
        session.flush()
        for sub_order, sub_name in enumerate(item.get("subcategories", [])):
            session.add(
                PersonalSubcategory(
                    category_id=category.category_id,
                    firebase_uid=uid,
                    name=str(sub_name),
                    sort_order=sub_order,
                    is_active=True,
                    created_at=now,
                    updated_at=now,
                ),
            )


def _ensure_personal_budget(session: Session, uid: str, month_key: str, now: datetime) -> PersonalBudget:
    budget = session.execute(
        select(PersonalBudget).where(
            PersonalBudget.firebase_uid == uid,
            PersonalBudget.month_key == month_key,
        ),
    ).scalar_one_or_none()
    if budget is not None:
        return budget
    budget = PersonalBudget(
        firebase_uid=uid,
        month_key=month_key,
        cap_amount=Decimal("0"),
        spent_amount=Decimal("0"),
        created_at=now,
        updated_at=now,
    )
    session.add(budget)
    session.flush()
    return budget


def _personal_categories_out(
    session: Session,
    uid: str,
    kind: Literal["expense", "income"],
) -> PersonalCategoryListOut:
    categories = session.scalars(
        select(PersonalCategory)
        .where(
            PersonalCategory.firebase_uid == uid,
            PersonalCategory.kind == kind,
            PersonalCategory.is_active.is_(True),
        )
        .order_by(PersonalCategory.sort_order.asc(), PersonalCategory.name.asc()),
    ).all()
    category_ids = [c.category_id for c in categories]
    if not category_ids:
        return PersonalCategoryListOut(categories=[])
    sub_rows = session.scalars(
        select(PersonalSubcategory)
        .where(
            PersonalSubcategory.firebase_uid == uid,
            PersonalSubcategory.category_id.in_(category_ids),
            PersonalSubcategory.is_active.is_(True),
        )
        .order_by(PersonalSubcategory.sort_order.asc(), PersonalSubcategory.name.asc()),
    ).all()
    by_category: dict[str, list[PersonalSubcategoryOut]] = defaultdict(list)
    for sub in sub_rows:
        by_category[str(sub.category_id)].append(
            PersonalSubcategoryOut(
                subcategory_id=str(sub.subcategory_id),
                name=sub.name,
            ),
        )
    return PersonalCategoryListOut(
        categories=[
            PersonalCategoryOut(
                category_id=str(cat.category_id),
                kind=cat.kind,
                name=cat.name,
                icon_emoji=cat.icon_emoji,
                subcategories=by_category.get(str(cat.category_id), []),
            )
            for cat in categories
        ],
    )


def _personal_home_out(session: Session, uid: str) -> PersonalHomeOut:
    accounts = session.scalars(
        select(PersonalAccount)
        .where(PersonalAccount.firebase_uid == uid, PersonalAccount.is_active.is_(True))
        .order_by(PersonalAccount.created_at.asc()),
    ).all()
    recent = session.scalars(
        select(PersonalTransaction)
        .where(PersonalTransaction.firebase_uid == uid)
        .order_by(desc(PersonalTransaction.txn_date), desc(PersonalTransaction.created_at))
        .limit(5),
    ).all()

    today = date.today()
    month_start = today.replace(day=1)
    month_rows = session.scalars(
        select(PersonalTransaction).where(
            PersonalTransaction.firebase_uid == uid,
            PersonalTransaction.txn_date >= month_start,
            PersonalTransaction.txn_date <= today,
        ),
    ).all()
    month_spend = sum(float(r.amount or 0) for r in month_rows if r.kind == "expense")
    month_income = sum(float(r.amount or 0) for r in month_rows if r.kind == "income")
    net_balance = sum(float(a.balance or 0) for a in accounts)

    budget = session.execute(
        select(PersonalBudget).where(
            PersonalBudget.firebase_uid == uid,
            PersonalBudget.month_key == _month_key(today),
        ),
    ).scalar_one_or_none()
    budget_spent = float((budget.spent_amount if budget else Decimal("0")) or 0)
    budget_cap = float((budget.cap_amount if budget else Decimal("0")) or 0)

    return PersonalHomeOut(
        net_balance=net_balance,
        month_spend=month_spend,
        month_income=month_income,
        budget_spent=budget_spent,
        budget_cap=budget_cap,
        accounts=[_personal_account_out(a) for a in accounts],
        recent=[_personal_txn_out(t) for t in recent],
    )


def _invite_link_for_token(token: str) -> str:
    encoded = urllib_parse.quote(token, safe="")
    return f"{PUBLIC_APP_BASE_URL}/join/{encoded}"


def _business_invite_link_for_token(token: str) -> str:
    encoded = urllib_parse.quote(token, safe="")
    return f"{PUBLIC_APP_BASE_URL}/business/join/{encoded}"


def _new_business_join_secret() -> str:
    return f"{uuid4().hex}{uuid4().hex}"


def _ensure_business_budget_join_token(session: Session, budget: BusinessBudget) -> str:
    existing = (budget.join_token or "").strip()
    if existing:
        return existing
    budget.join_token = _new_business_join_secret()
    return budget.join_token


def _ensure_business_member_invite_token(session: Session, member: BusinessBudgetMember) -> str:
    existing = (member.invite_token or "").strip()
    if existing:
        return existing
    member.invite_token = _new_business_join_secret()
    return member.invite_token


def _send_email_with_resend(to_email: str, subject: str, text_body: str, html_body: str) -> tuple[bool, str | None]:
    if not RESEND_API_KEY:
        return (False, "RESEND_API_KEY is not configured on backend.")
    payload = json.dumps(
        {
            "from": RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "text": text_body,
            "html": html_body,
        },
    ).encode("utf-8")
    req = urllib_request.Request(
        url="https://api.resend.com/emails",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib_request.urlopen(req, timeout=20) as resp:
            code = getattr(resp, "status", None) or resp.getcode()
            raw = resp.read().decode("utf-8", errors="ignore")
            if code not in (200, 201, 202):
                return (False, _parse_resend_error_body(code, raw))
        return (True, None)
    except urllib_error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        return (False, _parse_resend_error_body(exc.code, body))
    except Exception as exc:  # pragma: no cover - defensive network guard
        return (False, str(exc))


def _parse_resend_error_body(http_code: int, body: str) -> str:
    if not body or not body.strip():
        return f"Resend HTTP {http_code} (empty response body)"
    try:
        data = json.loads(body)
        if isinstance(data, dict):
            msg = data.get("message")
            name = data.get("name")
            if msg and name:
                return f"Resend HTTP {http_code} ({name}): {msg}"
            if msg:
                return f"Resend HTTP {http_code}: {msg}"
    except json.JSONDecodeError:
        pass
    return f"Resend HTTP {http_code}: {body[:800]}"


def _decimal_to_cents(x: Decimal) -> int:
    return int((x * Decimal("100")).quantize(Decimal("1")))


def _cents_to_decimal(c: int) -> Decimal:
    return (Decimal(c) / Decimal("100")).quantize(Decimal("0.01"))


def _split_equal_amount(amount: Decimal, participant_ids: list[str]) -> dict[str, Decimal]:
    n = len(participant_ids)
    if n < 1:
        raise HTTPException(status_code=422, detail="equal split needs at least one participant")
    total_cents = _decimal_to_cents(amount)
    base = total_cents // n
    rem = total_cents % n
    out: dict[str, Decimal] = {}
    for i, mid in enumerate(participant_ids):
        c = base + (1 if i < rem else 0)
        out[mid] = _cents_to_decimal(c)
    return out


def _build_expense_splits_json(
    amount: Decimal,
    mode_raw: str,
    lines_in: list[GroupExpenseSplitLineIn],
    joined: Sequence[GroupMomentMember],
) -> str:
    mode_norm = mode_raw.strip().lower()
    if mode_norm not in GROUP_SPLIT_MODE_VALUES:
        raise HTTPException(
            status_code=422,
            detail="split_mode must be one of: equal, exact, percent, shares",
        )
    joined_ids = {m.member_id for m in joined if m.status == "joined"}
    if not joined_ids:
        raise HTTPException(status_code=400, detail="No joined members in this moment")

    parts: dict[str, Decimal]

    if mode_norm == "equal":
        if not lines_in:
            participant_ids = sorted(joined_ids)
        else:
            participant_ids = [ln.member_id for ln in lines_in]
            for pid in participant_ids:
                if pid not in joined_ids:
                    raise HTTPException(status_code=400, detail=f"Split: unknown member {pid}")
        parts = _split_equal_amount(amount, participant_ids)
    elif mode_norm == "exact":
        if not lines_in:
            raise HTTPException(status_code=422, detail="exact split requires split_lines with amounts per member")
        parts = {}
        for ln in lines_in:
            if ln.member_id not in joined_ids:
                raise HTTPException(status_code=400, detail=f"Split: unknown member {ln.member_id}")
            parts[ln.member_id] = Decimal(str(ln.value)).quantize(Decimal("0.01"))
        total = sum(parts.values(), start=Decimal("0"))
        if abs(total - amount) > Decimal("0.02"):
            raise HTTPException(status_code=422, detail="exact split amounts must sum to the expense total")
    elif mode_norm == "percent":
        if not lines_in:
            raise HTTPException(status_code=422, detail="percent split requires split_lines with percentages")
        pcts: dict[str, Decimal] = {}
        for ln in lines_in:
            if ln.member_id not in joined_ids:
                raise HTTPException(status_code=400, detail=f"Split: unknown member {ln.member_id}")
            pcts[ln.member_id] = Decimal(str(ln.value)).quantize(Decimal("0.01"))
        s = sum(pcts.values(), start=Decimal("0"))
        if abs(s - Decimal("100")) > Decimal("0.05"):
            raise HTTPException(status_code=422, detail="percent values must sum to 100")
        total_cents = _decimal_to_cents(amount)
        mids = list(pcts.keys())
        running = 0
        out_cents: dict[str, int] = {}
        for i, mid in enumerate(mids):
            if i == len(mids) - 1:
                c = total_cents - running
            else:
                c = int((Decimal(total_cents) * pcts[mid] / Decimal("100")).quantize(Decimal("1")))
                c = max(0, min(c, total_cents - running))
            out_cents[mid] = c
            running += c
        parts = {mid: _cents_to_decimal(c) for mid, c in out_cents.items()}
    else:  # shares
        if not lines_in:
            raise HTTPException(status_code=422, detail="shares split requires split_lines with share weights")
        weights: dict[str, Decimal] = {}
        for ln in lines_in:
            if ln.member_id not in joined_ids:
                raise HTTPException(status_code=400, detail=f"Split: unknown member {ln.member_id}")
            w = Decimal(str(ln.value))
            if w <= 0:
                raise HTTPException(status_code=422, detail="share weights must be positive")
            weights[ln.member_id] = w
        wsum = sum(weights.values(), start=Decimal("0"))
        total_cents = _decimal_to_cents(amount)
        mids = list(weights.keys())
        running = 0
        out_cents = {}
        for i, mid in enumerate(mids):
            if i == len(mids) - 1:
                c = total_cents - running
            else:
                c = int((Decimal(total_cents) * weights[mid] / wsum).quantize(Decimal("1")))
                c = max(0, min(c, total_cents - running))
            out_cents[mid] = c
            running += c
        parts = {mid: _cents_to_decimal(c) for mid, c in out_cents.items()}

    payload = {
        "mode": mode_norm,
        "lines": [{"member_id": mid, "amount": float(amt)} for mid, amt in sorted(parts.items())],
    }
    return json.dumps(payload)


def _expense_split_lines_for_api(
    splits_json: str | None,
    split_mode: str,
    name_by_member: dict[str, str],
) -> tuple[str, list[GroupExpenseSplitDetailOut]]:
    mode = (split_mode or "equal").lower()
    lines_out: list[GroupExpenseSplitDetailOut] = []
    if splits_json:
        try:
            raw = json.loads(splits_json)
            if isinstance(raw, dict) and isinstance(raw.get("lines"), list):
                mode = str(raw.get("mode") or mode)
                for row in raw["lines"]:
                    if not isinstance(row, dict):
                        continue
                    mid = str(row.get("member_id") or "")
                    if not mid:
                        continue
                    amt = float(row.get("amount") or 0)
                    lines_out.append(
                        GroupExpenseSplitDetailOut(
                            member_id=mid,
                            display_name=name_by_member.get(mid),
                            amount=amt,
                        ),
                    )
        except json.JSONDecodeError:
            pass
    return mode, lines_out


def _group_invite_counts(session: Session, moment_id: str) -> tuple[int, int]:
    invites = session.scalars(
        select(GroupMomentInvite).where(GroupMomentInvite.moment_id == moment_id),
    ).all()
    joined = sum(1 for invite in invites if invite.status == "joined")
    return joined, len(invites)


def _group_raised_total(session: Session, moment_id: str) -> float:
    total = session.execute(
        select(func.coalesce(func.sum(GroupContribution.amount), 0)).where(
            GroupContribution.moment_id == moment_id,
        ),
    ).scalar_one()
    return float(total or 0)


def _group_out(session: Session, group_moment: GroupMoment) -> GroupMomentOut:
    joined_count, invited_count = _group_invite_counts(session, group_moment.moment_id)
    raised = _group_raised_total(session, group_moment.moment_id)
    return GroupMomentOut(
        moment_id=group_moment.moment_id,
        owner_uid=group_moment.owner_uid,
        title=group_moment.title,
        moment_type=group_moment.moment_type,
        target_amount=float(group_moment.target_amount) if group_moment.target_amount is not None else None,
        destination=group_moment.destination,
        trip_start_date=group_moment.trip_start_date,
        trip_end_date=group_moment.trip_end_date,
        split_mode=group_moment.split_mode,
        contribution_due_date=group_moment.contribution_due_date,
        status=group_moment.status,
        join_url=_invite_link_for_token(group_moment.join_token),
        joined_count=joined_count,
        invited_count=invited_count,
        raised_amount=raised,
    )


def _group_access(
    session: Session,
    moment_id: str,
    uid: str,
) -> tuple[GroupMoment, Literal["owner", "member"]] | None:
    gm = session.get(GroupMoment, moment_id)
    if gm is None:
        return None
    if gm.owner_uid == uid:
        return (gm, "owner")
    row = session.execute(
        select(GroupMomentMember)
        .where(GroupMomentMember.moment_id == moment_id)
        .where(GroupMomentMember.firebase_uid == uid)
        .where(GroupMomentMember.status == "joined"),
    ).scalar_one_or_none()
    if row is not None:
        return (gm, "member")
    return None


def _actor_display(session: Session, auth_user: dict[str, str | None]) -> str:
    uid = str(auth_user["uid"])
    u = session.get(AppUser, uid)
    if u is not None and u.display_name:
        return u.display_name
    em = auth_user.get("email") or ""
    return em.split("@")[0] if em else "Member"


def _seed_group_budget_categories(session: Session, group_moment: GroupMoment) -> None:
    t = group_moment.target_amount or Decimal("50000")
    mt = (group_moment.moment_type or "").lower()
    # Same category_key values everywhere so clients keep one icon/subcategory map;
    # labels shift with moment_type so non-trip groups still feel relevant.
    if any(k in mt for k in ("rent", "bills", "household", "flatshare", "roommate")):
        rows = [
            ("accommodation", "Rent & housing", Decimal("0.38")),
            ("food", "Groceries & meals", Decimal("0.20")),
            ("transport", "Commute & fuel", Decimal("0.12")),
            ("shopping", "Household supplies", Decimal("0.10")),
            ("activities", "Subscriptions & services", Decimal("0.14")),
            ("emergency", "Fees & unexpected", Decimal("0.06")),
        ]
    elif any(k in mt for k in ("food", "outing", "dining", "restaurant", "caf")):
        rows = [
            ("food", "Dining & cafés", Decimal("0.30")),
            ("activities", "Events & outings", Decimal("0.22")),
            ("transport", "Rides & commute", Decimal("0.16")),
            ("shopping", "Groceries & supplies", Decimal("0.16")),
            ("accommodation", "Venue / stays", Decimal("0.08")),
            ("emergency", "Unexpected", Decimal("0.08")),
        ]
    else:
        rows = [
            ("accommodation", "Accommodation", Decimal("0.30")),
            ("transport", "Transport", Decimal("0.16")),
            ("food", "Food & Dining", Decimal("0.16")),
            ("activities", "Activities", Decimal("0.20")),
            ("shopping", "Shopping", Decimal("0.10")),
            ("emergency", "Emergency", Decimal("0.08")),
        ]
    for i, (key, name, frac) in enumerate(rows):
        cap = (t * frac).quantize(Decimal("0.01"))
        session.add(
            GroupBudgetCategory(
                moment_id=group_moment.moment_id,
                category_key=key,
                display_name=name,
                cap_amount=cap,
                sort_order=i,
            ),
        )


def _ensure_group_budget_categories(session: Session, group_moment: GroupMoment) -> None:
    cnt = session.scalar(
        select(func.count())
        .select_from(GroupBudgetCategory)
        .where(GroupBudgetCategory.moment_id == group_moment.moment_id),
    )
    if (cnt or 0) == 0:
        _seed_group_budget_categories(session, group_moment)


def _log_group_activity(
    session: Session,
    moment_id: str,
    event_type: str,
    title: str,
    detail: str | None,
    actor_uid: str | None,
    actor_name: str | None,
    meta: dict[str, Any] | None = None,
) -> None:
    session.add(
        GroupActivityEvent(
            moment_id=moment_id,
            event_type=event_type,
            title=title,
            detail=detail,
            actor_uid=actor_uid,
            actor_name=actor_name,
            meta_json=meta or {},
        ),
    )


def _filter_duplicate_owner_placeholder_rows(
    session: Session,
    group_moment: GroupMoment,
    members: list[GroupMomentMember],
) -> list[GroupMomentMember]:
    """Drop name-only pending rows that duplicate the organiser (wizard / legacy data)."""
    owner_uid = group_moment.owner_uid
    if not any(m.firebase_uid == owner_uid and m.status == "joined" for m in members):
        return members
    u = session.get(AppUser, owner_uid)
    owner_dn = (u.display_name or "").strip().lower() if u is not None else ""
    owner_first = owner_dn.split()[0] if owner_dn else ""

    def should_drop(m: GroupMomentMember) -> bool:
        if m.firebase_uid is not None:
            return False
        if (m.email or "").strip():
            return False
        if m.status not in ("pending", "invited"):
            return False
        if m.role == "organiser":
            return True
        dn = (m.display_name or "").strip().lower()
        if not owner_dn or not dn:
            return False
        return (
            dn == owner_dn
            or (bool(owner_first) and dn == owner_first)
            or owner_dn.startswith(dn + " ")
            or (len(dn) >= 3 and dn in owner_dn)
        )

    return [m for m in members if not should_drop(m)]


def _build_group_detail(
    session: Session,
    group_moment: GroupMoment,
    access: Literal["owner", "member"],
) -> GroupMomentDetailOut:
    moment_id = group_moment.moment_id
    _ensure_group_budget_categories(session, group_moment)

    members = session.scalars(
        select(GroupMomentMember)
        .where(GroupMomentMember.moment_id == moment_id)
        .order_by(GroupMomentMember.created_at.asc()),
    ).all()
    members = _filter_duplicate_owner_placeholder_rows(session, group_moment, list(members))
    invites_list: list[GroupInviteOut] = []
    if access == "owner":
        invites = session.scalars(
            select(GroupMomentInvite)
            .where(GroupMomentInvite.moment_id == moment_id)
            .order_by(GroupMomentInvite.created_at.asc()),
        ).all()
        invites_list = [
            GroupInviteOut(
                invite_id=inv.invite_id,
                email=inv.email,
                status=inv.status,
                resend_count=inv.resend_count,
                sent_at=inv.sent_at,
                joined_at=inv.joined_at,
                last_error=inv.last_error,
            )
            for inv in invites
        ]

    contrib_sums: dict[str, Decimal] = defaultdict(lambda: Decimal(0))
    raised = Decimal(0)
    for mid, total in session.execute(
        select(GroupContribution.member_id, func.coalesce(func.sum(GroupContribution.amount), 0))
        .where(GroupContribution.moment_id == moment_id)
        .group_by(GroupContribution.member_id),
    ):
        contrib_sums[str(mid)] = Decimal(str(total))
        raised += Decimal(str(total))

    n_joined = sum(1 for m in members if m.status == "joined")
    target = group_moment.target_amount or Decimal(0)
    per_share = (target / Decimal(n_joined)).quantize(Decimal("0.01")) if n_joined > 0 and target > 0 else Decimal(0)

    ledger: list[GroupMemberLedgerOut] = []
    for m in members:
        ct = contrib_sums.get(m.member_id, Decimal(0))
        paid = bool(per_share > 0 and ct + Decimal("0.005") >= per_share) or bool(per_share == 0 and ct > 0)
        ledger.append(
            GroupMemberLedgerOut(
                member_id=m.member_id,
                firebase_uid=m.firebase_uid,
                display_name=m.display_name,
                email=m.email,
                role=m.role,
                status=m.status,
                joined_at=m.joined_at,
                expected_share=float(per_share),
                contributed_total=float(ct),
                paid=paid,
            ),
        )

    budgets = session.scalars(
        select(GroupBudgetCategory)
        .where(GroupBudgetCategory.moment_id == moment_id)
        .order_by(GroupBudgetCategory.sort_order.asc()),
    ).all()
    expenses = session.scalars(
        select(GroupExpense)
        .where(GroupExpense.moment_id == moment_id)
        .order_by(GroupExpense.created_at.desc()),
    ).all()

    spent_by_cat: dict[str, Decimal] = defaultdict(lambda: Decimal(0))
    total_spent = Decimal(0)
    for e in expenses:
        if e.status in ("approved", "pending"):
            spent_by_cat[e.category_key] += e.amount
            total_spent += e.amount

    budget_out = [
        GroupBudgetCategoryOut(
            category_id=b.category_id,
            category_key=b.category_key,
            display_name=b.display_name,
            cap_amount=float(b.cap_amount),
            spent_amount=float(spent_by_cat.get(b.category_key, Decimal(0))),
        )
        for b in budgets
    ]

    name_by_member = {m.member_id: m.display_name or m.email or "Member" for m in members}

    expense_out: list[GroupExpenseOut] = []
    for e in expenses:
        smode = getattr(e, "split_mode", None) or "equal"
        sjson = getattr(e, "splits_json", None)
        smode2, split_detail = _expense_split_lines_for_api(sjson, smode, name_by_member)
        expense_out.append(
            GroupExpenseOut(
                expense_id=e.expense_id,
                category_key=e.category_key,
                subcategory=e.subcategory,
                title=e.title,
                amount=float(e.amount),
                expense_date=e.expense_date,
                paid_by_member_id=e.paid_by_member_id,
                paid_by_name=name_by_member.get(e.paid_by_member_id or "", None) if e.paid_by_member_id else None,
                split_mode=smode2,
                split_lines=split_detail,
                status=e.status,
                has_receipt=bool(e.receipt_path),
                created_at=e.created_at,
            ),
        )

    contribs = session.scalars(
        select(GroupContribution)
        .where(GroupContribution.moment_id == moment_id)
        .order_by(GroupContribution.created_at.desc()),
    ).all()
    contrib_out = [
        GroupContributionOut(
            contribution_id=c.contribution_id,
            member_id=c.member_id,
            amount=float(c.amount),
            note=c.note,
            created_at=c.created_at,
        )
        for c in contribs
    ]

    activities = session.scalars(
        select(GroupActivityEvent)
        .where(GroupActivityEvent.moment_id == moment_id)
        .order_by(GroupActivityEvent.created_at.desc())
        .limit(80),
    ).all()
    act_out = [
        GroupActivityOut(
            activity_id=a.activity_id,
            event_type=a.event_type,
            title=a.title,
            detail=a.detail,
            actor_name=a.actor_name,
            created_at=a.created_at,
        )
        for a in activities
    ]

    last_at = activities[0].created_at if activities else None

    rules = GroupMomentRulesOut(
        send_payment_reminders=group_moment.send_payment_reminders,
        auto_notify_on_contribution=group_moment.auto_notify_on_contribution,
        allow_partial_payments=group_moment.allow_partial_payments,
        require_receipt_for_expenses=group_moment.require_receipt_for_expenses,
        require_organiser_approval=group_moment.require_organiser_approval,
    )

    return GroupMomentDetailOut(
        moment=_group_out(session, group_moment),
        members=ledger,
        invites=invites_list,
        rules=rules,
        budget_categories=budget_out,
        expenses=expense_out,
        contributions=contrib_out,
        activity=act_out,
        totals=GroupTotalsOut(
            raised_amount=float(raised),
            spent_expenses_amount=float(total_spent),
            last_activity_at=last_at,
        ),
    )


def _seed_budget_categories(session: Session, budget: BusinessBudget) -> None:
    total = budget.total_budget or Decimal(0)
    template: list[tuple[str, Decimal]] = [
        ("Digital Ads", Decimal("0.40")),
        ("Events", Decimal("0.30")),
        ("Tools", Decimal("0.10")),
        ("Travel", Decimal("0.20")),
    ]
    for i, (name, frac) in enumerate(template):
        alloc = (total * frac).quantize(Decimal("0.01")) if total > 0 else Decimal(0)
        session.add(
            BusinessBudgetCategory(
                budget_id=budget.budget_id,
                name=name,
                allocated_amount=alloc,
                spent_amount=Decimal(0),
                sort_order=i,
            ),
        )


def _norm_catalog_key(value: str) -> str:
    return "".join(ch for ch in value.lower().strip() if ch.isalnum() or ch.isspace()).strip()


def _seed_business_category_templates(session: Session, now: datetime | None = None) -> None:
    current = now or datetime.now(timezone.utc)
    for entry_kind, categories in BUSINESS_CATALOG_DEFAULTS.items():
        for idx, cat in enumerate(categories):
            template_id = str(cat["template_category_id"])
            template = session.get(BusinessCategoryTemplate, template_id)
            if template is None:
                template = BusinessCategoryTemplate(
                    template_category_id=template_id,
                    entry_kind=entry_kind,
                    name=str(cat["name"])[:120],
                    sort_order=idx,
                    is_active=True,
                    created_at=current,
                    updated_at=current,
                )
                session.add(template)
            else:
                template.entry_kind = entry_kind
                template.name = str(cat["name"])[:120]
                template.sort_order = idx
                template.is_active = True
                template.updated_at = current
            for sub_idx, sub in enumerate(cat.get("subcategories", [])):
                sub_name = str(sub).strip()
                existing = session.scalar(
                    select(BusinessCategoryTemplateSubcategory)
                    .where(BusinessCategoryTemplateSubcategory.template_category_id == template_id)
                    .where(func.lower(BusinessCategoryTemplateSubcategory.name) == sub_name.lower())
                    .limit(1),
                )
                if existing is None:
                    session.add(
                        BusinessCategoryTemplateSubcategory(
                            template_subcategory_id=uuid4().hex,
                            template_category_id=template_id,
                            name=sub_name[:120],
                            sort_order=sub_idx,
                            is_active=True,
                            created_at=current,
                            updated_at=current,
                        ),
                    )
                else:
                    existing.sort_order = sub_idx
                    existing.is_active = True
                    existing.updated_at = current


def _choose_budget_category_for_template(
    budget_categories: list[BusinessBudgetCategory],
    entry_kind: str,
    template_name: str,
) -> str | None:
    if not budget_categories:
        return None
    preferred_keys = (
        ["purchase", "inventory", "stock", "material", "procurement"]
        if entry_kind == "purchase"
        else ["expense", "operations", "marketing", "payroll", "logistics", "admin"]
    )
    name_keys = [_norm_catalog_key(template_name), template_name.lower()]
    for cat in budget_categories:
        label = (cat.name or "").lower()
        if any(key and key in label for key in preferred_keys) and any(key and key in label for key in name_keys):
            return cat.category_id
    for cat in budget_categories:
        label = (cat.name or "").lower()
        if any(key and key in label for key in preferred_keys):
            return cat.category_id
    return budget_categories[0].category_id


def _ensure_business_budget_catalog(session: Session, budget_id: str, now: datetime | None = None) -> None:
    current = now or datetime.now(timezone.utc)
    _seed_business_category_templates(session, now=current)
    budget_categories = session.scalars(
        select(BusinessBudgetCategory)
        .where(BusinessBudgetCategory.budget_id == budget_id)
        .order_by(BusinessBudgetCategory.sort_order, BusinessBudgetCategory.category_id),
    ).all()
    if not budget_categories:
        return
    templates = session.scalars(
        select(BusinessCategoryTemplate)
        .where(BusinessCategoryTemplate.is_active.is_(True))
        .order_by(BusinessCategoryTemplate.entry_kind, BusinessCategoryTemplate.sort_order, BusinessCategoryTemplate.name),
    ).all()
    for tmpl in templates:
        existing_mapping = session.scalar(
            select(BusinessBudgetCategoryMapping)
            .where(BusinessBudgetCategoryMapping.budget_id == budget_id)
            .where(BusinessBudgetCategoryMapping.entry_kind == tmpl.entry_kind)
            .where(BusinessBudgetCategoryMapping.template_category_id == tmpl.template_category_id)
            .limit(1),
        )
        if existing_mapping is None:
            picked_category_id = _choose_budget_category_for_template(
                budget_categories=budget_categories,
                entry_kind=tmpl.entry_kind,
                template_name=tmpl.name,
            )
            if picked_category_id is None:
                continue
            session.add(
                BusinessBudgetCategoryMapping(
                    budget_id=budget_id,
                    entry_kind=tmpl.entry_kind,
                    template_category_id=tmpl.template_category_id,
                    budget_category_id=picked_category_id,
                    sort_order=tmpl.sort_order,
                    is_active=True,
                    created_at=current,
                    updated_at=current,
                ),
            )
        else:
            existing_mapping.sort_order = tmpl.sort_order
            existing_mapping.updated_at = current


def _build_business_catalog(session: Session, budget_id: str) -> BusinessCatalogOut:
    _ensure_business_budget_catalog(session, budget_id)
    templates = session.scalars(
        select(BusinessCategoryTemplate)
        .where(BusinessCategoryTemplate.is_active.is_(True))
        .order_by(BusinessCategoryTemplate.entry_kind, BusinessCategoryTemplate.sort_order, BusinessCategoryTemplate.name),
    ).all()
    template_by_id: dict[str, BusinessCategoryTemplate] = {row.template_category_id: row for row in templates}
    mapping_rows = session.scalars(
        select(BusinessBudgetCategoryMapping)
        .where(BusinessBudgetCategoryMapping.budget_id == budget_id)
        .where(BusinessBudgetCategoryMapping.is_active.is_(True))
        .order_by(
            BusinessBudgetCategoryMapping.entry_kind,
            BusinessBudgetCategoryMapping.sort_order,
            BusinessBudgetCategoryMapping.mapping_id,
        ),
    ).all()
    custom_sub_rows = session.scalars(
        select(BusinessBudgetSubcategory)
        .where(BusinessBudgetSubcategory.budget_id == budget_id)
        .where(BusinessBudgetSubcategory.is_active.is_(True))
        .order_by(
            BusinessBudgetSubcategory.entry_kind,
            BusinessBudgetSubcategory.template_category_id,
            BusinessBudgetSubcategory.sort_order,
            BusinessBudgetSubcategory.budget_subcategory_id,
        ),
    ).all()
    custom_map: dict[tuple[str, str], list[str]] = defaultdict(list)
    for row in custom_sub_rows:
        key = (row.entry_kind, row.template_category_id)
        name = (row.name or "").strip()
        if name and name not in custom_map[key]:
            custom_map[key].append(name)

    template_subs = session.scalars(
        select(BusinessCategoryTemplateSubcategory)
        .where(BusinessCategoryTemplateSubcategory.is_active.is_(True))
        .order_by(
            BusinessCategoryTemplateSubcategory.template_category_id,
            BusinessCategoryTemplateSubcategory.sort_order,
            BusinessCategoryTemplateSubcategory.template_subcategory_id,
        ),
    ).all()
    template_sub_map: dict[str, list[str]] = defaultdict(list)
    for row in template_subs:
        name = (row.name or "").strip()
        if name and name not in template_sub_map[row.template_category_id]:
            template_sub_map[row.template_category_id].append(name)

    payload = BusinessCatalogOut()
    for mapping in mapping_rows:
        tmpl = template_by_id.get(mapping.template_category_id)
        if tmpl is None:
            continue
        sub_list = custom_map.get((mapping.entry_kind, mapping.template_category_id))
        if not sub_list:
            sub_list = template_sub_map.get(mapping.template_category_id, [])
        out_row = BusinessCatalogCategoryOut(
            template_category_id=mapping.template_category_id,
            budget_category_id=mapping.budget_category_id,
            name=tmpl.name,
            entry_kind=mapping.entry_kind,
            sort_order=mapping.sort_order,
            active=bool(mapping.is_active),
            subcategories=sub_list or [],
        )
        if mapping.entry_kind == "purchase":
            payload.purchase.append(out_row)
        else:
            payload.expense.append(out_row)
    return payload


def _validate_business_catalog_submission(
    session: Session,
    budget_id: str,
    entry_kind: str,
    category_id: str,
    subcategory_label: str,
) -> str:
    catalog = _build_business_catalog(session, budget_id)
    category_pool = catalog.purchase if entry_kind == "purchase" else catalog.expense
    if not category_pool:
        raise HTTPException(status_code=422, detail=f"No {entry_kind} categories configured for this budget")
    selected = next((item for item in category_pool if item.budget_category_id == category_id and item.active), None)
    if selected is None:
        raise HTTPException(status_code=422, detail="Selected budget category is not mapped to this entry type")
    raw_label = (subcategory_label or "").strip()
    if not raw_label:
        raise HTTPException(status_code=422, detail="Subcategory is required")
    if "·" in raw_label:
        maybe_category, maybe_sub = [seg.strip() for seg in raw_label.split("·", 1)]
        # Category id is authoritative; tolerate stale/mismatched category prefix in submitted label.
        # Clients can briefly drift between catalog refreshes and still provide a valid subcategory.
        normalized_sub = maybe_sub
    else:
        normalized_sub = raw_label
    normalized_sub_key = _norm_catalog_key(normalized_sub)
    matched_sub = next(
        (sub for sub in selected.subcategories if _norm_catalog_key(sub) == normalized_sub_key),
        None,
    )
    if matched_sub is None:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid subcategory for {selected.name}. Please refresh and choose a valid option.",
        )
    return f"{selected.name} · {matched_sub}"


def _ensure_default_categories(session: Session, budget: BusinessBudget) -> None:
    cnt = session.scalar(
        select(func.count())
        .select_from(BusinessBudgetCategory)
        .where(BusinessBudgetCategory.budget_id == budget.budget_id),
    )
    if (cnt or 0) > 0:
        _ensure_business_budget_catalog(session, budget.budget_id)
        return
    _seed_budget_categories(session, budget)
    _ensure_business_budget_catalog(session, budget.budget_id)


def _sync_budget_spent_from_categories(session: Session, budget_id: str) -> None:
    total = session.scalar(
        select(func.coalesce(func.sum(BusinessBudgetCategory.spent_amount), 0)).where(
            BusinessBudgetCategory.budget_id == budget_id,
        ),
    )
    budget = session.get(BusinessBudget, budget_id)
    if budget is not None:
        budget.spent_amount = Decimal(str(total or 0))
        budget.updated_at = datetime.now(timezone.utc)


def _json_object_or_empty(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        s = raw.strip()
        if not s:
            return {}
        try:
            parsed = json.loads(s)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _budget_policies_dict(budget: BusinessBudget) -> dict[str, Any]:
    return _json_object_or_empty(budget.spending_policies_json)


def _default_reminder_prefs_json() -> str:
    return BusinessBudgetReminderPrefsOut().model_dump_json()


def _reminder_prefs_out(budget: BusinessBudget) -> BusinessBudgetReminderPrefsOut:
    raw = _json_object_or_empty(budget.reminder_prefs_json)
    base = BusinessBudgetReminderPrefsOut().model_dump()
    for k in base:
        if k in raw and isinstance(raw[k], bool):
            base[k] = raw[k]
    return BusinessBudgetReminderPrefsOut.model_validate(base)


def _merge_reminder_prefs_json(existing: Any, patch: BusinessBudgetReminderPrefsPatch | None) -> str:
    if patch is None:
        if isinstance(existing, str):
            return existing.strip() if existing.strip() else _default_reminder_prefs_json()
        return json.dumps(_json_object_or_empty(existing) or BusinessBudgetReminderPrefsOut().model_dump())
    raw = _json_object_or_empty(existing)
    defaults = BusinessBudgetReminderPrefsOut().model_dump()
    merged: dict[str, Any] = {**defaults, **{k: v for k, v in raw.items() if k in defaults}}
    pdata = patch.model_dump(exclude_unset=True)
    for k, v in pdata.items():
        if v is not None:
            merged[k] = v
    return json.dumps(merged)


def _append_budget_audit(
    session: Session,
    budget_id: str,
    actor_uid: str,
    action: str,
    payload: dict[str, Any] | None = None,
) -> None:
    now = datetime.now(timezone.utc)
    session.add(
        BusinessBudgetAuditEvent(
            budget_id=budget_id,
            actor_uid=actor_uid,
            action=action,
            payload_json=json.dumps(payload or {}),
            created_at=now,
        ),
    )


def _approval_to_out(p: BusinessBudgetApproval) -> BusinessBudgetPendingApprovalOut:
    payment_splits = _json_object_or_empty(p.payment_splits_json) if p.payment_splits_json else {}
    payment_split_rows = payment_splits.get("rows") if isinstance(payment_splits, dict) else []
    if not isinstance(payment_split_rows, list):
        payment_split_rows = []
    return BusinessBudgetPendingApprovalOut(
        approval_id=p.approval_id,
        title=p.title,
        requester_name=p.requester_name,
        amount=float(p.amount or 0),
        submitter_uid=p.submitter_uid,
        approver_uid=p.approver_uid,
        department=p.department,
        category_id=p.category_id,
        subcategory_label=p.subcategory_label,
        entry_kind=p.entry_kind or p.expense_or_purchase or "expense",
        paid_mode=p.paid_mode,
        purchase_payment_status=p.purchase_payment_status,
        quantity=float(p.quantity) if p.quantity is not None else None,
        unit=p.unit,
        price_per_unit=float(p.price_per_unit) if p.price_per_unit is not None else None,
        total_amount=float(p.total_amount) if p.total_amount is not None else None,
        paid_amount=float(p.paid_amount) if p.paid_amount is not None else None,
        vendor_balance_amount=float(p.vendor_balance_amount) if p.vendor_balance_amount is not None else None,
        payment_splits=[
            row
            for row in payment_split_rows
            if isinstance(row, dict) and row.get("method") and row.get("amount") is not None
        ],
        vendor_name=p.vendor_name,
        invoice_number=p.invoice_number,
        expense_or_purchase=p.expense_or_purchase or "expense",
        payment_mode=p.payment_mode,
        due_date=p.due_date,
        gstin=p.gstin,
        tax_amount=float(p.tax_amount) if p.tax_amount is not None else None,
        receipt_name=p.receipt_name,
        receipt_attached=bool(p.receipt_attached),
        receipt_verified=bool(p.receipt_verified),
        receipt_followup_requested=bool(p.receipt_followup_requested),
        status=p.status,
        resolved_at=p.resolved_at,
    )


def _get_owned_budget(session: Session, budget_id: str, owner_uid: str) -> BusinessBudget:
    budget = session.get(BusinessBudget, budget_id)
    if budget is None or budget.owner_uid != owner_uid:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget


def _ensure_owner_member_record(
    session: Session,
    budget_id: str,
    uid: str,
    now: datetime,
    email: str | None,
    display_name: str | None,
) -> None:
    existing = session.scalar(
        select(BusinessBudgetMember)
        .where(BusinessBudgetMember.budget_id == budget_id)
        .where(BusinessBudgetMember.firebase_uid == uid)
        .order_by(desc(BusinessBudgetMember.created_at))
        .limit(1),
    )
    if existing is not None:
        existing.role = "owner"
        existing.is_added = True
        existing.invite_status = "joined"
        existing.joined_at = existing.joined_at or now
        if email and not existing.email:
            existing.email = email
        if display_name and not existing.display_name:
            existing.display_name = display_name
        return
    session.add(
        BusinessBudgetMember(
            budget_id=budget_id,
            firebase_uid=uid,
            email=email,
            initials=None,
            display_name=display_name or "Owner",
            role="owner",
            spend_limit=None,
            is_added=True,
            invite_status="joined",
            invited_at=now,
            joined_at=now,
            created_at=now,
        ),
    )


def _normalize_vendor_name(raw: str | None) -> str | None:
    name = (raw or "").strip()
    if not name:
        return None
    return name[:200]


def _ensure_business_vendor(
    session: Session,
    budget_id: str,
    vendor_name: str | None,
    created_by_uid: str | None,
    now: datetime,
) -> None:
    vname = _normalize_vendor_name(vendor_name)
    if not vname:
        return
    existing = session.scalar(
        select(BusinessBudgetVendor)
        .where(BusinessBudgetVendor.budget_id == budget_id)
        .where(func.lower(BusinessBudgetVendor.vendor_name) == vname.lower())
        .limit(1),
    )
    if existing is not None:
        return
    session.add(
        BusinessBudgetVendor(
            budget_id=budget_id,
            vendor_name=vname,
            created_by_uid=created_by_uid,
            created_at=now,
        ),
    )


def _normalize_payment_splits(raw: list[dict[str, Any]] | None) -> list[dict[str, float | str]]:
    rows = raw or []
    out: list[dict[str, float | str]] = []
    seen: set[str] = set()
    for item in rows:
        if not isinstance(item, dict):
            continue
        method = str(item.get("method") or "").strip().lower()
        if method not in BUSINESS_PAYMENT_METHOD_VALUES:
            continue
        if method in seen:
            raise HTTPException(status_code=422, detail=f"Duplicate payment method: {method}")
        amt_raw = item.get("amount")
        try:
            amt_dec = Decimal(str(amt_raw)).quantize(Decimal("0.01"))
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Invalid payment split amount for {method}") from exc
        if amt_dec <= 0:
            raise HTTPException(status_code=422, detail=f"Payment split amount must be positive for {method}")
        seen.add(method)
        out.append({"method": method, "amount": float(amt_dec)})
    return out


def _payment_split_total(splits: list[dict[str, float | str]]) -> Decimal:
    total = Decimal("0")
    for row in splits:
        total += Decimal(str(row.get("amount", 0))).quantize(Decimal("0.01"))
    return total


def _business_budget_out(
    session: Session,
    budget: BusinessBudget,
    viewer_uid: str | None = None,
    fallback_invited_count: int | None = None,
) -> BusinessBudgetCreateOut:
    members = session.scalars(
        select(BusinessBudgetMember).where(BusinessBudgetMember.budget_id == budget.budget_id),
    ).all()
    added_members = [member for member in members if member.is_added]
    invited_members_count = fallback_invited_count if fallback_invited_count is not None else len(added_members)

    cats = session.scalars(
        select(BusinessBudgetCategory)
        .where(BusinessBudgetCategory.budget_id == budget.budget_id)
        .order_by(BusinessBudgetCategory.sort_order, BusinessBudgetCategory.category_id),
    ).all()
    pending_rows = session.scalars(
        select(BusinessBudgetApproval)
        .where(
            BusinessBudgetApproval.budget_id == budget.budget_id,
            BusinessBudgetApproval.status == "pending",
        )
        .order_by(BusinessBudgetApproval.created_at.desc()),
    ).all()

    approved_expense_count = (
        session.scalar(
            select(func.count())
            .select_from(BusinessBudgetApproval)
            .where(
                BusinessBudgetApproval.budget_id == budget.budget_id,
                BusinessBudgetApproval.status == "approved",
            ),
        )
        or 0
    )

    recent_rows = session.scalars(
        select(BusinessBudgetApproval)
        .where(
            BusinessBudgetApproval.budget_id == budget.budget_id,
            BusinessBudgetApproval.status == "approved",
        )
        .order_by(
            func.coalesce(
                BusinessBudgetApproval.resolved_at,
                BusinessBudgetApproval.created_at,
            ).desc(),
        )
        .limit(10),
    ).all()
    my_rows: list[BusinessBudgetApproval] = []
    if viewer_uid:
        my_rows = session.scalars(
            select(BusinessBudgetApproval)
            .where(
                BusinessBudgetApproval.budget_id == budget.budget_id,
                BusinessBudgetApproval.submitter_uid == viewer_uid,
            )
            .order_by(BusinessBudgetApproval.created_at.desc())
            .limit(20),
        ).all()

    pending_count = (
        session.scalar(
            select(func.count())
            .select_from(BusinessBudgetApproval)
            .where(
                BusinessBudgetApproval.budget_id == budget.budget_id,
                BusinessBudgetApproval.status == "pending",
            ),
        )
        or 0
    )
    rejected_count = (
        session.scalar(
            select(func.count())
            .select_from(BusinessBudgetApproval)
            .where(
                BusinessBudgetApproval.budget_id == budget.budget_id,
                BusinessBudgetApproval.status == "rejected",
            ),
        )
        or 0
    )
    my_pending_count = (
        session.scalar(
            select(func.count())
            .select_from(BusinessBudgetApproval)
            .where(
                BusinessBudgetApproval.budget_id == budget.budget_id,
                BusinessBudgetApproval.submitter_uid == viewer_uid,
                BusinessBudgetApproval.status == "pending",
            ),
        )
        if viewer_uid
        else 0
    ) or 0
    my_total_submissions = (
        session.scalar(
            select(func.count())
            .select_from(BusinessBudgetApproval)
            .where(
                BusinessBudgetApproval.budget_id == budget.budget_id,
                BusinessBudgetApproval.submitter_uid == viewer_uid,
            ),
        )
        if viewer_uid
        else 0
    ) or 0
    vendor_rows = session.scalars(
        select(BusinessBudgetApproval)
        .where(BusinessBudgetApproval.budget_id == budget.budget_id)
        .where(BusinessBudgetApproval.vendor_name.is_not(None))
        .where(BusinessBudgetApproval.status != "rejected")
        .order_by(BusinessBudgetApproval.created_at.desc()),
    ).all()
    vendor_acc: dict[str, dict[str, Decimal]] = {}
    for row in vendor_rows:
        vname = (row.vendor_name or "").strip()
        if not vname:
            continue
        bucket = vendor_acc.setdefault(
            vname,
            {"total": Decimal("0"), "paid": Decimal("0"), "balance": Decimal("0")},
        )
        total_val = row.total_amount if row.total_amount is not None else row.amount or Decimal("0")
        paid_val = row.paid_amount or Decimal("0")
        balance_val = row.vendor_balance_amount if row.vendor_balance_amount is not None else (total_val - paid_val)
        if balance_val < 0:
            balance_val = Decimal("0")
        bucket["total"] += total_val
        bucket["paid"] += paid_val
        bucket["balance"] += balance_val
    vendor_records = session.scalars(
        select(BusinessBudgetVendor)
        .where(BusinessBudgetVendor.budget_id == budget.budget_id)
        .order_by(BusinessBudgetVendor.vendor_name.asc()),
    ).all()
    vendor_names_from_records = {
        (v.vendor_name or "").strip().lower(): v
        for v in vendor_records
        if (v.vendor_name or "").strip()
    }
    vendor_names_from_approvals = {
        k.strip()
        for k in vendor_acc.keys()
        if k.strip() and k.strip().lower() not in vendor_names_from_records
    }
    merged_vendors: list[BusinessVendorOut] = [
        BusinessVendorOut(
            vendor_id=v.vendor_id,
            vendor_name=v.vendor_name,
        )
        for v in vendor_records
    ] + [
        BusinessVendorOut(
            vendor_id="",
            vendor_name=name,
        )
        for name in sorted(vendor_names_from_approvals, key=lambda x: x.lower())
    ]

    return BusinessBudgetCreateOut(
        budget_id=budget.budget_id,
        budget_name=budget.budget_name,
        budget_type=budget.budget_type,
        total_budget=float(budget.total_budget) if budget.total_budget is not None else None,
        budget_period=budget.budget_period,
        department=budget.department,
        approval_threshold=float(budget.approval_threshold) if budget.approval_threshold is not None else None,
        spent_amount=float(budget.spent_amount or 0),
        status=budget.status,
        expenses_blocked=bool(budget.expenses_blocked),
        team_members_count=len(added_members),
        invited_members_count=invited_members_count,
        categories=[
            BusinessBudgetCategoryOut(
                category_id=c.category_id,
                name=c.name,
                allocated_amount=float(c.allocated_amount or 0),
                spent_amount=float(c.spent_amount or 0),
            )
            for c in cats
        ],
        pending_approvals=[_approval_to_out(p) for p in pending_rows],
        recent_approvals=[_approval_to_out(p) for p in recent_rows],
        my_submissions=[_approval_to_out(p) for p in my_rows],
        approval_summary=BusinessBudgetApprovalSummaryOut(
            pending_count=int(pending_count),
            approved_count=int(approved_expense_count),
            rejected_count=int(rejected_count),
            my_pending_count=int(my_pending_count),
            my_total_submissions=int(my_total_submissions),
        ),
        vendor_balances=[
            BusinessVendorBalanceOut(
                vendor_name=k,
                total_amount=float(v["total"]),
                paid_amount=float(v["paid"]),
                balance_amount=float(v["balance"]),
            )
            for k, v in sorted(vendor_acc.items(), key=lambda item: item[0].lower())
        ],
        vendors=merged_vendors,
        approved_expense_count=int(approved_expense_count),
        team_members=[
            BusinessBudgetTeamMemberOut(
                member_id=m.member_id,
                display_name=m.display_name,
                role=m.role,
                firebase_uid=m.firebase_uid,
                email=m.email,
                spend_limit=m.spend_limit,
                is_added=bool(m.is_added),
                invite_status=m.invite_status,
                joined_at=m.joined_at,
            )
            for m in sorted(members, key=lambda x: x.created_at)
        ],
        reminder_prefs=_reminder_prefs_out(budget),
    )


def _business_approval_queue_out(
    session: Session,
    budget_id: str,
    viewer_uid: str,
) -> BusinessApprovalQueueOut:
    pending_rows = session.scalars(
        select(BusinessBudgetApproval)
        .where(
            BusinessBudgetApproval.budget_id == budget_id,
            BusinessBudgetApproval.status == "pending",
        )
        .order_by(BusinessBudgetApproval.created_at.desc())
        .limit(100),
    ).all()
    my_rows = session.scalars(
        select(BusinessBudgetApproval)
        .where(
            BusinessBudgetApproval.budget_id == budget_id,
            BusinessBudgetApproval.submitter_uid == viewer_uid,
        )
        .order_by(BusinessBudgetApproval.created_at.desc())
        .limit(100),
    ).all()
    approved_count = (
        session.scalar(
            select(func.count())
            .select_from(BusinessBudgetApproval)
            .where(
                BusinessBudgetApproval.budget_id == budget_id,
                BusinessBudgetApproval.status == "approved",
            ),
        )
        or 0
    )
    rejected_count = (
        session.scalar(
            select(func.count())
            .select_from(BusinessBudgetApproval)
            .where(
                BusinessBudgetApproval.budget_id == budget_id,
                BusinessBudgetApproval.status == "rejected",
            ),
        )
        or 0
    )
    my_pending_count = sum(1 for r in my_rows if r.status == "pending")
    return BusinessApprovalQueueOut(
        pending_approvals=[_approval_to_out(p) for p in pending_rows],
        my_submissions=[_approval_to_out(p) for p in my_rows],
        approval_summary=BusinessBudgetApprovalSummaryOut(
            pending_count=len(pending_rows),
            approved_count=int(approved_count),
            rejected_count=int(rejected_count),
            my_pending_count=int(my_pending_count),
            my_total_submissions=len(my_rows),
        ),
    )


def _csv_cell(val: Any) -> str:
    s = "" if val is None else str(val)
    if any(c in s for c in ',"\r\n'):
        return '"' + s.replace('"', '""') + '"'
    return s


def _build_budget_export_csv(session: Session, budget_id: str) -> str:
    budget = session.get(BusinessBudget, budget_id)
    bname = budget.budget_name if budget else budget_id
    lines: list[str] = [
        f"Budget,{_csv_cell(bname)}",
        "",
        "Categories",
        "category_id,name,allocated_amount,spent_amount",
    ]
    cats = session.scalars(
        select(BusinessBudgetCategory)
        .where(BusinessBudgetCategory.budget_id == budget_id)
        .order_by(BusinessBudgetCategory.sort_order, BusinessBudgetCategory.category_id),
    ).all()
    for c in cats:
        lines.append(
            ",".join(
                [
                    _csv_cell(c.category_id),
                    _csv_cell(c.name),
                    _csv_cell(float(c.allocated_amount or 0)),
                    _csv_cell(float(c.spent_amount or 0)),
                ],
            ),
        )
    lines.extend(
        [
            "",
            "Expenses (approval workflow)",
            "approval_id,status,title,requester,amount,entry_kind,paid_mode,purchase_payment_status,quantity,unit,price_per_unit,total_amount,paid_amount,vendor_balance_amount,payment_splits_json,expense_or_purchase,vendor_name,invoice_number,payment_mode,due_date,gstin,tax_amount,submitter_uid,approver_uid,subcategory,created_at,resolved_at",
        ],
    )
    approvals = session.scalars(
        select(BusinessBudgetApproval)
        .where(BusinessBudgetApproval.budget_id == budget_id)
        .order_by(BusinessBudgetApproval.created_at.desc()),
    ).all()
    for a in approvals:
        lines.append(
            ",".join(
                [
                    _csv_cell(a.approval_id),
                    _csv_cell(a.status),
                    _csv_cell(a.title),
                    _csv_cell(a.requester_name),
                    _csv_cell(float(a.amount or 0)),
                    _csv_cell(a.entry_kind or ""),
                    _csv_cell(a.paid_mode or ""),
                    _csv_cell(a.purchase_payment_status or ""),
                    _csv_cell(float(a.quantity) if a.quantity is not None else ""),
                    _csv_cell(a.unit or ""),
                    _csv_cell(float(a.price_per_unit) if a.price_per_unit is not None else ""),
                    _csv_cell(float(a.total_amount) if a.total_amount is not None else ""),
                    _csv_cell(float(a.paid_amount) if a.paid_amount is not None else ""),
                    _csv_cell(float(a.vendor_balance_amount) if a.vendor_balance_amount is not None else ""),
                    _csv_cell(a.payment_splits_json or ""),
                    _csv_cell(a.expense_or_purchase),
                    _csv_cell(a.vendor_name or ""),
                    _csv_cell(a.invoice_number or ""),
                    _csv_cell(a.payment_mode or ""),
                    _csv_cell(a.due_date.isoformat() if a.due_date else ""),
                    _csv_cell(a.gstin or ""),
                    _csv_cell(float(a.tax_amount) if a.tax_amount is not None else ""),
                    _csv_cell(a.submitter_uid or ""),
                    _csv_cell(a.approver_uid or ""),
                    _csv_cell(a.subcategory_label or ""),
                    _csv_cell(a.created_at.isoformat() if a.created_at else ""),
                    _csv_cell(a.resolved_at.isoformat() if a.resolved_at else ""),
                ],
            ),
        )
    return "\n".join(lines)


app = FastAPI(title="Momentra Backend", version="0.2.0")

_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
if _cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.on_event("startup")
def _on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    uses_sqlite = DATABASE_URL.startswith("sqlite")
    if uses_sqlite:
        with engine.begin() as conn:
            rows = conn.execute(text("PRAGMA table_info(business_budgets)")).fetchall()
            col_names = {str(r[1]) for r in rows}
            if "reminder_prefs_json" not in col_names:
                conn.execute(
                    text("ALTER TABLE business_budgets ADD COLUMN reminder_prefs_json TEXT NOT NULL DEFAULT '{}'"),
                )
            budget_rows = conn.execute(text("PRAGMA table_info(business_budgets)")).fetchall()
            budget_cols = {str(r[1]) for r in budget_rows}
            if "join_token" not in budget_cols:
                conn.execute(text("ALTER TABLE business_budgets ADD COLUMN join_token TEXT"))
            member_rows = conn.execute(text("PRAGMA table_info(business_budget_members)")).fetchall()
            member_cols = {str(r[1]) for r in member_rows}
            if "firebase_uid" not in member_cols:
                conn.execute(text("ALTER TABLE business_budget_members ADD COLUMN firebase_uid TEXT"))
            if "email" not in member_cols:
                conn.execute(text("ALTER TABLE business_budget_members ADD COLUMN email TEXT"))
            if "invite_status" not in member_cols:
                conn.execute(
                    text("ALTER TABLE business_budget_members ADD COLUMN invite_status TEXT NOT NULL DEFAULT 'pending'"),
                )
            if "joined_at" not in member_cols:
                conn.execute(text("ALTER TABLE business_budget_members ADD COLUMN joined_at TEXT"))
            if "invite_token" not in member_cols:
                conn.execute(text("ALTER TABLE business_budget_members ADD COLUMN invite_token TEXT"))
            conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS business_budget_vendors ("
                    "vendor_id TEXT PRIMARY KEY,"
                    "budget_id TEXT NOT NULL,"
                    "vendor_name TEXT NOT NULL,"
                    "created_by_uid TEXT,"
                    "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"
                    ")",
                ),
            )
            conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_business_budget_vendors_budget_id ON business_budget_vendors(budget_id)"),
            )
            approval_rows = conn.execute(text("PRAGMA table_info(business_budget_approvals)")).fetchall()
            approval_cols = {str(r[1]) for r in approval_rows}
            if "submitter_uid" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN submitter_uid TEXT"))
            if "vendor_name" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN vendor_name TEXT"))
            if "invoice_number" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN invoice_number TEXT"))
            if "expense_or_purchase" not in approval_cols:
                conn.execute(
                    text("ALTER TABLE business_budget_approvals ADD COLUMN expense_or_purchase TEXT NOT NULL DEFAULT 'expense'"),
                )
            if "payment_mode" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN payment_mode TEXT"))
            if "due_date" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN due_date TEXT"))
            if "gstin" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN gstin TEXT"))
            if "tax_amount" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN tax_amount NUMERIC(12,2)"))
            if "approver_uid" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN approver_uid TEXT"))
            if "entry_kind" not in approval_cols:
                conn.execute(
                    text("ALTER TABLE business_budget_approvals ADD COLUMN entry_kind TEXT NOT NULL DEFAULT 'expense'"),
                )
            if "paid_mode" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN paid_mode TEXT"))
            if "purchase_payment_status" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN purchase_payment_status TEXT"))
            if "quantity" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN quantity NUMERIC(12,3)"))
            if "unit" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN unit TEXT"))
            if "price_per_unit" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN price_per_unit NUMERIC(12,3)"))
            if "total_amount" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN total_amount NUMERIC(12,2)"))
            if "paid_amount" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN paid_amount NUMERIC(12,2)"))
            if "vendor_balance_amount" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN vendor_balance_amount NUMERIC(12,2)"))
            if "payment_splits_json" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN payment_splits_json TEXT"))
            if "receipt_path" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN receipt_path TEXT"))
            if "receipt_mime" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN receipt_mime TEXT"))
            if "receipt_name" not in approval_cols:
                conn.execute(text("ALTER TABLE business_budget_approvals ADD COLUMN receipt_name TEXT"))
            txn_rows = conn.execute(text("PRAGMA table_info(personal_transactions)")).fetchall()
            txn_cols = {str(r[1]) for r in txn_rows}
            if "subcategory_id" not in txn_cols:
                conn.execute(text("ALTER TABLE personal_transactions ADD COLUMN subcategory_id TEXT"))
            if "subcategory_label" not in txn_cols:
                conn.execute(text("ALTER TABLE personal_transactions ADD COLUMN subcategory_label TEXT"))
            gm_rows = conn.execute(text("PRAGMA table_info(group_moments)")).fetchall()
            gm_cols = {str(r[1]) for r in gm_rows}
            if gm_rows and "milestones_json" not in gm_cols:
                conn.execute(text("ALTER TABLE group_moments ADD COLUMN milestones_json TEXT"))
    else:
        with engine.begin() as conn:
            conn.execute(
                text("ALTER TABLE personal_transactions ADD COLUMN IF NOT EXISTS subcategory_id TEXT"),
            )
            conn.execute(
                text("ALTER TABLE personal_transactions ADD COLUMN IF NOT EXISTS subcategory_label TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_members ADD COLUMN IF NOT EXISTS firebase_uid TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_members ADD COLUMN IF NOT EXISTS email TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_members ADD COLUMN IF NOT EXISTS invite_status TEXT NOT NULL DEFAULT 'pending'"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ"),
            )
            conn.execute(
                text("ALTER TABLE business_budgets ADD COLUMN IF NOT EXISTS join_token TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_members ADD COLUMN IF NOT EXISTS invite_token TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS submitter_uid TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS vendor_name TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS invoice_number TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS expense_or_purchase TEXT NOT NULL DEFAULT 'expense'"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS payment_mode TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS due_date DATE"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS gstin TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2)"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS approver_uid TEXT"),
            )
            conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS business_budget_vendors ("
                    "vendor_id TEXT PRIMARY KEY,"
                    "budget_id TEXT NOT NULL REFERENCES business_budgets(budget_id) ON DELETE CASCADE,"
                    "vendor_name TEXT NOT NULL,"
                    "created_by_uid TEXT,"
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())"
                    ")",
                ),
            )
            conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_business_budget_vendors_budget_id ON business_budget_vendors(budget_id)"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS entry_kind TEXT NOT NULL DEFAULT 'expense'"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS paid_mode TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS purchase_payment_status TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS quantity NUMERIC(12,3)"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS unit TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(12,3)"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2)"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2)"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS vendor_balance_amount NUMERIC(12,2)"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS payment_splits_json TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS receipt_path TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS receipt_mime TEXT"),
            )
            conn.execute(
                text("ALTER TABLE business_budget_approvals ADD COLUMN IF NOT EXISTS receipt_name TEXT"),
            )
            conn.execute(text("ALTER TABLE group_moments ADD COLUMN IF NOT EXISTS milestones_json TEXT"))
            # Run one-shot token backfills in SQL to avoid cross-connection startup races.
            conn.execute(
                text(
                    "UPDATE business_budgets "
                    "SET join_token = md5(random()::text || clock_timestamp()::text) "
                    "|| md5(random()::text || clock_timestamp()::text) "
                    "WHERE join_token IS NULL OR btrim(join_token) = ''"
                ),
            )
            conn.execute(
                text(
                    "UPDATE business_budget_members "
                    "SET invite_token = md5(random()::text || clock_timestamp()::text) "
                    "|| md5(random()::text || clock_timestamp()::text) "
                    "WHERE email IS NOT NULL "
                    "AND btrim(email) <> '' "
                    "AND (invite_token IS NULL OR btrim(invite_token) = '') "
                    "AND lower(coalesce(invite_status, '')) NOT IN ('joined', 'accepted')"
                ),
            )

    if uses_sqlite:
        # SQLite path keeps ORM backfill to preserve existing behavior.
        with db_session() as session:
            for b in session.scalars(select(BusinessBudget).where(BusinessBudget.join_token.is_(None))).all():
                b.join_token = _new_business_join_secret()
            for m in session.scalars(select(BusinessBudgetMember)).all():
                if (m.email or "").strip() and m.invite_token is None and (m.invite_status or "").lower() not in {
                    "joined",
                    "accepted",
                }:
                    m.invite_token = _new_business_join_secret()
            session.commit()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


class TokenExchangeIn(BaseModel):
    firebase_token: str


@app.post("/api/auth/exchange")
def exchange_firebase_token(payload: TokenExchangeIn) -> dict[str, Any]:
    """Verify a Firebase ID token, ensure an AppUser row exists, return API session payload for the iOS client."""
    claims = _verify_firebase_token(payload.firebase_token)
    uid = str(claims.get("uid") or claims.get("user_id") or claims.get("sub") or "").strip()
    if not uid:
        raise HTTPException(status_code=401, detail="Firebase token missing uid")

    email_raw = claims.get("email")
    email = (str(email_raw).strip() if email_raw else None) or None
    phone_raw = claims.get("phone_number")
    phone = (str(phone_raw).strip() if phone_raw else None) or None
    name_raw = claims.get("name")
    display_name = str(name_raw).strip() if isinstance(name_raw, str) and name_raw.strip() else None

    now = datetime.now(timezone.utc)
    with db_session() as session:
        user = session.get(AppUser, uid)
        if user is None:
            user = AppUser(
                firebase_uid=uid,
                email=email,
                phone_number=phone,
                display_name=display_name,
                created_at=now,
                updated_at=now,
                last_sign_in_at=now,
            )
            session.add(user)
        else:
            if email:
                user.email = email
            if phone:
                user.phone_number = phone
            if display_name:
                user.display_name = display_name
            user.last_sign_in_at = now
            user.updated_at = now
        session.commit()
        session.refresh(user)

        return {
            "access_token": payload.firebase_token,
            "refresh_token": "",
            "user": {
                "id": uid,
                "email": (user.email or email or ""),
                "name": user.display_name,
                "phone_number": user.phone_number,
                "created_at": user.created_at.isoformat(),
                "updated_at": user.updated_at.isoformat(),
            },
        }


@app.post("/users/sync")
def sync_user_profile(
    payload: SyncUserRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    auth_user = _user_from_auth_header(authorization)
    now = datetime.now(timezone.utc)
    allowed_focus = {"personal", "group", "business"}
    requested_focus = payload.primary_focus.lower().strip() if payload.primary_focus else None
    if requested_focus is not None and requested_focus not in allowed_focus:
        raise HTTPException(status_code=400, detail="primary_focus must be one of personal|group|business")
    if requested_focus == "business" and not (payload.organization_name and payload.organization_name.strip()):
        raise HTTPException(status_code=400, detail="organization_name is required when primary_focus=business")

    with db_session() as session:
        user = session.get(AppUser, auth_user["uid"])
        if user is None:
            user = AppUser(
                firebase_uid=auth_user["uid"],
                email=auth_user["email"],
                phone_number=auth_user["phone_number"],
                created_at=now,
                updated_at=now,
                last_sign_in_at=now,
            )
            session.add(user)

        user.email = auth_user["email"] or user.email
        user.phone_number = auth_user["phone_number"] or user.phone_number
        user.display_name = payload.display_name or user.display_name
        user.photo_url = payload.photo_url or user.photo_url
        user.upi_or_phone = payload.upi_or_phone or user.upi_or_phone
        user.primary_use = payload.primary_use or user.primary_use
        user.primary_focus = requested_focus or user.primary_focus
        user.default_currency = (
            payload.default_currency.strip().upper()
            if payload.default_currency and payload.default_currency.strip()
            else user.default_currency
        )
        if payload.organization_name is not None:
            clean_org = payload.organization_name.strip()
            user.organization_name = clean_org if clean_org else None
        if payload.setup_completed is not None:
            user.setup_completed = bool(payload.setup_completed)
        user.last_sign_in_at = now
        user.updated_at = now
        session.commit()

    return {"status": "synced"}


@app.get("/me", response_model=MeResponse)
def me(authorization: str | None = Header(default=None)) -> MeResponse:
    auth_user = _user_from_auth_header(authorization)

    with db_session() as session:
        user = session.get(AppUser, auth_user["uid"])
        if user is None:
            now = datetime.now(timezone.utc)
            user = AppUser(
                firebase_uid=auth_user["uid"],
                email=auth_user["email"],
                phone_number=auth_user["phone_number"],
                created_at=now,
                updated_at=now,
                last_sign_in_at=now,
            )
            session.add(user)
            session.commit()
            session.refresh(user)

        return MeResponse(
            uid=user.firebase_uid,
            email=user.email,
            phone_number=user.phone_number,
            display_name=user.display_name,
            primary_use=user.primary_use,
            primary_focus=user.primary_focus,
            default_currency=user.default_currency,
            organization_name=user.organization_name,
            setup_completed=bool(user.setup_completed),
        )


@app.post("/personal/moments", response_model=PersonalMomentCreateOut)
def create_personal_moment(
    payload: PersonalMomentCreateIn,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    auth_user = _user_from_auth_header(authorization)
    now = datetime.now(timezone.utc)

    with db_session() as session:
        existing_user = session.execute(
            select(AppUser).where(AppUser.firebase_uid == auth_user["uid"]),
        ).scalar_one_or_none()
        if existing_user is None:
            existing_user = AppUser(
                firebase_uid=auth_user["uid"],
                email=auth_user["email"],
                phone_number=auth_user["phone_number"],
                created_at=now,
                updated_at=now,
                last_sign_in_at=now,
            )
            session.add(existing_user)

        moment = PersonalMoment(
            firebase_uid=auth_user["uid"],
            title=payload.title,
            moment_type=payload.moment_type,
            duration_type=payload.duration_type,
            target_amount=Decimal(str(payload.target_amount)) if payload.target_amount is not None else None,
            start_date=payload.start_date,
            end_date=payload.end_date,
            saving_mode=payload.saving_mode,
            description=payload.description,
            milestones_json=json.dumps([item.model_dump() for item in payload.milestones]),
            status=payload.status,
            is_private_moment=payload.is_private_moment,
            weekly_reminders=payload.weekly_reminders,
            milestone_alerts=payload.milestone_alerts,
            low_velocity_warning=payload.low_velocity_warning,
            auto_archive_on_complete=payload.auto_archive_on_complete,
            notify_via_push=payload.notify_via_push,
            notify_via_whatsapp=payload.notify_via_whatsapp,
            notify_via_email=payload.notify_via_email,
            created_at=now,
            updated_at=now,
        )
        session.add(moment)
        session.commit()
        session.refresh(moment)

    return {
        # Some DBs/schemas may materialize this as UUID; API contract is string.
        "moment_id": str(moment.moment_id),
        "title": moment.title,
        "moment_type": moment.moment_type,
        "duration_type": moment.duration_type,
    }


@app.get("/personal/moments", response_model=PersonalMomentListResponse)
def list_personal_moments(
    authorization: str | None = Header(default=None),
) -> PersonalMomentListResponse:
    auth_user = _user_from_auth_header(authorization)
    with db_session() as session:
        rows = session.scalars(
            select(PersonalMoment)
            .where(PersonalMoment.firebase_uid == auth_user["uid"])
            .order_by(PersonalMoment.created_at.desc()),
        ).all()

    moments_out: list[PersonalMomentItemOut] = []
    for m in rows:
        raw_list = _milestones_from_json(m.milestones_json)
        milestones = [
            PersonalMomentMilestoneOut(
                title=str(item.get("title", "")),
                meta=item.get("meta") if isinstance(item.get("meta"), str) else None,
            )
            for item in raw_list
            if isinstance(item, dict)
        ]
        moments_out.append(
            PersonalMomentItemOut(
                moment_id=str(m.moment_id),
                title=m.title,
                moment_type=m.moment_type,
                duration_type=m.duration_type,
                status=m.status,
                target_amount=float(m.target_amount) if m.target_amount is not None else None,
                start_date=m.start_date,
                end_date=m.end_date,
                saving_mode=m.saving_mode,
                description=m.description,
                is_private_moment=m.is_private_moment,
                milestones=milestones,
            ),
        )
    return PersonalMomentListResponse(moments=moments_out)


@app.patch("/personal/moments/{moment_id}", response_model=PersonalMomentItemOut)
def patch_personal_moment(
    moment_id: str,
    payload: PersonalMomentPatchIn,
    authorization: str | None = Header(default=None),
) -> PersonalMomentItemOut:
    auth_user = _user_from_auth_header(authorization)
    now = datetime.now(timezone.utc)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    with db_session() as session:
        m = session.get(PersonalMoment, moment_id)
        if m is None or m.firebase_uid != auth_user["uid"]:
            raise HTTPException(status_code=404, detail="Moment not found")
        if "title" in updates:
            m.title = str(updates["title"])
        if "target_amount" in updates:
            ta = updates["target_amount"]
            m.target_amount = Decimal(str(ta)) if ta is not None else None
        if "duration_type" in updates and updates["duration_type"] is not None:
            m.duration_type = str(updates["duration_type"])
            if m.duration_type == "recurring_monthly":
                m.end_date = None
        if "start_date" in updates:
            m.start_date = updates["start_date"]
        if "end_date" in updates:
            m.end_date = updates["end_date"]
        if "description" in updates:
            m.description = updates["description"]
        if "saving_mode" in updates:
            m.saving_mode = updates["saving_mode"]
        if "is_private_moment" in updates and updates["is_private_moment"] is not None:
            m.is_private_moment = bool(updates["is_private_moment"])
        if updates.get("append_contribution_amount") is not None:
            amt = float(updates["append_contribution_amount"])
            if amt <= 0:
                raise HTTPException(status_code=400, detail="Contribution amount must be positive")
            raw_list = list(_milestones_from_json(m.milestones_json))
            today = date.today().isoformat()
            rupee_int = int(round(amt))
            rupee_display = f"₹{rupee_int:,}"
            raw_list.append({"title": "Contribution", "meta": f"{rupee_display} · {today}"})
            m.milestones_json = json.dumps(raw_list)
        m.updated_at = now
        session.commit()
        session.refresh(m)

        raw_list = _milestones_from_json(m.milestones_json)
        milestones = [
            PersonalMomentMilestoneOut(
                title=str(item.get("title", "")),
                meta=item.get("meta") if isinstance(item.get("meta"), str) else None,
            )
            for item in raw_list
            if isinstance(item, dict)
        ]
        return PersonalMomentItemOut(
            moment_id=str(m.moment_id),
            title=m.title,
            moment_type=m.moment_type,
            duration_type=m.duration_type,
            status=m.status,
            target_amount=float(m.target_amount) if m.target_amount is not None else None,
            start_date=m.start_date,
            end_date=m.end_date,
            saving_mode=m.saving_mode,
            description=m.description,
            is_private_moment=m.is_private_moment,
            milestones=milestones,
        )


@app.delete("/personal/moments/{moment_id}")
def delete_personal_moment(
    moment_id: str,
    authorization: str | None = Header(default=None),
) -> Response:
    auth_user = _user_from_auth_header(authorization)
    with db_session() as session:
        m = session.get(PersonalMoment, moment_id)
        if m is None or m.firebase_uid != auth_user["uid"]:
            raise HTTPException(status_code=404, detail="Moment not found")
        session.delete(m)
        session.commit()
    return Response(status_code=204)


@app.get("/personal/home", response_model=PersonalHomeOut)
def personal_home(authorization: str | None = Header(default=None)) -> PersonalHomeOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        _ensure_app_user(session, auth_user)
        _seed_personal_accounts_if_missing(session, uid, now)
        _ensure_personal_budget(session, uid, _month_key(date.today()), now)
        session.commit()
        return _personal_home_out(session, uid)


@app.get("/personal/accounts", response_model=PersonalAccountsListOut)
def list_personal_accounts(authorization: str | None = Header(default=None)) -> PersonalAccountsListOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        _ensure_app_user(session, auth_user)
        _seed_personal_accounts_if_missing(session, uid, now)
        session.commit()
        rows = session.scalars(
            select(PersonalAccount)
            .where(PersonalAccount.firebase_uid == uid, PersonalAccount.is_active.is_(True))
            .order_by(PersonalAccount.created_at.asc()),
        ).all()
        return PersonalAccountsListOut(accounts=[_personal_account_out(r) for r in rows])


@app.get("/personal/categories", response_model=PersonalCategoryListOut)
def list_personal_categories(
    authorization: str | None = Header(default=None),
    kind: Literal["expense", "income"] = Query(default="expense"),
) -> PersonalCategoryListOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        _ensure_app_user(session, auth_user)
        _seed_personal_categories_if_missing(session, uid, now)
        session.commit()
        return _personal_categories_out(session, uid, kind)


@app.get("/personal/transactions", response_model=PersonalTransactionListOut)
def list_personal_transactions(
    authorization: str | None = Header(default=None),
    kind: Literal["all", "expense", "income"] = Query(default="all"),
    limit: int = Query(default=200, ge=1, le=500),
) -> PersonalTransactionListOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        q = (
            select(PersonalTransaction)
            .where(PersonalTransaction.firebase_uid == uid)
            .order_by(desc(PersonalTransaction.txn_date), desc(PersonalTransaction.created_at))
            .limit(limit)
        )
        if kind != "all":
            q = q.where(PersonalTransaction.kind == kind)
        rows = session.scalars(q).all()
        return PersonalTransactionListOut(transactions=[_personal_txn_out(r) for r in rows])


@app.post("/personal/transactions", response_model=PersonalTransactionOut)
def create_personal_transaction(
    payload: PersonalTransactionCreateIn,
    authorization: str | None = Header(default=None),
) -> PersonalTransactionOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    txn_date = payload.txn_date or date.today()
    amount = Decimal(str(payload.amount))
    kind = "income" if payload.is_income else "expense"

    with db_session() as session:
        _ensure_app_user(session, auth_user)
        _seed_personal_accounts_if_missing(session, uid, now)
        _seed_personal_categories_if_missing(session, uid, now)
        session.flush()

        category_name = payload.category.strip()
        if not category_name:
            raise HTTPException(status_code=422, detail="Category is required")

        category_row = session.execute(
            select(PersonalCategory).where(
                PersonalCategory.firebase_uid == uid,
                PersonalCategory.kind == kind,
                PersonalCategory.is_active.is_(True),
                func.lower(PersonalCategory.name) == _normalize_name(category_name),
            ),
        ).scalar_one_or_none()
        if category_row is None:
            raise HTTPException(status_code=422, detail="Invalid category for selected transaction kind")

        normalized_category = category_row.name
        selected_subcategory_id: str | None = None
        selected_subcategory_label: str | None = None
        if payload.subcategory_id:
            sub_row = session.get(PersonalSubcategory, payload.subcategory_id)
            if (
                sub_row is None
                or sub_row.firebase_uid != uid
                or str(sub_row.category_id) != str(category_row.category_id)
                or not sub_row.is_active
            ):
                raise HTTPException(status_code=422, detail="Invalid subcategory for category")
            selected_subcategory_id = str(sub_row.subcategory_id)
            selected_subcategory_label = sub_row.name
        elif payload.subcategory_label and payload.subcategory_label.strip():
            sub_name = payload.subcategory_label.strip()
            sub_row = session.execute(
                select(PersonalSubcategory).where(
                    PersonalSubcategory.firebase_uid == uid,
                    PersonalSubcategory.category_id == category_row.category_id,
                    PersonalSubcategory.is_active.is_(True),
                    func.lower(PersonalSubcategory.name) == _normalize_name(sub_name),
                ),
            ).scalar_one_or_none()
            if sub_row is None:
                raise HTTPException(status_code=422, detail="Invalid subcategory for category")
            selected_subcategory_id = str(sub_row.subcategory_id)
            selected_subcategory_label = sub_row.name

        account: PersonalAccount | None = None
        if payload.account_id:
            account = session.get(PersonalAccount, payload.account_id)
            if account is None or account.firebase_uid != uid:
                raise HTTPException(status_code=404, detail="Account not found")
        else:
            account = session.scalars(
                select(PersonalAccount)
                .where(PersonalAccount.firebase_uid == uid, PersonalAccount.is_active.is_(True))
                .order_by(PersonalAccount.created_at.asc())
                .limit(1),
            ).first()

        title = (payload.title or "").strip() or normalized_category
        txn = PersonalTransaction(
            firebase_uid=uid,
            account_id=str(account.account_id) if account is not None else None,
            account_name=account.name if account is not None else None,
            kind=kind,
            category=normalized_category,
            subcategory_id=selected_subcategory_id,
            subcategory_label=selected_subcategory_label,
            title=title,
            amount=amount,
            note=(payload.note.strip() if payload.note else None),
            txn_date=txn_date,
            created_at=now,
            updated_at=now,
        )
        session.add(txn)
        session.flush()

        _apply_personal_transaction_effects(session, uid, account, kind, amount, txn_date, now)

        session.commit()
        session.refresh(txn)
        return _personal_txn_out(txn)


@app.patch("/personal/transactions/{transaction_id}", response_model=PersonalTransactionOut)
def patch_personal_transaction(
    transaction_id: str,
    payload: PersonalTransactionPatchIn,
    authorization: str | None = Header(default=None),
) -> PersonalTransactionOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    with db_session() as session:
        _ensure_app_user(session, auth_user)
        _seed_personal_accounts_if_missing(session, uid, now)
        _seed_personal_categories_if_missing(session, uid, now)
        session.flush()

        txn = session.get(PersonalTransaction, transaction_id)
        if txn is None or str(txn.firebase_uid) != uid:
            raise HTTPException(status_code=404, detail="Transaction not found")

        _reverse_personal_transaction_effects(session, txn, now)

        kind = ("income" if updates["is_income"] else "expense") if "is_income" in updates else str(txn.kind)
        if "amount" in updates:
            amount = Decimal(str(updates["amount"]))
            if amount <= 0:
                raise HTTPException(status_code=422, detail="Amount must be positive")
        else:
            amount = Decimal(txn.amount or 0)

        txn_date: date = updates["txn_date"] if "txn_date" in updates else txn.txn_date

        category_name = (updates["category"].strip() if "category" in updates else txn.category) or ""
        if not category_name:
            raise HTTPException(status_code=422, detail="Category is required")

        category_row = session.execute(
            select(PersonalCategory).where(
                PersonalCategory.firebase_uid == uid,
                PersonalCategory.kind == kind,
                PersonalCategory.is_active.is_(True),
                func.lower(PersonalCategory.name) == _normalize_name(category_name),
            ),
        ).scalar_one_or_none()
        if category_row is None:
            raise HTTPException(status_code=422, detail="Invalid category for selected transaction kind")

        normalized_category = category_row.name
        selected_subcategory_id: str | None = None
        selected_subcategory_label: str | None = None

        if "subcategory_id" in updates:
            if updates["subcategory_id"]:
                sub_row = session.get(PersonalSubcategory, updates["subcategory_id"])
                if (
                    sub_row is None
                    or sub_row.firebase_uid != uid
                    or str(sub_row.category_id) != str(category_row.category_id)
                    or not sub_row.is_active
                ):
                    raise HTTPException(status_code=422, detail="Invalid subcategory for category")
                selected_subcategory_id = str(sub_row.subcategory_id)
                selected_subcategory_label = sub_row.name
        elif "subcategory_label" in updates and updates.get("subcategory_label") and str(updates["subcategory_label"]).strip():
            sub_name = str(updates["subcategory_label"]).strip()
            sub_row = session.execute(
                select(PersonalSubcategory).where(
                    PersonalSubcategory.firebase_uid == uid,
                    PersonalSubcategory.category_id == category_row.category_id,
                    PersonalSubcategory.is_active.is_(True),
                    func.lower(PersonalSubcategory.name) == _normalize_name(sub_name),
                ),
            ).scalar_one_or_none()
            if sub_row is None:
                raise HTTPException(status_code=422, detail="Invalid subcategory for category")
            selected_subcategory_id = str(sub_row.subcategory_id)
            selected_subcategory_label = sub_row.name
        elif txn.subcategory_id:
            sub_row = session.get(PersonalSubcategory, txn.subcategory_id)
            if (
                sub_row is not None
                and sub_row.firebase_uid == uid
                and str(sub_row.category_id) == str(category_row.category_id)
                and sub_row.is_active
            ):
                selected_subcategory_id = str(sub_row.subcategory_id)
                selected_subcategory_label = sub_row.name

        account: PersonalAccount | None = None
        if "account_id" in updates:
            if updates["account_id"]:
                account = session.get(PersonalAccount, updates["account_id"])
                if account is None or account.firebase_uid != uid:
                    raise HTTPException(status_code=404, detail="Account not found")
            else:
                account = session.scalars(
                    select(PersonalAccount)
                    .where(PersonalAccount.firebase_uid == uid, PersonalAccount.is_active.is_(True))
                    .order_by(PersonalAccount.created_at.asc())
                    .limit(1),
                ).first()
        elif txn.account_id:
            account = session.get(PersonalAccount, txn.account_id)
        else:
            account = session.scalars(
                select(PersonalAccount)
                .where(PersonalAccount.firebase_uid == uid, PersonalAccount.is_active.is_(True))
                .order_by(PersonalAccount.created_at.asc())
                .limit(1),
            ).first()

        if "title" in updates:
            title = (str(updates["title"]).strip() if updates["title"] is not None else "") or normalized_category
        else:
            title = txn.title

        note: str | None
        if "note" in updates:
            note = str(updates["note"]).strip() if updates["note"] else None
        else:
            note = txn.note

        txn.kind = kind
        txn.amount = amount
        txn.txn_date = txn_date
        txn.category = normalized_category
        txn.subcategory_id = selected_subcategory_id
        txn.subcategory_label = selected_subcategory_label
        txn.title = title
        txn.note = note
        txn.account_id = str(account.account_id) if account is not None else None
        txn.account_name = account.name if account is not None else None
        txn.updated_at = now

        session.flush()
        _apply_personal_transaction_effects(session, uid, account, kind, amount, txn_date, now)

        session.commit()
        session.refresh(txn)
        return _personal_txn_out(txn)


@app.delete("/personal/transactions/{transaction_id}")
def delete_personal_transaction(
    transaction_id: str,
    authorization: str | None = Header(default=None),
) -> Response:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        txn = session.get(PersonalTransaction, transaction_id)
        if txn is None or str(txn.firebase_uid) != uid:
            raise HTTPException(status_code=404, detail="Transaction not found")
        _reverse_personal_transaction_effects(session, txn, now)
        session.delete(txn)
        session.commit()
    return Response(status_code=204)


@app.post("/business/budgets", response_model=BusinessBudgetCreateOut)
def create_business_budget(
    payload: BusinessBudgetCreateIn,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        _ensure_app_user(session, auth_user)
        session.flush()
        app_user = session.get(AppUser, uid)
        owner_name = (app_user.display_name if app_user else None) or "Owner"
        owner_email = (app_user.email if app_user else None) or auth_user["email"]
        rp_json = (
            payload.reminder_prefs.model_dump_json()
            if payload.reminder_prefs is not None
            else _default_reminder_prefs_json()
        )
        budget = BusinessBudget(
            owner_uid=uid,
            budget_name=payload.budget_name,
            budget_type=payload.budget_type,
            total_budget=Decimal(str(payload.total_budget)) if payload.total_budget is not None else None,
            budget_period=payload.budget_period,
            department=payload.department,
            approval_threshold=Decimal(str(payload.approval_threshold)) if payload.approval_threshold is not None else None,
            spending_policies_json=payload.spending_policies.model_dump_json(),
            reminder_prefs_json=rp_json,
            status="active",
            created_at=now,
            updated_at=now,
            join_token=_new_business_join_secret(),
        )
        session.add(budget)
        session.flush()

        _ensure_owner_member_record(
            session=session,
            budget_id=budget.budget_id,
            uid=uid,
            now=now,
            email=owner_email,
            display_name=owner_name,
        )
        _seed_budget_categories(session, budget)
        _ensure_business_budget_catalog(session, budget.budget_id, now=now)

        invited_count = 0
        for member in payload.team_members:
            role_norm = _business_role_norm(member.role)
            if role_norm == "owner":
                role_norm = "admin"
            if member.added:
                invited_count += 1
            invite_status = "joined" if member.firebase_uid and member.added else ("pending" if member.added else "draft")
            em = (member.email or "").strip().lower() or None
            invite_tok = (
                _new_business_join_secret()
                if em and member.added and invite_status != "joined"
                else None
            )
            session.add(
                BusinessBudgetMember(
                    budget_id=budget.budget_id,
                    firebase_uid=member.firebase_uid,
                    email=em,
                    initials=member.initials,
                    display_name=member.display_name,
                    role=role_norm,
                    spend_limit=member.limit,
                    is_added=member.added,
                    invite_status=invite_status,
                    invited_at=now if member.added else None,
                    joined_at=now if invite_status == "joined" else None,
                    invite_token=invite_tok,
                    created_at=now,
                ),
            )

        _append_budget_audit(
            session,
            budget.budget_id,
            uid,
            "budget_created",
            {"budget_name": budget.budget_name},
        )
        session.commit()
        session.refresh(budget)

        return _business_budget_out(
            session=session,
            budget=budget,
            viewer_uid=uid,
            fallback_invited_count=invited_count,
        )


@app.post("/business/moments", response_model=BusinessBudgetCreateOut)
def create_business_moment(
    payload: BusinessBudgetCreateIn,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    """Alias for ``POST /business/budgets`` — same payload and behavior (product wording)."""
    return create_business_budget(payload, authorization)


@app.get("/business/budgets", response_model=BusinessBudgetListOut)
def list_business_budgets(
    authorization: str | None = Header(default=None),
) -> BusinessBudgetListOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        joined_budget_ids = session.scalars(
            select(BusinessBudgetMember.budget_id)
            .where(BusinessBudgetMember.firebase_uid == uid)
            .where(BusinessBudgetMember.is_added.is_(True))
            .where(func.lower(BusinessBudgetMember.invite_status).in_(["joined", "accepted"]))
            .distinct(),
        ).all()
        rows = session.scalars(
            select(BusinessBudget)
            .where(
                or_(
                    BusinessBudget.owner_uid == uid,
                    BusinessBudget.budget_id.in_(joined_budget_ids or [""]),
                ),
            )
            .order_by(BusinessBudget.created_at.desc()),
        ).all()
        for row in rows:
            _ensure_default_categories(session, row)
        session.commit()
        rows = session.scalars(
            select(BusinessBudget)
            .where(
                or_(
                    BusinessBudget.owner_uid == uid,
                    BusinessBudget.budget_id.in_(joined_budget_ids or [""]),
                ),
            )
            .order_by(BusinessBudget.created_at.desc()),
        ).all()
        return BusinessBudgetListOut(
            budgets=[_business_budget_out(session=session, budget=row, viewer_uid=uid) for row in rows],
        )


@app.get("/business/moments", response_model=BusinessBudgetListOut)
def list_business_moments(
    authorization: str | None = Header(default=None),
) -> BusinessBudgetListOut:
    """Alias for ``GET /business/budgets`` — same response (product wording)."""
    return list_business_budgets(authorization)


@app.get("/business/budgets/{budget_id}", response_model=BusinessBudgetCreateOut)
def get_business_budget(
    budget_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        budget, _, _ = _resolve_business_actor(session, budget_id, uid)
        _ensure_default_categories(session, budget)
        session.commit()
        refreshed = session.get(BusinessBudget, budget_id)
        if refreshed is None:
            raise HTTPException(status_code=404, detail="Budget not found")
        return _business_budget_out(session=session, budget=refreshed, viewer_uid=uid)


@app.get("/business/moments/{budget_id}", response_model=BusinessBudgetCreateOut)
def get_business_moment(
    budget_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    """Alias for ``GET /business/budgets/{budget_id}`` — same response (product wording)."""
    return get_business_budget(budget_id, authorization)


@app.get("/business/budgets/{budget_id}/catalog", response_model=BusinessCatalogOut)
def get_business_budget_catalog(
    budget_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessCatalogOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        _resolve_business_actor(session, budget_id, uid)
        return _build_business_catalog(session, budget_id)


@app.patch("/business/budgets/{budget_id}/catalog/mappings", response_model=BusinessCatalogOut)
def patch_business_budget_catalog_mapping(
    budget_id: str,
    payload: BusinessCatalogCategoryMappingPatchIn,
    authorization: str | None = Header(default=None),
) -> BusinessCatalogOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        _, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_CATALOG_EDIT_ROLES)
        _ensure_business_budget_catalog(session, budget_id, now=now)
        category = session.get(BusinessBudgetCategory, payload.budget_category_id)
        if category is None or category.budget_id != budget_id:
            raise HTTPException(status_code=404, detail="Budget category not found")
        template = session.get(BusinessCategoryTemplate, payload.template_category_id)
        if template is None or template.entry_kind != payload.entry_kind:
            raise HTTPException(status_code=404, detail="Template category not found")
        mapping = session.scalar(
            select(BusinessBudgetCategoryMapping)
            .where(BusinessBudgetCategoryMapping.budget_id == budget_id)
            .where(BusinessBudgetCategoryMapping.entry_kind == payload.entry_kind)
            .where(BusinessBudgetCategoryMapping.template_category_id == payload.template_category_id)
            .limit(1),
        )
        if mapping is None:
            mapping = BusinessBudgetCategoryMapping(
                budget_id=budget_id,
                entry_kind=payload.entry_kind,
                template_category_id=payload.template_category_id,
                budget_category_id=payload.budget_category_id,
                sort_order=template.sort_order,
                is_active=True if payload.active is None else payload.active,
                created_at=now,
                updated_at=now,
            )
            session.add(mapping)
        else:
            mapping.budget_category_id = payload.budget_category_id
            mapping.is_active = mapping.is_active if payload.active is None else payload.active
            mapping.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "catalog_mapping_updated",
            payload.model_dump(),
        )
        session.commit()
        return _build_business_catalog(session, budget_id)


@app.patch("/business/budgets/{budget_id}/catalog/categories/{template_category_id}", response_model=BusinessCatalogOut)
def patch_business_budget_catalog_category_state(
    budget_id: str,
    template_category_id: str,
    payload: BusinessCatalogCategoryStatePatchIn,
    entry_kind: Literal["expense", "purchase"] = Query(...),
    authorization: str | None = Header(default=None),
) -> BusinessCatalogOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        _, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_CATALOG_EDIT_ROLES)
        _ensure_business_budget_catalog(session, budget_id, now=now)
        mapping = session.scalar(
            select(BusinessBudgetCategoryMapping)
            .where(BusinessBudgetCategoryMapping.budget_id == budget_id)
            .where(BusinessBudgetCategoryMapping.entry_kind == entry_kind)
            .where(BusinessBudgetCategoryMapping.template_category_id == template_category_id)
            .limit(1),
        )
        if mapping is None:
            raise HTTPException(status_code=404, detail="Catalog mapping not found")
        mapping.is_active = payload.active
        mapping.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "catalog_category_state_updated",
            {
                "entry_kind": entry_kind,
                "template_category_id": template_category_id,
                "active": payload.active,
            },
        )
        session.commit()
        return _build_business_catalog(session, budget_id)


@app.post("/business/budgets/{budget_id}/catalog/subcategories", response_model=BusinessCatalogOut)
def create_business_budget_catalog_subcategory(
    budget_id: str,
    payload: BusinessCatalogSubcategoryCreateIn,
    authorization: str | None = Header(default=None),
) -> BusinessCatalogOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        _, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_CATALOG_EDIT_ROLES)
        _ensure_business_budget_catalog(session, budget_id, now=now)
        template = session.get(BusinessCategoryTemplate, payload.template_category_id)
        if template is None or template.entry_kind != payload.entry_kind:
            raise HTTPException(status_code=404, detail="Template category not found")
        sub_name = payload.name.strip()
        if not sub_name:
            raise HTTPException(status_code=422, detail="Subcategory name is required")
        existing = session.scalar(
            select(BusinessBudgetSubcategory)
            .where(BusinessBudgetSubcategory.budget_id == budget_id)
            .where(BusinessBudgetSubcategory.entry_kind == payload.entry_kind)
            .where(BusinessBudgetSubcategory.template_category_id == payload.template_category_id)
            .where(func.lower(BusinessBudgetSubcategory.name) == sub_name.lower())
            .limit(1),
        )
        if existing is not None:
            existing.is_active = True
            existing.sort_order = payload.sort_order if payload.sort_order is not None else existing.sort_order
            existing.updated_at = now
        else:
            next_order = payload.sort_order
            if next_order is None:
                max_existing = session.scalar(
                    select(func.max(BusinessBudgetSubcategory.sort_order))
                    .where(BusinessBudgetSubcategory.budget_id == budget_id)
                    .where(BusinessBudgetSubcategory.entry_kind == payload.entry_kind)
                    .where(BusinessBudgetSubcategory.template_category_id == payload.template_category_id),
                )
                next_order = int(max_existing or -1) + 1
            session.add(
                BusinessBudgetSubcategory(
                    budget_id=budget_id,
                    entry_kind=payload.entry_kind,
                    template_category_id=payload.template_category_id,
                    name=sub_name[:120],
                    sort_order=next_order,
                    is_active=True,
                    created_at=now,
                    updated_at=now,
                ),
            )
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "catalog_subcategory_created",
            payload.model_dump(),
        )
        session.commit()
        return _build_business_catalog(session, budget_id)


@app.patch("/business/budgets/{budget_id}/catalog/subcategories/{budget_subcategory_id}", response_model=BusinessCatalogOut)
def patch_business_budget_catalog_subcategory(
    budget_id: str,
    budget_subcategory_id: str,
    payload: BusinessCatalogSubcategoryPatchIn,
    authorization: str | None = Header(default=None),
) -> BusinessCatalogOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        _, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_CATALOG_EDIT_ROLES)
        row = session.get(BusinessBudgetSubcategory, budget_subcategory_id)
        if row is None or row.budget_id != budget_id:
            raise HTTPException(status_code=404, detail="Subcategory not found")
        if payload.name is not None:
            nm = payload.name.strip()
            if not nm:
                raise HTTPException(status_code=422, detail="name cannot be empty")
            row.name = nm[:120]
        if payload.sort_order is not None:
            row.sort_order = payload.sort_order
        if payload.active is not None:
            row.is_active = payload.active
        row.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "catalog_subcategory_updated",
            {
                "budget_subcategory_id": budget_subcategory_id,
                **payload.model_dump(exclude_unset=True),
            },
        )
        session.commit()
        return _build_business_catalog(session, budget_id)


@app.delete("/business/budgets/{budget_id}/catalog/subcategories/{budget_subcategory_id}", response_model=BusinessCatalogOut)
def delete_business_budget_catalog_subcategory(
    budget_id: str,
    budget_subcategory_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessCatalogOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        _, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_CATALOG_EDIT_ROLES)
        row = session.get(BusinessBudgetSubcategory, budget_subcategory_id)
        if row is None or row.budget_id != budget_id:
            raise HTTPException(status_code=404, detail="Subcategory not found")
        row.is_active = False
        row.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "catalog_subcategory_deleted",
            {"budget_subcategory_id": budget_subcategory_id},
        )
        session.commit()
        return _build_business_catalog(session, budget_id)


@app.patch("/business/budgets/{budget_id}", response_model=BusinessBudgetCreateOut)
def patch_business_budget(
    budget_id: str,
    payload: BusinessBudgetPatchIn,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        if payload.budget_name is not None:
            budget.budget_name = payload.budget_name.strip()[:200]
        if payload.budget_period is not None:
            budget.budget_period = payload.budget_period.strip()[:64]
        if payload.total_budget is not None:
            budget.total_budget = Decimal(str(payload.total_budget)).quantize(Decimal("0.01"))
        if payload.department is not None:
            budget.department = payload.department.strip()[:64]
        if payload.approval_threshold is not None:
            budget.approval_threshold = Decimal(str(payload.approval_threshold)).quantize(Decimal("0.01"))
        if payload.spending_policies is not None:
            budget.spending_policies_json = payload.spending_policies.model_dump_json()
        if payload.reminder_prefs is not None:
            budget.reminder_prefs_json = _merge_reminder_prefs_json(
                budget.reminder_prefs_json,
                payload.reminder_prefs,
            )
        if payload.categories is not None:
            for item in payload.categories:
                cat = session.get(BusinessBudgetCategory, item.category_id)
                if cat is None or cat.budget_id != budget_id:
                    raise HTTPException(status_code=404, detail="Category not found")
                cat.allocated_amount = Decimal(str(item.allocated_amount)).quantize(Decimal("0.01"))
        budget.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "budget_updated",
            {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None},
        )
        session.commit()
        session.refresh(budget)
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.get("/business/budgets/{budget_id}/approvals/{approval_id}", response_model=BusinessBudgetPendingApprovalOut)
def get_business_budget_approval(
    budget_id: str,
    approval_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetPendingApprovalOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        approval = session.get(BusinessBudgetApproval, approval_id)
        if approval is None or approval.budget_id != budget.budget_id:
            raise HTTPException(status_code=404, detail="Approval not found")
        if role == "employee" and approval.submitter_uid != uid:
            raise HTTPException(status_code=403, detail="Employees can only view their own submissions")
        return _approval_to_out(approval)


@app.get("/business/budgets/{budget_id}/audit", response_model=BusinessAuditListOut)
def list_business_budget_audit(
    budget_id: str,
    authorization: str | None = Header(default=None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> BusinessAuditListOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        _, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        rows = session.scalars(
            select(BusinessBudgetAuditEvent)
            .where(BusinessBudgetAuditEvent.budget_id == budget_id)
            .order_by(desc(BusinessBudgetAuditEvent.created_at), desc(BusinessBudgetAuditEvent.event_id))
            .offset(offset)
            .limit(limit),
        ).all()
        events: list[BusinessAuditEventOut] = []
        for r in rows:
            try:
                pl = json.loads(r.payload_json or "{}")
                if not isinstance(pl, dict):
                    pl = {}
            except json.JSONDecodeError:
                pl = {}
            events.append(
                BusinessAuditEventOut(
                    event_id=r.event_id,
                    action=r.action,
                    payload=pl,
                    created_at=r.created_at,
                ),
            )
        next_off: int | None = offset + len(events) if len(rows) == limit else None
        return BusinessAuditListOut(events=events, next_offset=next_off)


@app.get("/business/budgets/{budget_id}/approvals/queue", response_model=BusinessApprovalQueueOut)
def get_business_budget_approval_queue(
    budget_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessApprovalQueueOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        _, role, _ = _resolve_business_actor(session, budget_id, uid)
        if role == "employee":
            # Employees only see pending approvals they submitted, not full approver queue.
            queue = _business_approval_queue_out(session, budget_id, uid)
            queue.pending_approvals = [p for p in queue.pending_approvals if p.submitter_uid == uid]
            queue.approval_summary.pending_count = len(queue.pending_approvals)
            return queue
        return _business_approval_queue_out(session, budget_id, uid)


def _join_business_via_open_join_token(
    session: Session,
    budget: BusinessBudget,
    auth_user: dict[str, Any],
    now: datetime,
) -> dict[str, str]:
    """Join using the budget's public join_token (share URL / QR)."""
    _ensure_app_user(session, auth_user)
    uid = str(auth_user["uid"])
    if budget.owner_uid == uid:
        return {"status": "owner", "budget_id": budget.budget_id}

    existing = session.scalar(
        select(BusinessBudgetMember)
        .where(BusinessBudgetMember.budget_id == budget.budget_id)
        .where(BusinessBudgetMember.firebase_uid == uid)
        .order_by(desc(BusinessBudgetMember.created_at))
        .limit(1),
    )
    if existing is not None:
        if (existing.invite_status or "").lower() in {"joined", "accepted"}:
            return {"status": "already_joined", "budget_id": budget.budget_id}
        existing.invite_status = "joined"
        existing.joined_at = now
        existing.is_added = True
        if not (existing.display_name or "").strip():
            existing.display_name = _actor_display(session, auth_user)
    else:
        em_raw = auth_user.get("email")
        em = (str(em_raw).strip().lower() if em_raw else "") or None
        session.add(
            BusinessBudgetMember(
                budget_id=budget.budget_id,
                firebase_uid=uid,
                email=em,
                initials=None,
                display_name=_actor_display(session, auth_user),
                role="employee",
                spend_limit=None,
                is_added=True,
                invite_status="joined",
                invited_at=now,
                joined_at=now,
                created_at=now,
            ),
        )
    budget.updated_at = now
    session.flush()
    _append_budget_audit(
        session,
        budget.budget_id,
        uid,
        "member_joined",
        {"via": "open_link"},
    )
    return {"status": "joined", "budget_id": budget.budget_id}


def _accept_business_member_invite_token(
    session: Session,
    raw_token: str,
    auth_user: dict[str, Any],
    now: datetime,
) -> dict[str, str]:
    member = session.scalar(select(BusinessBudgetMember).where(BusinessBudgetMember.invite_token == raw_token))
    if member is None:
        raise HTTPException(status_code=404, detail="Invite not found")
    budget = session.get(BusinessBudget, member.budget_id)
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found")

    _ensure_app_user(session, auth_user)
    uid = str(auth_user["uid"])
    user = session.get(AppUser, uid)
    auth_email = ((user.email if user else None) or auth_user.get("email") or "").strip().lower()
    row_email = (member.email or "").strip().lower()
    if row_email and auth_email and row_email != auth_email:
        raise HTTPException(status_code=403, detail="This invite is for a different email address")

    if member.firebase_uid and member.firebase_uid != uid:
        raise HTTPException(status_code=403, detail="Invite already accepted")
    if member.firebase_uid == uid and (member.invite_status or "").lower() in {"joined", "accepted"}:
        return {"status": "already_joined", "budget_id": budget.budget_id}

    member.firebase_uid = uid
    member.invite_status = "joined"
    member.joined_at = now
    member.is_added = True
    member.invited_at = member.invited_at or now
    budget.updated_at = now
    session.flush()
    _append_budget_audit(
        session,
        budget.budget_id,
        uid,
        "member_joined",
        {"member_id": member.member_id, "via": "email_invite"},
    )
    return {"status": "joined", "budget_id": budget.budget_id}


@app.post("/business/budgets/{budget_id}/members/join", response_model=BusinessBudgetCreateOut)
def join_business_budget_as_member(
    budget_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        _ensure_app_user(session, auth_user)
        budget = session.get(BusinessBudget, budget_id)
        if budget is None:
            raise HTTPException(status_code=404, detail="Budget not found")
        if budget.owner_uid == uid:
            return _business_budget_out(session=session, budget=budget, viewer_uid=uid)

        existing = session.scalar(
            select(BusinessBudgetMember)
            .where(BusinessBudgetMember.budget_id == budget_id)
            .where(BusinessBudgetMember.firebase_uid == uid)
            .order_by(desc(BusinessBudgetMember.created_at))
            .limit(1),
        )
        if existing is not None and (existing.invite_status or "").lower() in {"joined", "accepted"}:
            return _business_budget_out(session=session, budget=budget, viewer_uid=uid)

        user = session.get(AppUser, uid)
        email = ((user.email if user is not None else None) or auth_user.get("email") or "").strip().lower()
        if not email:
            raise HTTPException(status_code=403, detail="No invite found for this account")
        invited = session.scalar(
            select(BusinessBudgetMember)
            .where(BusinessBudgetMember.budget_id == budget_id)
            .where(func.lower(BusinessBudgetMember.email) == email)
            .order_by(desc(BusinessBudgetMember.created_at))
            .limit(1),
        )
        if invited is None:
            raise HTTPException(status_code=403, detail="No invite found for this account")

        invited.firebase_uid = uid
        invited.invite_status = "joined"
        invited.joined_at = now
        invited.is_added = True
        invited.invited_at = invited.invited_at or now
        budget.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "member_joined",
            {"member_id": invited.member_id, "email": email},
        )
        session.commit()
        session.refresh(budget)
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.post("/business/budgets/{budget_id}/members", response_model=BusinessBudgetCreateOut)
def add_business_budget_member(
    budget_id: str,
    payload: BusinessBudgetMemberIn,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        role_norm = _business_role_norm(payload.role)
        if role_norm == "owner":
            raise HTTPException(status_code=422, detail="Use owner account to manage ownership")
        invite_status = "joined" if payload.firebase_uid and payload.added else ("pending" if payload.added else "draft")
        em = (payload.email or "").strip().lower() or None
        invite_tok = (
            _new_business_join_secret()
            if em and payload.added and invite_status != "joined"
            else None
        )
        existing: BusinessBudgetMember | None = None
        if em:
            existing = session.scalar(
                select(BusinessBudgetMember)
                .where(BusinessBudgetMember.budget_id == budget_id)
                .where(func.lower(BusinessBudgetMember.email) == em)
                .order_by(desc(BusinessBudgetMember.created_at))
                .limit(1),
            )

        if existing is not None:
            existing.firebase_uid = payload.firebase_uid
            existing.email = em
            existing.initials = payload.initials
            existing.display_name = payload.display_name
            existing.role = role_norm
            existing.spend_limit = payload.limit
            existing.is_added = payload.added
            existing.invite_status = invite_status
            existing.invited_at = now if payload.added else existing.invited_at
            existing.joined_at = now if invite_status == "joined" else existing.joined_at
            if invite_tok:
                existing.invite_token = invite_tok
        else:
            session.add(
                BusinessBudgetMember(
                    budget_id=budget_id,
                    firebase_uid=payload.firebase_uid,
                    email=em,
                    initials=payload.initials,
                    display_name=payload.display_name,
                    role=role_norm,
                    spend_limit=payload.limit,
                    is_added=payload.added,
                    invite_status=invite_status,
                    invited_at=now if payload.added else None,
                    joined_at=now if invite_status == "joined" else None,
                    invite_token=invite_tok,
                    created_at=now,
                ),
            )
        budget.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "member_added",
            {"display_name": payload.display_name, "role": role_norm, "email": payload.email},
        )
        session.commit()
        session.refresh(budget)
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.get("/business/invites/pending", response_model=BusinessPendingInvitesOut)
def business_pending_invites(
    authorization: str | None = Header(default=None),
) -> BusinessPendingInvitesOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        user = session.get(AppUser, uid)
        email = ((user.email if user else None) or auth_user.get("email") or "").strip().lower()
        if not email:
            return BusinessPendingInvitesOut(invites=[])
        rows = session.execute(
            select(BusinessBudgetMember, BusinessBudget)
            .join(BusinessBudget, BusinessBudgetMember.budget_id == BusinessBudget.budget_id)
            .where(func.lower(BusinessBudgetMember.email) == email)
            .where(BusinessBudgetMember.firebase_uid.is_(None))
            .where(BusinessBudgetMember.is_added.is_(True))
            .where(func.lower(BusinessBudgetMember.invite_status).in_(["pending", "invited"]))
            .order_by(nullslast(desc(BusinessBudgetMember.invited_at)), desc(BusinessBudgetMember.created_at)),
        ).all()
        invites: list[BusinessPendingInviteOut] = []
        seen_budget_ids: set[str] = set()
        for member, budget in rows:
            # Historical data can contain duplicate pending rows for the same budget/email.
            # Keep only one invite card per budget for the current viewer.
            if budget.budget_id in seen_budget_ids:
                continue
            seen_budget_ids.add(budget.budget_id)
            tok = _ensure_business_member_invite_token(session, member)
            invites.append(
                BusinessPendingInviteOut(
                    budget_id=budget.budget_id,
                    budget_name=budget.budget_name,
                    member_id=member.member_id,
                    role=member.role,
                    invited_at=member.invited_at,
                    invite_token=tok,
                ),
            )
        session.commit()
        return BusinessPendingInvitesOut(invites=invites)


@app.get("/business/moments/invites/pending", response_model=BusinessPendingInvitesOut)
def business_moments_pending_invites(
    authorization: str | None = Header(default=None),
) -> BusinessPendingInvitesOut:
    """Alias for ``GET /business/invites/pending`` (product wording)."""
    return business_pending_invites(authorization)


@app.post("/business/invites/{member_id}/decline")
def decline_business_pending_invite(
    member_id: str,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        member = session.get(BusinessBudgetMember, member_id)
        if member is None:
            raise HTTPException(status_code=404, detail="Invite not found")
        user = session.get(AppUser, uid)
        auth_email = ((user.email if user else None) or auth_user.get("email") or "").strip().lower()
        row_email = (member.email or "").strip().lower()
        if row_email and auth_email and row_email != auth_email:
            raise HTTPException(status_code=403, detail="This invite is for a different email address")
        if member.firebase_uid is not None and member.firebase_uid != uid:
            raise HTTPException(status_code=403, detail="Invite does not belong to this account")
        if (member.invite_status or "").lower() in {"joined", "accepted"}:
            raise HTTPException(status_code=409, detail="Invite already accepted")
        member.invite_status = "removed"
        member.is_added = False
        member.invite_token = None
        budget = session.get(BusinessBudget, member.budget_id)
        if budget is not None:
            budget.updated_at = now
            _append_budget_audit(
                session,
                budget.budget_id,
                uid,
                "invite_declined",
                {"member_id": member.member_id, "email": member.email},
            )
        session.commit()
        return {"status": "declined", "member_id": member.member_id, "budget_id": member.budget_id}


@app.post("/business/moments/invites/{member_id}/decline")
def decline_business_moment_pending_invite(
    member_id: str,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    """Alias for ``POST /business/invites/{member_id}/decline`` (product wording)."""
    return decline_business_pending_invite(member_id, authorization)


@app.post("/business/budgets/{budget_id}/invites/link", response_model=GroupInviteLinkOut)
def business_budget_invite_link(
    budget_id: str,
    authorization: str | None = Header(default=None),
) -> GroupInviteLinkOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        tok = _ensure_business_budget_join_token(session, budget)
        budget.updated_at = datetime.now(timezone.utc)
        session.commit()
        return GroupInviteLinkOut(join_url=_business_invite_link_for_token(tok))


@app.post("/business/moments/{budget_id}/invites/link", response_model=GroupInviteLinkOut)
def business_moment_invite_link(
    budget_id: str,
    authorization: str | None = Header(default=None),
) -> GroupInviteLinkOut:
    return business_budget_invite_link(budget_id, authorization)


@app.post("/business/budgets/{budget_id}/invites/email", response_model=GroupInviteEmailOut)
def send_business_budget_invites_email(
    budget_id: str,
    payload: GroupInviteEmailIn,
    authorization: str | None = Header(default=None),
) -> GroupInviteEmailOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)

        normalized = [e.strip().lower() for e in payload.emails if e.strip()]
        target_emails = list(dict.fromkeys(normalized))
        if not target_emails:
            target_emails = list(
                dict.fromkeys(
                    [
                        (m.email or "").strip().lower()
                        for m in session.scalars(
                            select(BusinessBudgetMember).where(BusinessBudgetMember.budget_id == budget_id),
                        ).all()
                        if (m.email or "").strip()
                        and (m.invite_status or "").lower() in {"pending", "invited"}
                        and m.firebase_uid is None
                    ],
                ),
            )
        if not target_emails:
            raise HTTPException(status_code=400, detail="No invite emails supplied")

        sent = 0
        failed = 0
        error_messages: list[str] = []
        for em in target_emails:
            row = session.scalar(
                select(BusinessBudgetMember)
                .where(BusinessBudgetMember.budget_id == budget_id)
                .where(func.lower(BusinessBudgetMember.email) == em)
                .order_by(desc(BusinessBudgetMember.created_at))
                .limit(1),
            )
            if row is None:
                failed += 1
                error_messages.append(f"{em}: no member row for this budget")
                continue
            if row.firebase_uid is not None:
                failed += 1
                error_messages.append(f"{em}: already joined")
                continue
            tok = _ensure_business_member_invite_token(session, row)
            invite_link = _business_invite_link_for_token(tok)
            custom_msg = (
                (payload.message or "You've been invited to join a business workspace on Momentra.").strip()
            )
            body_text = f"{custom_msg}\n\nJoin now: {invite_link}"
            body_html = (
                f"<p>{custom_msg}</p>"
                f"<p><strong>Join now:</strong> <a href='{invite_link}'>{invite_link}</a></p>"
            )
            ok, err = _send_email_with_resend(
                to_email=em,
                subject=f"Join {budget.budget_name} on Momentra",
                text_body=body_text,
                html_body=body_html,
            )
            row.invited_at = row.invited_at or now
            budget.updated_at = now
            if ok:
                sent += 1
                _append_budget_audit(
                    session,
                    budget_id,
                    uid,
                    "email_invite_sent",
                    {"email": em},
                )
            else:
                failed += 1
                if err:
                    error_messages.append(f"{em}: {err}")

        session.commit()
        return GroupInviteEmailOut(sent=sent, failed=failed, total=len(target_emails), error_messages=error_messages)


@app.post("/business/moments/{budget_id}/invites/email", response_model=GroupInviteEmailOut)
def send_business_moment_invites_email(
    budget_id: str,
    payload: GroupInviteEmailIn,
    authorization: str | None = Header(default=None),
) -> GroupInviteEmailOut:
    return send_business_budget_invites_email(budget_id, payload, authorization)


@app.get("/group/invites/pending", response_model=GroupPendingInvitesOut)
def group_pending_invites(
    authorization: str | None = Header(default=None),
) -> GroupPendingInvitesOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        user = session.get(AppUser, uid)
        email = ((user.email if user else None) or auth_user.get("email") or "").strip().lower()
        if not email:
            return GroupPendingInvitesOut(invites=[])
        rows = session.execute(
            select(GroupMomentInvite, GroupMoment)
            .join(GroupMoment, GroupMomentInvite.moment_id == GroupMoment.moment_id)
            .where(func.lower(GroupMomentInvite.email) == email)
            .where(func.lower(GroupMomentInvite.status).in_(["pending", "invited", "sent"]))
            .order_by(nullslast(desc(GroupMomentInvite.sent_at)), desc(GroupMomentInvite.created_at)),
        ).all()
        invites: list[GroupPendingInviteOut] = []
        seen_moment_ids: set[str] = set()
        for invite, moment in rows:
            if moment.moment_id in seen_moment_ids:
                continue
            seen_moment_ids.add(moment.moment_id)
            invites.append(
                GroupPendingInviteOut(
                    invite_id=invite.invite_id,
                    moment_id=moment.moment_id,
                    moment_title=moment.title,
                    email=invite.email,
                    status=invite.status,
                    sent_at=invite.sent_at,
                    created_at=invite.created_at,
                    invite_token=invite.invite_token,
                ),
            )
        return GroupPendingInvitesOut(invites=invites)


@app.get("/group/moments/invites/pending", response_model=GroupPendingInvitesOut)
def group_moments_pending_invites(
    authorization: str | None = Header(default=None),
) -> GroupPendingInvitesOut:
    """Alias for ``GET /group/invites/pending`` (product wording)."""
    return group_pending_invites(authorization)


@app.post("/business/budgets/{budget_id}/vendors", response_model=BusinessBudgetCreateOut)
def add_business_budget_vendor(
    budget_id: str,
    payload: BusinessVendorIn,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    vendor_name = _normalize_vendor_name(payload.vendor_name)
    if not vendor_name:
        raise HTTPException(status_code=422, detail="vendor_name is required")
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_ROLE_VALUES)
        existing = session.scalar(
            select(BusinessBudgetVendor)
            .where(BusinessBudgetVendor.budget_id == budget_id)
            .where(func.lower(BusinessBudgetVendor.vendor_name) == vendor_name.lower())
            .limit(1),
        )
        if existing is None:
            session.add(
                BusinessBudgetVendor(
                    budget_id=budget_id,
                    vendor_name=vendor_name,
                    created_by_uid=uid,
                    created_at=now,
                ),
            )
            budget.updated_at = now
            _append_budget_audit(
                session,
                budget_id,
                uid,
                "vendor_added",
                {"vendor_name": vendor_name},
            )
            session.commit()
            session.refresh(budget)
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.patch("/business/budgets/{budget_id}/vendors/{vendor_id}", response_model=BusinessBudgetCreateOut)
def patch_business_budget_vendor(
    budget_id: str,
    vendor_id: str,
    payload: BusinessVendorPatchIn,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    new_name = _normalize_vendor_name(payload.vendor_name)
    if not new_name:
        raise HTTPException(status_code=422, detail="vendor_name is required")
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        vendor = session.get(BusinessBudgetVendor, vendor_id)
        if vendor is None or vendor.budget_id != budget_id:
            raise HTTPException(status_code=404, detail="Vendor not found")
        old_name = (vendor.vendor_name or "").strip()
        if not old_name:
            raise HTTPException(status_code=422, detail="Vendor name is invalid")
        if old_name.lower() == new_name.lower():
            return _business_budget_out(session=session, budget=budget, viewer_uid=uid)
        clash = session.scalar(
            select(BusinessBudgetVendor)
            .where(BusinessBudgetVendor.budget_id == budget_id)
            .where(BusinessBudgetVendor.vendor_id != vendor_id)
            .where(func.lower(BusinessBudgetVendor.vendor_name) == new_name.lower())
            .limit(1),
        )
        if clash is not None:
            raise HTTPException(status_code=409, detail="A vendor with this name already exists")
        vendor.vendor_name = new_name
        approvals = session.scalars(
            select(BusinessBudgetApproval)
            .where(BusinessBudgetApproval.budget_id == budget_id)
            .where(func.lower(BusinessBudgetApproval.vendor_name) == old_name.lower()),
        ).all()
        for appr in approvals:
            appr.vendor_name = new_name
        budget.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "vendor_renamed",
            {"vendor_id": vendor_id, "from": old_name, "to": new_name},
        )
        session.commit()
        session.refresh(budget)
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.delete("/business/budgets/{budget_id}/vendors/{vendor_id}", response_model=BusinessBudgetCreateOut)
def delete_business_budget_vendor(
    budget_id: str,
    vendor_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        vendor = session.get(BusinessBudgetVendor, vendor_id)
        if vendor is None or vendor.budget_id != budget_id:
            raise HTTPException(status_code=404, detail="Vendor not found")
        vname = (vendor.vendor_name or "").strip()
        history_count = (
            session.scalar(
                select(func.count())
                .select_from(BusinessBudgetApproval)
                .where(BusinessBudgetApproval.budget_id == budget_id)
                .where(func.lower(BusinessBudgetApproval.vendor_name) == vname.lower()),
            )
            or 0
        )
        if int(history_count) > 0:
            raise HTTPException(status_code=409, detail="Cannot delete vendor with transaction history. Rename instead.")
        session.delete(vendor)
        budget.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "vendor_deleted",
            {"vendor_id": vendor_id, "vendor_name": vname},
        )
        session.commit()
        session.refresh(budget)
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.patch("/business/budgets/{budget_id}/members/{member_id}", response_model=BusinessBudgetCreateOut)
def patch_business_budget_member(
    budget_id: str,
    member_id: str,
    payload: BusinessBudgetMemberPatchIn,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        member = session.get(BusinessBudgetMember, member_id)
        if member is None or member.budget_id != budget_id:
            raise HTTPException(status_code=404, detail="Member not found")
        if payload.display_name is not None:
            member.display_name = payload.display_name.strip()[:200]
        if payload.role is not None:
            role_norm = _business_role_norm(payload.role)
            if role_norm == "owner":
                raise HTTPException(status_code=422, detail="Owner role is reserved")
            member.role = role_norm
        if payload.firebase_uid is not None:
            member.firebase_uid = payload.firebase_uid.strip()[:128] if payload.firebase_uid else None
        if payload.email is not None:
            member.email = payload.email.strip().lower()[:255] if payload.email else None
        if payload.invite_status is not None:
            status_norm = payload.invite_status.strip().lower()
            if status_norm not in {"draft", "pending", "joined", "accepted", "removed"}:
                raise HTTPException(status_code=422, detail="invite_status invalid")
            member.invite_status = status_norm
            if status_norm in {"joined", "accepted"}:
                member.joined_at = member.joined_at or now
        if payload.limit is not None:
            member.spend_limit = payload.limit.strip()[:64] if payload.limit else None
        if payload.added is not None:
            member.is_added = payload.added
            if payload.added:
                member.invited_at = member.invited_at or now
        budget.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "member_updated",
            {"member_id": member_id, **payload.model_dump(exclude_unset=True)},
        )
        session.commit()
        session.refresh(budget)
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.delete("/business/budgets/{budget_id}/members/{member_id}", response_model=BusinessBudgetCreateOut)
def delete_business_budget_member(
    budget_id: str,
    member_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        member = session.get(BusinessBudgetMember, member_id)
        if member is None or member.budget_id != budget_id:
            raise HTTPException(status_code=404, detail="Member not found")
        dn = member.display_name
        session.delete(member)
        budget.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "member_removed",
            {"member_id": member_id, "display_name": dn},
        )
        session.commit()
        session.refresh(budget)
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.post("/business/budgets/{budget_id}/expenses", response_model=BusinessBudgetCreateOut)
def post_business_budget_expense(
    budget_id: str,
    payload: BusinessExpenseIn,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    amount_dec = Decimal(str(payload.amount)).quantize(Decimal("0.01"))
    if amount_dec <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    tax_dec = Decimal(str(payload.tax_amount)).quantize(Decimal("0.01")) if payload.tax_amount is not None else None
    if tax_dec is not None and tax_dec < 0:
        raise HTTPException(status_code=400, detail="tax_amount cannot be negative")
    entry_kind = (payload.entry_kind or payload.expense_or_purchase or "expense").strip().lower()
    if entry_kind not in BUSINESS_ENTRY_KIND_VALUES:
        raise HTTPException(status_code=422, detail="entry_kind must be expense or purchase")

    with db_session() as session:
        budget, role, member = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_ROLE_VALUES)
        if budget.status != "active":
            raise HTTPException(status_code=400, detail="Budget is not accepting new expenses")
        if budget.expenses_blocked:
            raise HTTPException(status_code=400, detail="New expenses are blocked for this budget")

        category = session.get(BusinessBudgetCategory, payload.category_id)
        if category is None or category.budget_id != budget_id:
            raise HTTPException(status_code=404, detail="Category not found")
        subcategory = _validate_business_catalog_submission(
            session=session,
            budget_id=budget_id,
            entry_kind=entry_kind,
            category_id=payload.category_id,
            subcategory_label=(payload.subcategory_label or "").strip(),
        )

        policies = _budget_policies_dict(budget)
        if (
            entry_kind == "expense"
            and policies.get("require_receipt_for_all_expenses")
            and not payload.receipt_attached
        ):
            raise HTTPException(status_code=422, detail="Receipt is required by policy")

        base_title = (payload.title or ("Purchase" if entry_kind == "purchase" else "Expense")).strip()[:160] or (
            "Purchase" if entry_kind == "purchase" else "Expense"
        )
        note = (payload.approval_note or "").strip()
        if note:
            title = f"{base_title} · {note}"[:200]
        else:
            title = base_title[:200]

        requester = (payload.requester_name or "").strip()[:200]
        if not requester:
            requester = (member.display_name if member is not None else "") or "Team member"
        sub = subcategory
        vendor = (payload.vendor_name or "").strip()[:200] or None
        invoice = (payload.invoice_number or "").strip()[:120] or None
        payment_mode = (payload.payment_mode or "").strip()[:32] or None
        expense_or_purchase = entry_kind
        gstin = (payload.gstin or "").strip().upper()[:32] or None

        paid_mode: str | None = None
        purchase_payment_status: str | None = None
        quantity_dec: Decimal | None = None
        unit_norm: str | None = None
        price_per_unit_dec: Decimal | None = None
        total_amount_dec: Decimal | None = None
        paid_amount_dec: Decimal | None = None
        vendor_balance_dec: Decimal | None = None
        payment_splits_rows = _normalize_payment_splits(payload.payment_splits)
        payment_splits_total = _payment_split_total(payment_splits_rows)

        if entry_kind == "expense":
            total_amount_dec = amount_dec
            if payment_splits_rows:
                if payment_splits_total != amount_dec:
                    raise HTTPException(status_code=422, detail="For expense, payment split total must equal amount")
                paid_amount_dec = payment_splits_total
                paid_mode = payment_splits_rows[0]["method"] if len(payment_splits_rows) == 1 else "mixed"
            else:
                paid_mode = (payload.paid_mode or "").strip().lower()
                if paid_mode not in BUSINESS_PAID_MODE_VALUES:
                    raise HTTPException(status_code=422, detail="paid_mode must be cash, upi, or card")
                paid_amount_dec = amount_dec
            vendor_balance_dec = Decimal("0")
        else:
            unit_norm = (payload.unit or "").strip().lower()
            if unit_norm not in BUSINESS_PURCHASE_UNIT_VALUES:
                raise HTTPException(status_code=422, detail="unit must be one of kg, lt, gm")
            provided = {
                "quantity": payload.quantity,
                "price": payload.price_per_unit,
                "total": payload.total_amount,
            }
            provided_count = sum(1 for v in provided.values() if v is not None)
            if provided_count < 2:
                raise HTTPException(status_code=422, detail="Provide any two of quantity, price_per_unit, total_amount")
            quantity_dec = Decimal(str(payload.quantity)).quantize(Decimal("0.001")) if payload.quantity is not None else None
            price_per_unit_dec = (
                Decimal(str(payload.price_per_unit)).quantize(Decimal("0.001"))
                if payload.price_per_unit is not None
                else None
            )
            total_amount_dec = (
                Decimal(str(payload.total_amount)).quantize(Decimal("0.01"))
                if payload.total_amount is not None
                else None
            )
            if quantity_dec is None and price_per_unit_dec and total_amount_dec:
                if price_per_unit_dec <= 0:
                    raise HTTPException(status_code=422, detail="price_per_unit must be positive")
                quantity_dec = (total_amount_dec / price_per_unit_dec).quantize(Decimal("0.001"))
            elif price_per_unit_dec is None and quantity_dec and total_amount_dec:
                if quantity_dec <= 0:
                    raise HTTPException(status_code=422, detail="quantity must be positive")
                price_per_unit_dec = (total_amount_dec / quantity_dec).quantize(Decimal("0.001"))
            elif total_amount_dec is None and quantity_dec and price_per_unit_dec:
                total_amount_dec = (quantity_dec * price_per_unit_dec).quantize(Decimal("0.01"))
            if quantity_dec is None or price_per_unit_dec is None or total_amount_dec is None:
                raise HTTPException(status_code=422, detail="Could not compute purchase fields")
            amount_dec = total_amount_dec

            purchase_payment_status = (payload.purchase_payment_status or "").strip().lower()
            if purchase_payment_status not in BUSINESS_PURCHASE_PAYMENT_STATUS_VALUES:
                raise HTTPException(status_code=422, detail="purchase_payment_status must be paid, partially_paid, or credit")
            if not vendor:
                raise HTTPException(status_code=422, detail="vendor_name is required for purchase")

            if purchase_payment_status == "paid":
                paid_amount_dec = payment_splits_total if payment_splits_rows else total_amount_dec
                if paid_amount_dec != total_amount_dec:
                    raise HTTPException(status_code=422, detail="For paid purchase, paid total must equal total_amount")
                vendor_balance_dec = Decimal("0")
            else:
                if payment_splits_rows:
                    paid_amount_dec = payment_splits_total
                else:
                    if payload.paid_amount is None:
                        raise HTTPException(status_code=422, detail="paid_amount is required for partially_paid or credit")
                    paid_amount_dec = Decimal(str(payload.paid_amount)).quantize(Decimal("0.01"))
                if paid_amount_dec < 0 or paid_amount_dec > total_amount_dec:
                    raise HTTPException(status_code=422, detail="paid_amount must be between 0 and total_amount")
                vendor_balance_dec = (total_amount_dec - paid_amount_dec).quantize(Decimal("0.01"))
                if purchase_payment_status == "credit" and paid_amount_dec > 0:
                    raise HTTPException(status_code=422, detail="credit entries must have paid_amount 0")

        if vendor and invoice:
            duplicate = session.scalar(
                select(BusinessBudgetApproval)
                .where(BusinessBudgetApproval.budget_id == budget_id)
                .where(BusinessBudgetApproval.vendor_name == vendor)
                .where(BusinessBudgetApproval.invoice_number == invoice)
                .where(BusinessBudgetApproval.total_amount == (total_amount_dec or amount_dec))
                .limit(1),
            )
            if duplicate is not None:
                raise HTTPException(status_code=409, detail="Duplicate vendor invoice submission detected")

        _ensure_business_vendor(
            session=session,
            budget_id=budget_id,
            vendor_name=vendor,
            created_by_uid=uid,
            now=now,
        )

        appr = BusinessBudgetApproval(
            budget_id=budget_id,
            title=title,
            requester_name=requester,
            amount=amount_dec,
            submitter_uid=uid,
            department=budget.department,
            category_id=payload.category_id,
            subcategory_label=sub[:200] if sub else None,
            entry_kind=entry_kind,
            paid_mode=paid_mode,
            purchase_payment_status=purchase_payment_status,
            quantity=quantity_dec,
            unit=unit_norm,
            price_per_unit=price_per_unit_dec,
            total_amount=total_amount_dec or amount_dec,
            paid_amount=paid_amount_dec,
            vendor_balance_amount=vendor_balance_dec,
            payment_splits_json=json.dumps({"rows": payment_splits_rows}) if payment_splits_rows else None,
            vendor_name=vendor,
            invoice_number=invoice,
            expense_or_purchase=expense_or_purchase,
            payment_mode=payment_mode,
            due_date=payload.due_date,
            gstin=gstin,
            tax_amount=tax_dec,
            receipt_attached=payload.receipt_attached,
            status="pending",
            created_at=now,
        )
        session.add(appr)
        session.flush()

        threshold = budget.approval_threshold or Decimal(0)
        auto_approve = bool(policies.get("auto_approve_below_threshold")) and threshold > 0 and amount_dec <= threshold
        if auto_approve:
            appr.status = "approved"
            appr.resolved_at = now
            appr.receipt_verified = bool(payload.receipt_attached)
            appr.approver_uid = uid
            category.spent_amount = (category.spent_amount or Decimal(0)) + (total_amount_dec or amount_dec)
            _sync_budget_spent_from_categories(session, budget_id)
            total = budget.total_budget or Decimal(0)
            spent = budget.spent_amount or Decimal(0)
            if policies.get("lock_budget_when_limit_hit") and total > 0 and spent >= total:
                budget.expenses_blocked = True

        _append_budget_audit(
            session,
            budget_id,
            uid,
            "expense_auto_approved" if auto_approve else "expense_submitted",
            {
                "approval_id": appr.approval_id,
                "amount": float(amount_dec),
                "title": title,
                "expense_or_purchase": expense_or_purchase,
                "entry_kind": entry_kind,
                "vendor_name": vendor,
                "invoice_number": invoice,
            },
        )

        budget.updated_at = now
        session.commit()

        budget = session.get(BusinessBudget, budget_id)
        if budget is None:
            raise HTTPException(status_code=404, detail="Budget not found")
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.post(
    "/business/budgets/{budget_id}/approvals/{approval_id}/approve",
    response_model=BusinessBudgetCreateOut,
)
def approve_business_budget_approval(
    budget_id: str,
    approval_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        approval = session.get(BusinessBudgetApproval, approval_id)
        if approval is None or approval.budget_id != budget_id:
            raise HTTPException(status_code=404, detail="Approval not found")
        if approval.status != "pending":
            raise HTTPException(status_code=400, detail="Approval is not pending")

        if approval.category_id:
            cat = session.get(BusinessBudgetCategory, approval.category_id)
            if cat is not None and cat.budget_id == budget_id:
                cat.spent_amount = (cat.spent_amount or Decimal(0)) + approval.amount
        _sync_budget_spent_from_categories(session, budget_id)

        policies = _budget_policies_dict(budget)
        total = budget.total_budget or Decimal(0)
        spent = budget.spent_amount or Decimal(0)
        if policies.get("lock_budget_when_limit_hit") and total > 0 and spent >= total:
            budget.expenses_blocked = True

        approval.status = "approved"
        approval.resolved_at = now
        approval.receipt_verified = True
        approval.approver_uid = uid
        budget.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "expense_approved",
            {"approval_id": approval_id, "amount": float(approval.amount or 0)},
        )
        session.commit()

        budget = session.get(BusinessBudget, budget_id)
        if budget is None:
            raise HTTPException(status_code=404, detail="Budget not found")
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.post(
    "/business/budgets/{budget_id}/approvals/{approval_id}/reject",
    response_model=BusinessBudgetCreateOut,
)
def reject_business_budget_approval(
    budget_id: str,
    approval_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        approval = session.get(BusinessBudgetApproval, approval_id)
        if approval is None or approval.budget_id != budget_id:
            raise HTTPException(status_code=404, detail="Approval not found")
        if approval.status != "pending":
            raise HTTPException(status_code=400, detail="Approval is not pending")

        approval.status = "rejected"
        approval.resolved_at = now
        approval.approver_uid = uid
        budget.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "expense_rejected",
            {"approval_id": approval_id},
        )
        session.commit()

        budget = session.get(BusinessBudget, budget_id)
        if budget is None:
            raise HTTPException(status_code=404, detail="Budget not found")
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.post(
    "/business/budgets/{budget_id}/approvals/{approval_id}/request-receipt",
    response_model=BusinessBudgetCreateOut,
)
def request_receipt_business_budget_approval(
    budget_id: str,
    approval_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        approval = session.get(BusinessBudgetApproval, approval_id)
        if approval is None or approval.budget_id != budget_id:
            raise HTTPException(status_code=404, detail="Approval not found")
        if approval.status != "pending":
            raise HTTPException(status_code=400, detail="Approval is not pending")

        approval.receipt_followup_requested = True
        budget.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "receipt_requested",
            {"approval_id": approval_id},
        )
        session.commit()

        budget = session.get(BusinessBudget, budget_id)
        if budget is None:
            raise HTTPException(status_code=404, detail="Budget not found")
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.post(
    "/business/budgets/{budget_id}/approvals/{approval_id}/receipt",
    response_model=BusinessBudgetCreateOut,
)
async def upload_business_budget_approval_receipt(
    budget_id: str,
    approval_id: str,
    authorization: str | None = Header(default=None),
    file: UploadFile = File(...),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    mime = file.content_type or "application/octet-stream"
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in (".jpg", ".jpeg", ".png", ".pdf", ".webp", ""):
        suffix = ".bin"
    dest_dir = MOMENTRA_UPLOAD_DIR / "business_receipts" / budget_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{approval_id}_{uuid4().hex}{suffix if suffix else '.bin'}"
    dest_path = dest_dir / fname
    dest_path.write_bytes(data)

    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_ROLE_VALUES)
        approval = session.get(BusinessBudgetApproval, approval_id)
        if approval is None or approval.budget_id != budget_id:
            raise HTTPException(status_code=404, detail="Approval not found")
        if approval.submitter_uid and role == "employee" and approval.submitter_uid != uid:
            raise HTTPException(status_code=403, detail="Employees can upload receipts only for their own submissions")

        approval.receipt_attached = True
        approval.receipt_path = str(dest_path)
        approval.receipt_mime = mime[:128]
        approval.receipt_name = (file.filename or fname)[:255]
        budget.updated_at = now
        _append_budget_audit(
            session,
            budget_id,
            uid,
            "business_receipt_uploaded",
            {"approval_id": approval_id, "receipt_name": approval.receipt_name},
        )
        session.commit()
        session.refresh(budget)
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.get("/business/budgets/{budget_id}/approvals/{approval_id}/receipt")
def download_business_budget_approval_receipt(
    budget_id: str,
    approval_id: str,
    authorization: str | None = Header(default=None),
) -> FileResponse:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_ROLE_VALUES)
        approval = session.get(BusinessBudgetApproval, approval_id)
        if approval is None or approval.budget_id != budget_id or not approval.receipt_path:
            raise HTTPException(status_code=404, detail="Receipt not found")
        if approval.submitter_uid and role == "employee" and approval.submitter_uid != uid:
            raise HTTPException(status_code=403, detail="Employees can only download their own receipts")
        path = Path(approval.receipt_path)
        mime = approval.receipt_mime or "application/octet-stream"
        filename = approval.receipt_name or path.name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Receipt file missing")
    return FileResponse(path, media_type=mime, filename=filename)


@app.post("/business/budgets/{budget_id}/block-expenses", response_model=BusinessBudgetCreateOut)
def block_business_budget_expenses(
    budget_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        budget.expenses_blocked = True
        budget.updated_at = now
        _append_budget_audit(session, budget_id, uid, "expenses_blocked", {})
        session.commit()
        session.refresh(budget)
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.delete("/business/budgets/{budget_id}")
def delete_business_budget(
    budget_id: str,
    authorization: str | None = Header(default=None),
) -> Response:
    auth_user = _user_from_auth_header(authorization)
    owner_uid = str(auth_user["uid"])
    with db_session() as session:
        budget = session.get(BusinessBudget, budget_id)
        if budget is None or budget.owner_uid != owner_uid:
            raise HTTPException(status_code=404, detail="Budget not found")
        bname = budget.budget_name
        _append_budget_audit(session, budget_id, owner_uid, "budget_deleted", {"budget_name": bname})
        session.delete(budget)
        session.commit()
    return Response(status_code=204)


@app.post("/business/budgets/{budget_id}/close", response_model=BusinessBudgetCreateOut)
def close_business_budget_period(
    budget_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        budget.status = "closed"
        budget.updated_at = now
        _append_budget_audit(session, budget_id, uid, "budget_closed", {})
        session.commit()
        session.refresh(budget)
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.post("/business/budgets/{budget_id}/archive", response_model=BusinessBudgetCreateOut)
def archive_business_budget(
    budget_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        budget.status = "archived"
        budget.updated_at = now
        _append_budget_audit(session, budget_id, uid, "budget_archived", {})
        session.commit()
        session.refresh(budget)
        return _business_budget_out(session=session, budget=budget, viewer_uid=uid)


@app.post("/business/budgets/{budget_id}/renew", response_model=BusinessBudgetCreateOut)
def renew_business_budget(
    budget_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessBudgetCreateOut:
    auth_user = _user_from_auth_header(authorization)
    owner_uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget = _get_owned_budget(session, budget_id, owner_uid)
        new_budget = BusinessBudget(
            owner_uid=budget.owner_uid,
            budget_name=f"{budget.budget_name} (renewed)",
            budget_type=budget.budget_type,
            total_budget=budget.total_budget,
            budget_period=budget.budget_period,
            department=budget.department,
            approval_threshold=budget.approval_threshold,
            spending_policies_json=budget.spending_policies_json,
            reminder_prefs_json=budget.reminder_prefs_json or _default_reminder_prefs_json(),
            status="active",
            spent_amount=Decimal(0),
            expenses_blocked=False,
            created_at=now,
            updated_at=now,
            join_token=_new_business_join_secret(),
        )
        session.add(new_budget)
        session.flush()

        for c in session.scalars(
            select(BusinessBudgetCategory).where(BusinessBudgetCategory.budget_id == budget.budget_id),
        ).all():
            session.add(
                BusinessBudgetCategory(
                    budget_id=new_budget.budget_id,
                    name=c.name,
                    allocated_amount=c.allocated_amount,
                    spent_amount=Decimal(0),
                    sort_order=c.sort_order,
                ),
            )

        for m in session.scalars(
            select(BusinessBudgetMember).where(BusinessBudgetMember.budget_id == budget.budget_id),
        ).all():
            new_invite = None
            if (m.email or "").strip() and (m.invite_status or "").lower() not in {"joined", "accepted"}:
                new_invite = _new_business_join_secret()
            session.add(
                BusinessBudgetMember(
                    budget_id=new_budget.budget_id,
                    firebase_uid=m.firebase_uid,
                    email=m.email,
                    initials=m.initials,
                    display_name=m.display_name,
                    role=m.role,
                    spend_limit=m.spend_limit,
                    is_added=m.is_added,
                    invite_status=m.invite_status,
                    invited_at=m.invited_at,
                    joined_at=m.joined_at,
                    invite_token=new_invite,
                    created_at=now,
                ),
            )

        _append_budget_audit(
            session,
            new_budget.budget_id,
            owner_uid,
            "budget_renewed",
            {"from_budget_id": budget.budget_id, "budget_name": new_budget.budget_name},
        )
        session.commit()
        session.refresh(new_budget)
        added_n = (
            session.scalar(
                select(func.count())
                .select_from(BusinessBudgetMember)
                .where(
                    BusinessBudgetMember.budget_id == new_budget.budget_id,
                    BusinessBudgetMember.is_added.is_(True),
                ),
            )
            or 0
        )
        return _business_budget_out(
            session=session,
            budget=new_budget,
            viewer_uid=owner_uid,
            fallback_invited_count=int(added_n),
        )


@app.get("/business/budgets/{budget_id}/export", response_model=BusinessExportOut)
def export_business_budget(
    budget_id: str,
    authorization: str | None = Header(default=None),
) -> BusinessExportOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        _, role, _ = _resolve_business_actor(session, budget_id, uid)
        _require_business_role(role, BUSINESS_APPROVER_ROLES)
        budget = session.get(BusinessBudget, budget_id)
        if budget is None:
            raise HTTPException(status_code=404, detail="Budget not found")
        csv_text = _build_budget_export_csv(session, budget_id)
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in budget.budget_name)[:80]
        return BusinessExportOut(
            format="csv",
            filename=f"{safe}-export.csv",
            csv_text=csv_text,
            message="",
        )


@app.post("/group/moments", response_model=GroupMomentOut)
def create_group_moment(
    payload: GroupMomentCreateIn,
    authorization: str | None = Header(default=None),
) -> GroupMomentOut:
    auth_user = _user_from_auth_header(authorization)
    split_mode_norm = payload.split_mode.strip().lower()
    if split_mode_norm not in GROUP_SPLIT_MODE_VALUES:
        raise HTTPException(
            status_code=422,
            detail="split_mode must be one of: equal, exact, percent, shares",
        )
    now = datetime.now(timezone.utc)
    with db_session() as session:
        _ensure_app_user(session, auth_user)
        group_moment = GroupMoment(
            owner_uid=str(auth_user["uid"]),
            title=payload.title,
            moment_type=payload.moment_type,
            target_amount=Decimal(str(payload.target_amount)) if payload.target_amount is not None else None,
            destination=payload.destination,
            trip_start_date=payload.trip_start_date,
            trip_end_date=payload.trip_end_date,
            split_mode=split_mode_norm,
            contribution_due_date=payload.contribution_due_date,
            send_payment_reminders=payload.rules.send_payment_reminders,
            auto_notify_on_contribution=payload.rules.auto_notify_on_contribution,
            allow_partial_payments=payload.rules.allow_partial_payments,
            require_receipt_for_expenses=payload.rules.require_receipt_for_expenses,
            require_organiser_approval=payload.rules.require_organiser_approval,
            join_token=f"{uuid4().hex}{uuid4().hex}",
            status="active",
            milestones_json="[]",
            created_at=now,
            updated_at=now,
        )
        session.add(group_moment)
        session.flush()

        session.add(
            GroupMomentMember(
                moment_id=group_moment.moment_id,
                firebase_uid=str(auth_user["uid"]),
                display_name="You",
                email=auth_user["email"],
                role="organiser",
                status="joined",
                joined_at=now,
                created_at=now,
            ),
        )

        owner_email = (auth_user["email"] or "").lower()
        seen_emails: set[str] = set()
        for seeded_member in payload.members:
            role = seeded_member.role.lower()
            # Creator is always inserted above; wizard still sends a placeholder organiser row.
            if role == "organiser":
                continue
            email = (seeded_member.email or "").strip().lower()
            if email and email == owner_email:
                continue
            if email and email in seen_emails:
                continue
            if email:
                seen_emails.add(email)

            session.add(
                GroupMomentMember(
                    moment_id=group_moment.moment_id,
                    display_name=seeded_member.display_name,
                    email=email or None,
                    role=role,
                    status="invited" if email else "pending",
                    created_at=now,
                ),
            )
            if email and email != owner_email:
                session.add(
                    GroupMomentInvite(
                        moment_id=group_moment.moment_id,
                        email=email,
                        invite_token=f"{uuid4().hex}{uuid4().hex}",
                        status="pending",
                        resend_count=0,
                        created_at=now,
                        updated_at=now,
                    ),
                )

        _seed_group_budget_categories(session, group_moment)
        an = _actor_display(session, auth_user)
        _log_group_activity(
            session,
            group_moment.moment_id,
            "moment_created",
            f"Moment created by {an}",
            group_moment.title,
            str(auth_user["uid"]),
            an,
            {},
        )
        session.commit()
        session.refresh(group_moment)
        return _group_out(session, group_moment)


@app.get("/group/moments", response_model=GroupMomentListOut)
def list_group_moments(
    authorization: str | None = Header(default=None),
) -> GroupMomentListOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        rows = session.scalars(
            select(GroupMoment)
            .where(
                or_(
                    GroupMoment.owner_uid == uid,
                    GroupMoment.moment_id.in_(
                        select(GroupMomentMember.moment_id).where(
                            GroupMomentMember.firebase_uid == uid,
                            GroupMomentMember.status == "joined",
                        ),
                    ),
                ),
            )
            .order_by(GroupMoment.created_at.desc())
            .distinct(),
        ).all()
        return GroupMomentListOut(moments=[_group_out(session, row) for row in rows])


@app.get("/group/moments/{moment_id}", response_model=GroupMomentDetailOut)
def group_moment_detail(
    moment_id: str,
    authorization: str | None = Header(default=None),
) -> GroupMomentDetailOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        acc = _group_access(session, moment_id, uid)
        if acc is None:
            raise HTTPException(status_code=404, detail="Group moment not found")
        group_moment, role = acc
        return _build_group_detail(session, group_moment, role)


@app.patch("/group/moments/{moment_id}", response_model=GroupMomentDetailOut)
def patch_group_moment(
    moment_id: str,
    payload: GroupMomentUpdateIn,
    authorization: str | None = Header(default=None),
) -> GroupMomentDetailOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        acc = _group_access(session, moment_id, uid)
        if acc is None:
            raise HTTPException(status_code=404, detail="Group moment not found")
        group_moment, role = acc
        if role != "owner":
            raise HTTPException(status_code=403, detail="Only the organiser can edit this moment")
        if payload.title is not None:
            group_moment.title = payload.title.strip()
        if payload.target_amount is not None:
            group_moment.target_amount = Decimal(str(payload.target_amount))
        if payload.destination is not None:
            group_moment.destination = payload.destination
        if payload.contribution_due_date is not None:
            group_moment.contribution_due_date = payload.contribution_due_date
        if payload.rules is not None:
            group_moment.send_payment_reminders = payload.rules.send_payment_reminders
            group_moment.auto_notify_on_contribution = payload.rules.auto_notify_on_contribution
            group_moment.allow_partial_payments = payload.rules.allow_partial_payments
            group_moment.require_receipt_for_expenses = payload.rules.require_receipt_for_expenses
            group_moment.require_organiser_approval = payload.rules.require_organiser_approval
        if payload.status is not None:
            allowed = {"active", "completed", "archived"}
            s = payload.status.strip().lower()
            if s not in allowed:
                raise HTTPException(status_code=400, detail="Invalid status")
            group_moment.status = s
        group_moment.updated_at = now
        an = _actor_display(session, auth_user)
        evt = "status_updated" if payload.status is not None else "rules_updated"
        msg = (
            f"Status set to {group_moment.status} by {an}"
            if payload.status is not None
            else f"Moment updated by {an}"
        )
        _log_group_activity(
            session,
            moment_id,
            evt,
            msg,
            group_moment.title,
            uid,
            an,
            {},
        )
        session.commit()
        session.refresh(group_moment)
        return _build_group_detail(session, group_moment, "owner")


@app.delete("/group/moments/{moment_id}")
def delete_group_moment(
    moment_id: str,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        acc = _group_access(session, moment_id, uid)
        if acc is None:
            raise HTTPException(status_code=404, detail="Group moment not found")
        group_moment, role = acc
        if role != "owner":
            raise HTTPException(status_code=403, detail="Only the organiser can delete this moment")
        session.delete(group_moment)
        session.commit()
    return {"status": "deleted"}


@app.post("/group/moments/{moment_id}/expenses", response_model=GroupMomentDetailOut)
def create_group_expense(
    moment_id: str,
    payload: GroupExpenseCreateIn,
    authorization: str | None = Header(default=None),
) -> GroupMomentDetailOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        acc = _group_access(session, moment_id, uid)
        if acc is None:
            raise HTTPException(status_code=404, detail="Group moment not found")
        group_moment, role = acc
        payer = session.get(GroupMomentMember, payload.paid_by_member_id)
        if payer is None or payer.moment_id != moment_id:
            raise HTTPException(status_code=400, detail="Invalid paid_by_member_id")
        joined = session.scalars(
            select(GroupMomentMember)
            .where(GroupMomentMember.moment_id == moment_id)
            .where(GroupMomentMember.status == "joined"),
        ).all()
        _ensure_group_budget_categories(session, group_moment)
        cat_ok = session.execute(
            select(GroupBudgetCategory.category_id).where(
                GroupBudgetCategory.moment_id == moment_id,
                GroupBudgetCategory.category_key == payload.category_key,
            ),
        ).first()
        if cat_ok is None:
            raise HTTPException(status_code=400, detail="Unknown category_key")

        split_mode_norm = payload.split_mode.strip().lower()
        splits_json = _build_expense_splits_json(
            Decimal(str(payload.amount)),
            split_mode_norm,
            payload.split_lines,
            joined,
        )

        st = "pending" if group_moment.require_organiser_approval else "approved"
        exp = GroupExpense(
            moment_id=moment_id,
            category_key=payload.category_key,
            subcategory=payload.subcategory,
            title=payload.title.strip(),
            amount=Decimal(str(payload.amount)),
            expense_date=payload.expense_date,
            paid_by_member_id=payload.paid_by_member_id,
            receipt_notes=payload.receipt_notes,
            split_mode=split_mode_norm,
            splits_json=splits_json,
            status=st,
            created_by_uid=uid,
            created_at=now,
        )
        session.add(exp)
        session.flush()
        an = _actor_display(session, auth_user)
        _log_group_activity(
            session,
            moment_id,
            "expense_added",
            f"{an} added {payload.title} · ₹{payload.amount:,.0f}",
            payload.subcategory or payload.category_key,
            uid,
            an,
            {"expense_id": exp.expense_id},
        )
        group_moment.updated_at = now
        session.commit()
        session.refresh(group_moment)
        return _build_group_detail(session, group_moment, role)


@app.post("/group/moments/{moment_id}/contributions", response_model=GroupMomentDetailOut)
def create_group_contribution(
    moment_id: str,
    payload: GroupContributionCreateIn,
    authorization: str | None = Header(default=None),
) -> GroupMomentDetailOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        acc = _group_access(session, moment_id, uid)
        if acc is None:
            raise HTTPException(status_code=404, detail="Group moment not found")
        group_moment, role = acc
        mem = session.get(GroupMomentMember, payload.member_id)
        if mem is None or mem.moment_id != moment_id:
            raise HTTPException(status_code=400, detail="Invalid member_id")
        if role == "member":
            self_m = session.execute(
                select(GroupMomentMember)
                .where(GroupMomentMember.moment_id == moment_id)
                .where(GroupMomentMember.firebase_uid == uid)
                .where(GroupMomentMember.status == "joined"),
            ).scalar_one_or_none()
            if self_m is None or self_m.member_id != payload.member_id:
                raise HTTPException(status_code=403, detail="You can only add contributions for yourself")
        gc = GroupContribution(
            moment_id=moment_id,
            member_id=payload.member_id,
            amount=Decimal(str(payload.amount)),
            note=payload.note,
            created_by_uid=uid,
            created_at=now,
        )
        session.add(gc)
        payer_name = mem.display_name or mem.email or "Member"
        an = _actor_display(session, auth_user)
        _log_group_activity(
            session,
            moment_id,
            "payment_received",
            f"{payer_name} contributed ₹{payload.amount:,.0f}",
            payload.note or "Fund contribution",
            uid,
            an,
            {"member_id": payload.member_id},
        )
        group_moment.updated_at = now
        session.commit()
        session.refresh(group_moment)
        return _build_group_detail(session, group_moment, role)


@app.post("/group/moments/{moment_id}/members/{member_id}/remind", response_model=GroupMomentDetailOut)
def remind_group_member(
    moment_id: str,
    member_id: str,
    authorization: str | None = Header(default=None),
) -> GroupMomentDetailOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        acc = _group_access(session, moment_id, uid)
        if acc is None:
            raise HTTPException(status_code=404, detail="Group moment not found")
        group_moment, role = acc
        if role != "owner":
            raise HTTPException(status_code=403, detail="Only the organiser can send reminders")
        mem = session.get(GroupMomentMember, member_id)
        if mem is None or mem.moment_id != moment_id:
            raise HTTPException(status_code=404, detail="Member not found")
        nm = mem.display_name or mem.email or "Member"
        an = _actor_display(session, auth_user)
        _log_group_activity(
            session,
            moment_id,
            "reminder_sent",
            f"Payment reminder sent to {nm}",
            "Pending contribution",
            uid,
            an,
            {"member_id": member_id},
        )
        group_moment.updated_at = now
        session.commit()
        session.refresh(group_moment)
        return _build_group_detail(session, group_moment, "owner")


@app.delete("/group/moments/{moment_id}/members/{member_id}", response_model=GroupMomentDetailOut)
def delete_group_member(
    moment_id: str,
    member_id: str,
    authorization: str | None = Header(default=None),
) -> GroupMomentDetailOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        acc = _group_access(session, moment_id, uid)
        if acc is None:
            raise HTTPException(status_code=404, detail="Group moment not found")
        group_moment, role = acc
        if role != "owner":
            raise HTTPException(status_code=403, detail="Only the organiser can remove members")
        mem = session.get(GroupMomentMember, member_id)
        if mem is None or mem.moment_id != moment_id:
            raise HTTPException(status_code=404, detail="Member not found")
        if mem.firebase_uid == group_moment.owner_uid:
            raise HTTPException(status_code=400, detail="Cannot remove the organiser from this moment")
        n_contrib = session.scalar(
            select(func.count())
            .select_from(GroupContribution)
            .where(GroupContribution.member_id == member_id),
        ) or 0
        if int(n_contrib) > 0:
            raise HTTPException(
                status_code=400,
                detail="This member has fund contributions; remove or reassign those first.",
            )
        n_payer = session.scalar(
            select(func.count())
            .select_from(GroupExpense)
            .where(GroupExpense.paid_by_member_id == member_id),
        ) or 0
        if int(n_payer) > 0:
            raise HTTPException(
                status_code=400,
                detail="This member is listed as payer on an expense; update those expenses first.",
            )
        nm = mem.display_name or mem.email or "Member"
        an = _actor_display(session, auth_user)
        _log_group_activity(
            session,
            moment_id,
            "member_removed",
            f"{nm} removed from the moment",
            None,
            uid,
            an,
            {"member_id": member_id},
        )
        session.delete(mem)
        group_moment.updated_at = now
        session.commit()
        session.refresh(group_moment)
        return _build_group_detail(session, group_moment, "owner")


@app.post("/group/moments/{moment_id}/expenses/{expense_id}/receipt", response_model=GroupMomentDetailOut)
async def upload_group_expense_receipt(
    moment_id: str,
    expense_id: str,
    authorization: str | None = Header(default=None),
    file: UploadFile = File(...),
) -> GroupMomentDetailOut:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    mime = file.content_type or "application/octet-stream"
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in (".jpg", ".jpeg", ".png", ".pdf", ".webp", ""):
        suffix = ".bin"
    dest_dir = MOMENTRA_UPLOAD_DIR / "group_receipts" / moment_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{expense_id}_{uuid4().hex}{suffix if suffix else '.bin'}"
    dest_path = dest_dir / fname
    dest_path.write_bytes(data)

    with db_session() as session:
        acc = _group_access(session, moment_id, uid)
        if acc is None:
            raise HTTPException(status_code=404, detail="Group moment not found")
        group_moment, role = acc
        exp = session.get(GroupExpense, expense_id)
        if exp is None or exp.moment_id != moment_id:
            raise HTTPException(status_code=404, detail="Expense not found")
        exp.receipt_path = str(dest_path)
        exp.receipt_mime = mime
        group_moment.updated_at = now
        an = _actor_display(session, auth_user)
        _log_group_activity(
            session,
            moment_id,
            "receipt_attached",
            f"Receipt uploaded for {exp.title}",
            exp.title,
            uid,
            an,
            {"expense_id": expense_id},
        )
        session.commit()
        session.refresh(group_moment)
        return _build_group_detail(session, group_moment, role)


@app.get("/group/moments/{moment_id}/expenses/{expense_id}/receipt")
def download_group_expense_receipt(
    moment_id: str,
    expense_id: str,
    authorization: str | None = Header(default=None),
) -> FileResponse:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    with db_session() as session:
        acc = _group_access(session, moment_id, uid)
        if acc is None:
            raise HTTPException(status_code=404, detail="Group moment not found")
        exp = session.get(GroupExpense, expense_id)
        if exp is None or exp.moment_id != moment_id or not exp.receipt_path:
            raise HTTPException(status_code=404, detail="Receipt not found")
        path = Path(exp.receipt_path)
        mime = exp.receipt_mime or "application/octet-stream"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Receipt file missing")
    return FileResponse(path, media_type=mime)


@app.post("/group/moments/{moment_id}/invites/link", response_model=GroupInviteLinkOut)
def group_invite_link(
    moment_id: str,
    authorization: str | None = Header(default=None),
) -> GroupInviteLinkOut:
    auth_user = _user_from_auth_header(authorization)
    with db_session() as session:
        group_moment = session.get(GroupMoment, moment_id)
        if group_moment is None or group_moment.owner_uid != auth_user["uid"]:
            raise HTTPException(status_code=404, detail="Group moment not found")
        return GroupInviteLinkOut(join_url=_invite_link_for_token(group_moment.join_token))


@app.post("/group/moments/{moment_id}/invites/email", response_model=GroupInviteEmailOut)
def send_group_invites_email(
    moment_id: str,
    payload: GroupInviteEmailIn,
    authorization: str | None = Header(default=None),
) -> GroupInviteEmailOut:
    auth_user = _user_from_auth_header(authorization)
    now = datetime.now(timezone.utc)
    with db_session() as session:
        group_moment = session.get(GroupMoment, moment_id)
        if group_moment is None or group_moment.owner_uid != auth_user["uid"]:
            raise HTTPException(status_code=404, detail="Group moment not found")

        normalized = [email.strip().lower() for email in payload.emails if email.strip()]
        target_emails = list(dict.fromkeys(normalized))
        if not target_emails:
            target_emails = [
                invite.email
                for invite in session.scalars(
                    select(GroupMomentInvite).where(GroupMomentInvite.moment_id == moment_id),
                ).all()
            ]
        if not target_emails:
            raise HTTPException(status_code=400, detail="No invite emails supplied")

        sent = 0
        failed = 0
        error_messages: list[str] = []
        for email in target_emails:
            invite = session.execute(
                select(GroupMomentInvite)
                .where(GroupMomentInvite.moment_id == moment_id)
                .where(GroupMomentInvite.email == email),
            ).scalar_one_or_none()
            if invite is None:
                invite = GroupMomentInvite(
                    moment_id=moment_id,
                    email=email,
                    invite_token=f"{uuid4().hex}{uuid4().hex}",
                    status="pending",
                    resend_count=0,
                    created_at=now,
                    updated_at=now,
                )
                session.add(invite)
                session.flush()

            invite_link = _invite_link_for_token(invite.invite_token)
            custom_msg = (payload.message or "You've been invited to join a group moment on Momentra.").strip()
            body_text = f"{custom_msg}\n\nJoin now: {invite_link}"
            body_html = (
                f"<p>{custom_msg}</p>"
                f"<p><strong>Join now:</strong> <a href='{invite_link}'>{invite_link}</a></p>"
            )
            ok, err = _send_email_with_resend(
                to_email=email,
                subject=f"Join {group_moment.title} on Momentra",
                text_body=body_text,
                html_body=body_html,
            )
            if invite.sent_at is not None:
                invite.resend_count += 1
            invite.updated_at = now
            if ok:
                invite.status = "sent"
                invite.last_error = None
                invite.sent_at = now
                sent += 1
                an = _actor_display(session, auth_user)
                _log_group_activity(
                    session,
                    moment_id,
                    "email_invite_sent",
                    f"Email invite sent to {email}",
                    group_moment.title,
                    str(auth_user["uid"]),
                    an,
                    {"email": email},
                )
            else:
                invite.status = "failed"
                invite.last_error = err
                failed += 1
                if err:
                    error_messages.append(f"{email}: {err}")

        session.commit()
        return GroupInviteEmailOut(sent=sent, failed=failed, total=len(target_emails), error_messages=error_messages)


def _join_via_open_join_token(
    session: Session,
    group_moment: GroupMoment,
    auth_user: dict[str, Any],
    now: datetime,
) -> dict[str, str]:
    """Join using the group's public join_token (share link)."""
    _ensure_app_user(session, auth_user)
    uid = str(auth_user["uid"])
    if group_moment.owner_uid == uid:
        return {"status": "owner", "moment_id": group_moment.moment_id}

    existing = session.scalar(
        select(GroupMomentMember).where(
            GroupMomentMember.moment_id == group_moment.moment_id,
            GroupMomentMember.firebase_uid == uid,
        ),
    )
    if existing is not None:
        if existing.status == "joined":
            return {"status": "already_joined", "moment_id": group_moment.moment_id}
        existing.status = "joined"
        existing.joined_at = now
        if not (existing.display_name or "").strip():
            existing.display_name = _actor_display(session, auth_user)
    else:
        session.add(
            GroupMomentMember(
                moment_id=group_moment.moment_id,
                firebase_uid=uid,
                display_name=_actor_display(session, auth_user),
                email=((str(em).strip().lower() if (em := auth_user.get("email")) else "") or None),
                role="member",
                status="joined",
                joined_at=now,
                created_at=now,
            ),
        )
    group_moment.updated_at = now
    session.flush()
    joiner = _actor_display(session, auth_user)
    _log_group_activity(
        session,
        group_moment.moment_id,
        "member_joined",
        f"{joiner} joined via link",
        group_moment.title,
        uid,
        joiner,
        {},
    )
    return {"status": "joined", "moment_id": group_moment.moment_id}


def _accept_email_invite_in_session(
    session: Session,
    raw_token: str,
    auth_user: dict[str, Any],
    now: datetime,
) -> dict[str, str]:
    invite = session.scalar(select(GroupMomentInvite).where(GroupMomentInvite.invite_token == raw_token))
    if invite is None:
        raise HTTPException(status_code=404, detail="Invite not found")

    group_moment = session.get(GroupMoment, invite.moment_id)
    if group_moment is None:
        raise HTTPException(status_code=404, detail="Group moment not found")

    _ensure_app_user(session, auth_user)

    member = session.scalar(
        select(GroupMomentMember)
        .where(GroupMomentMember.moment_id == group_moment.moment_id)
        .where(GroupMomentMember.email == invite.email),
    )
    if member is None:
        session.add(
            GroupMomentMember(
                moment_id=group_moment.moment_id,
                firebase_uid=str(auth_user["uid"]),
                display_name=None,
                email=invite.email,
                role="member",
                status="joined",
                joined_at=now,
                created_at=now,
            ),
        )
    else:
        member.firebase_uid = str(auth_user["uid"])
        member.status = "joined"
        member.joined_at = now

    invite.status = "joined"
    invite.joined_at = now
    invite.updated_at = now
    group_moment.updated_at = now
    session.flush()
    joiner = _actor_display(session, auth_user)
    _log_group_activity(
        session,
        group_moment.moment_id,
        "member_joined",
        f"{joiner} joined the group",
        f"Accepted invite · {invite.email}",
        str(auth_user["uid"]),
        joiner,
        {"email": invite.email},
    )
    return {"status": "joined", "moment_id": group_moment.moment_id}


@app.post("/business/join/{token}")
def join_business_with_token(
    token: str,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    """Accept either a public budget join_token (share URL / QR) or a member invite_token (email link)."""
    raw = urllib_parse.unquote((token or "").strip())
    if not raw:
        raise HTTPException(status_code=400, detail="Missing token")
    auth_user = _user_from_auth_header(authorization)
    now = datetime.now(timezone.utc)
    with db_session() as session:
        budget = session.scalar(select(BusinessBudget).where(BusinessBudget.join_token == raw))
        if budget is not None:
            out = _join_business_via_open_join_token(session, budget, auth_user, now)
            session.commit()
            return out
        out = _accept_business_member_invite_token(session, raw, auth_user, now)
        session.commit()
        return out


@app.post("/group/join/{token}")
def join_group_with_token(
    token: str,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    """Accept either a public join_token (share URL) or an email invite_token."""
    raw = urllib_parse.unquote((token or "").strip())
    if not raw:
        raise HTTPException(status_code=400, detail="Missing token")
    auth_user = _user_from_auth_header(authorization)
    now = datetime.now(timezone.utc)
    with db_session() as session:
        gm = session.scalar(select(GroupMoment).where(GroupMoment.join_token == raw))
        if gm is not None:
            out = _join_via_open_join_token(session, gm, auth_user, now)
            session.commit()
            return out
        inv = session.scalar(select(GroupMomentInvite).where(GroupMomentInvite.invite_token == raw))
        if inv is not None:
            out = _accept_email_invite_in_session(session, raw, auth_user, now)
            session.commit()
            return out
    raise HTTPException(status_code=404, detail="Invalid join link")


@app.post("/group/invites/{token}/accept")
def accept_group_invite(
    token: str,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    raw = urllib_parse.unquote((token or "").strip())
    auth_user = _user_from_auth_header(authorization)
    now = datetime.now(timezone.utc)
    with db_session() as session:
        out = _accept_email_invite_in_session(session, raw, auth_user, now)
        session.commit()
        return out


@app.post("/group/invites/{invite_id}/decline")
def decline_group_invite(
    invite_id: str,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    auth_user = _user_from_auth_header(authorization)
    uid = str(auth_user["uid"])
    now = datetime.now(timezone.utc)
    with db_session() as session:
        invite = session.get(GroupMomentInvite, invite_id)
        if invite is None:
            raise HTTPException(status_code=404, detail="Invite not found")

        user = session.get(AppUser, uid)
        auth_email = ((user.email if user else None) or auth_user.get("email") or "").strip().lower()
        invite_email = (invite.email or "").strip().lower()
        if invite_email and auth_email and invite_email != auth_email:
            raise HTTPException(status_code=403, detail="This invite is for a different email address")
        if (invite.status or "").lower() == "joined":
            raise HTTPException(status_code=409, detail="Invite already accepted")

        invite.status = "declined"
        invite.updated_at = now

        member = session.scalar(
            select(GroupMomentMember)
            .where(GroupMomentMember.moment_id == invite.moment_id)
            .where(func.lower(GroupMomentMember.email) == invite_email)
            .where(GroupMomentMember.firebase_uid.is_(None))
            .order_by(desc(GroupMomentMember.created_at))
            .limit(1),
        )
        if member is not None and (member.status or "").lower() in {"pending", "invited"}:
            member.status = "removed"

        group_moment = session.get(GroupMoment, invite.moment_id)
        if group_moment is not None:
            group_moment.updated_at = now

        session.commit()
        return {"status": "declined", "invite_id": invite.invite_id, "moment_id": invite.moment_id}


@app.post("/group/moments/invites/{invite_id}/decline")
def decline_group_moment_invite(
    invite_id: str,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    """Alias for ``POST /group/invites/{invite_id}/decline`` (product wording)."""
    return decline_group_invite(invite_id, authorization)
