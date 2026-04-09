from datetime import date
from decimal import Decimal
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MomentCreate(BaseModel):
    title: str = Field(max_length=255)
    moment_type: str = Field(max_length=50)
    duration_type: str = Field(max_length=20)
    target_amount: Decimal | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str = Field(default="active", max_length=20)


class MomentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    moment_id: UUID
    user_id: str
    title: str
    moment_type: str
    duration_type: str
    target_amount: Decimal | None
    start_date: date | None
    end_date: date | None
    status: str
    created_at: str | None = None


class CycleCreate(BaseModel):
    moment_id: UUID
    label: str = Field(max_length=50)
    start_date: date
    end_date: date
    allocated_budget: Decimal = Field(default=Decimal("0"))


class CycleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cycle_id: UUID
    moment_id: UUID
    label: str
    start_date: date
    end_date: date
    allocated_budget: Decimal
    spent_amount: Decimal


class TransactionSubcategoryRefOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    subcategory_id: UUID
    slug: str
    label: str
    sort_order: int


class TransactionCategoryTreeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category_id: UUID
    slug: str
    label: str
    sort_order: int
    subcategories: list[TransactionSubcategoryRefOut] = Field(default_factory=list)


class TransactionCreate(BaseModel):
    amount: Decimal
    category: str | None = Field(default=None, max_length=50)
    subcategory: str | None = Field(default=None, max_length=80)
    category_id: UUID | None = None
    subcategory_id: UUID | None = None
    merchant: str | None = Field(default=None, max_length=255)
    description: str | None = None
    transaction_date: date
    moment_id: UUID | None = None
    cycle_id: UUID | None = None


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: UUID
    user_id: str
    moment_id: UUID | None
    cycle_id: UUID | None
    amount: Decimal
    category: str | None
    subcategory: str | None = None
    category_id: UUID | None = None
    subcategory_id: UUID | None = None
    merchant: str | None
    description: str | None
    transaction_date: date
    created_at: str | None = None


class TransactionUpdate(BaseModel):
    amount: Decimal | None = None
    category: str | None = Field(default=None, max_length=50)
    subcategory: str | None = Field(default=None, max_length=80)
    category_id: UUID | None = None
    subcategory_id: UUID | None = None
    merchant: str | None = Field(default=None, max_length=255)
    description: str | None = None
    transaction_date: date | None = None
    moment_id: UUID | None = None
    cycle_id: UUID | None = None


class SpendBreakdownRowOut(BaseModel):
    label: str
    category_id: UUID | None = None
    amount: Decimal


class SpendBreakdownOut(BaseModel):
    rows: list[SpendBreakdownRowOut]
    total: Decimal


class BudgetCreate(BaseModel):
    cycle_id: UUID
    category: str | None = Field(default=None, max_length=50)
    category_id: UUID | None = None
    subcategory_id: UUID | None = None
    allocated_amount: Decimal

    @model_validator(mode="after")
    def require_category_scope(self) -> Self:
        has_text = bool(self.category and self.category.strip())
        if self.subcategory_id is None and self.category_id is None and not has_text:
            raise ValueError("Provide category label and/or category_id / subcategory_id")
        return self


class BudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    budget_id: UUID
    cycle_id: UUID
    category: str
    subcategory: str | None = None
    allocated_amount: Decimal
    spent_amount: Decimal
    category_id: UUID | None = None
    subcategory_id: UUID | None = None


class GoalCreate(BaseModel):
    title: str = Field(max_length=255)
    target_amount: Decimal
    saved_amount: Decimal = Field(default=Decimal("0"))
    target_date: date | None = None


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    goal_id: UUID
    user_id: str
    title: str
    target_amount: Decimal
    saved_amount: Decimal
    target_date: date | None


class SignalCreate(BaseModel):
    signal_type: str = Field(max_length=50)
    severity: str = Field(max_length=10)
    message: str


class SignalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    signal_id: UUID
    user_id: str
    signal_type: str
    severity: str
    message: str
    created_at: str | None = None


class PersonalSummaryOut(BaseModel):
    money_left: Decimal
    total_allocated: Decimal
    total_spent_period: Decimal
    period_label: str
    insights: list[str]
    top_category: str | None
    recent_signals: list[SignalOut]
