"""Tests for personal schemas - updated for v2 API."""
from datetime import date
from uuid import uuid4

from app.schemas.personal import (
    AccountCreate,
    TransactionCreate,
    BudgetCreate,
    BudgetCategoryLimitResponse,
    BillCreate,
    GoalCreate,
    PersonalDashboardResponse,
    SmartInsight,
)


def test_account_create_valid():
    a = AccountCreate(name="Test Account")
    assert a.name == "Test Account"
    assert a.account_type == "bank"
    assert a.amount_minor == 0
    assert a.currency_code == "INR"


def test_account_create_with_type():
    a = AccountCreate(name="Credit Card", account_type="credit_card", amount_minor=50000)
    assert a.account_type == "credit_card"
    assert a.amount_minor == 50000


def test_transaction_create_valid():
    t = TransactionCreate(
        title="Coffee",
        amount_minor=250,
        transaction_date=date.today(),
    )
    assert t.title == "Coffee"
    assert t.transaction_type == "expense"


def test_budget_create_valid():
    b = BudgetCreate(
        name="Monthly Budget",
        total_amount_minor=5000000,
        start_date=date.today(),
    )
    assert b.name == "Monthly Budget"
    assert b.period == "monthly"


def test_bill_create_valid():
    b = BillCreate(
        title="Rent",
        amount_minor=1500000,
        due_date=date.today(),
    )
    assert b.title == "Rent"
    assert b.is_recurring is False


def test_goal_create_valid():
    g = GoalCreate(
        title="Emergency Fund",
        target_amount_minor=10000000,
    )
    assert g.title == "Emergency Fund"
    assert g.status == "active"


def test_dashboard_response():
    d = PersonalDashboardResponse(
        total_balance=100000,
        today_spend=500,
        monthly_spend=15000,
    )
    assert d.total_balance == 100000
    assert d.smart_insights == []


def test_insight_creation():
    i = SmartInsight(
        type="budget_near_limit",
        title="Budget nearly reached",
        description="You've used 90% of your budget.",
        severity="warning",
    )
    assert i.type == "budget_near_limit"
    assert i.severity == "warning"
