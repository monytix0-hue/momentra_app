"""Tests for Momentra Group API v1 endpoints and schemas."""
import pytest
from datetime import date
from uuid import uuid4

from app.schemas.group import (
    GroupExpenseCreate,
    GroupExpenseUpdate,
    ExpenseSplitInput,
    SettlementCreate,
    SettlementUpdate,
    SettlementResponse,
    GroupExpenseResponse,
    ExpenseSplitResponse,
    BalanceResponse,
)
from app.schemas.moments import MomentMemberUpdate


class TestGroupExpenseSchemas:
    """Test group expense Pydantic schema validation."""

    def test_create_expense_valid_equal(self):
        """Valid equal split expense with splits."""
        req = GroupExpenseCreate(
            title="Dinner",
            amount_minor=10000,  # ₹100.00
            paid_by_member_id=uuid4(),
            split_type="equal",
            expense_date=date.today(),
            splits=[
                ExpenseSplitInput(member_id=uuid4(), amount_minor=5000),
                ExpenseSplitInput(member_id=uuid4(), amount_minor=5000),
            ],
        )
        assert req.title == "Dinner"
        assert req.amount_minor == 10000

    def test_create_expense_minimal(self):
        """Minimal valid expense with splits."""
        req = GroupExpenseCreate(
            title="Taxi",
            amount_minor=3000,
            paid_by_member_id=uuid4(),
            split_type="equal",
            expense_date=date.today(),
            splits=[
                ExpenseSplitInput(member_id=uuid4(), amount_minor=1500),
                ExpenseSplitInput(member_id=uuid4(), amount_minor=1500),
            ],
        )
        assert req.currency_code == "INR"  # default
        assert req.split_type == "equal"

    def test_create_expense_percentage(self):
        """Valid percentage split expense."""
        req = GroupExpenseCreate(
            title="Groceries",
            amount_minor=10000,
            paid_by_member_id=uuid4(),
            split_type="percentage",
            expense_date=date.today(),
            splits=[
                ExpenseSplitInput(member_id=uuid4(), amount_minor=6000, percentage=60.0),
                ExpenseSplitInput(member_id=uuid4(), amount_minor=4000, percentage=40.0),
            ],
        )
        total_pct = sum(s.percentage or 0 for s in req.splits)
        assert abs(total_pct - 100.0) < 0.01
        assert sum(s.amount_minor for s in req.splits) == req.amount_minor

    def test_create_expense_custom(self):
        """Valid custom split expense."""
        req = GroupExpenseCreate(
            title="Custom share",
            amount_minor=15000,
            paid_by_member_id=uuid4(),
            split_type="custom",
            expense_date=date.today(),
            splits=[
                ExpenseSplitInput(member_id=uuid4(), amount_minor=10000),
                ExpenseSplitInput(member_id=uuid4(), amount_minor=5000),
            ],
        )
        assert sum(s.amount_minor for s in req.splits) == req.amount_minor

    def test_create_expense_shares(self):
        """Valid shares split expense."""
        req = GroupExpenseCreate(
            title="Shares split",
            amount_minor=12000,
            paid_by_member_id=uuid4(),
            split_type="shares",
            expense_date=date.today(),
            splits=[
                ExpenseSplitInput(member_id=uuid4(), amount_minor=6000, shares=2),
                ExpenseSplitInput(member_id=uuid4(), amount_minor=3000, shares=1),
                ExpenseSplitInput(member_id=uuid4(), amount_minor=3000, shares=1),
            ],
        )
        assert sum(s.shares or 0 for s in req.splits) == 4
        assert sum(s.amount_minor for s in req.splits) == req.amount_minor

    def test_reject_empty_title(self):
        """Reject expense with empty title."""
        with pytest.raises(ValueError):
            GroupExpenseCreate(
                title="",
                amount_minor=1000,
                paid_by_member_id=uuid4(),
                split_type="equal",
                expense_date=date.today(),
            )

    def test_reject_negative_amount(self):
        """Reject expense with negative amount (schema level)."""
        with pytest.raises(ValueError):
            GroupExpenseCreate(
                title="Negative",
                amount_minor=-500,
                paid_by_member_id=uuid4(),
                split_type="equal",
                expense_date=date.today(),
            )

    def test_reject_invalid_split_type(self):
        """Reject invalid split type."""
        with pytest.raises(ValueError):
            GroupExpenseCreate(
                title="Bad split",
                amount_minor=1000,
                paid_by_member_id=uuid4(),
                split_type="invalid_type",
                expense_date=date.today(),
            )


class TestSettlementSchemas:
    """Test settlement Pydantic schema validation."""

    def test_create_settlement_valid(self):
        """Valid settlement create request."""
        req = SettlementCreate(
            from_member_id=uuid4(),
            to_member_id=uuid4(),
            amount_minor=50000,
        )
        assert req.amount_minor == 50000
        assert req.status == "pending"
        assert req.currency_code == "INR"

    def test_settlement_default_status(self):
        """Default status should be 'pending'."""
        req = SettlementCreate(
            from_member_id=uuid4(),
            to_member_id=uuid4(),
            amount_minor=10000,
        )
        assert req.status == "pending"

    def test_settlement_completed_status(self):
        """Settlement with explicit completed status."""
        req = SettlementCreate(
            from_member_id=uuid4(),
            to_member_id=uuid4(),
            amount_minor=10000,
            status="completed",
        )
        assert req.status == "completed"

    def test_reject_negative_settlement_amount(self):
        """Reject settlement with negative amount."""
        with pytest.raises(ValueError):
            SettlementCreate(
                from_member_id=uuid4(),
                to_member_id=uuid4(),
                amount_minor=-50,
            )

    def test_reject_invalid_status(self):
        """Reject settlement with invalid status."""
        with pytest.raises(ValueError):
            SettlementCreate(
                from_member_id=uuid4(),
                to_member_id=uuid4(),
                amount_minor=1000,
                status="invalid",
            )

    def test_update_settlement_status(self):
        """Valid settlement update with status change."""
        req = SettlementUpdate(status="completed")
        assert req.status == "completed"

    def test_update_settlement_note(self):
        """Valid settlement update with note."""
        req = SettlementUpdate(note="Thanks!")
        assert req.note == "Thanks!"


class TestGroupApiAuthGuards:
    """Test that group endpoints require authentication."""

    @pytest.mark.asyncio
    async def test_expenses_requires_token(self, client):
        """GET /api/v1/groups/{id}/expenses requires auth."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/groups/{fake_id}/expenses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_expense_requires_token(self, client):
        """POST /api/v1/groups/{id}/expenses requires auth."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.post(
            f"/api/v1/groups/{fake_id}/expenses",
            json={"title": "Test", "amount_minor": 1000, "paid_by_member_id": str(uuid4()),
                  "split_type": "equal", "expense_date": str(date.today())},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_settlements_requires_token(self, client):
        """GET /api/v1/groups/{id}/settlements requires auth."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/groups/{fake_id}/settlements")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_settlement_requires_token(self, client):
        """POST /api/v1/groups/{id}/settlements requires auth."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.post(
            f"/api/v1/groups/{fake_id}/settlements",
            json={"from_member_id": str(uuid4()), "to_member_id": str(uuid4()),
                  "amount_minor": 1000},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_balances_requires_token(self, client):
        """GET /api/v1/groups/{id}/balances requires auth."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/groups/{fake_id}/balances")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_moments_members_patch_requires_token(self, client):
        """PATCH /api/v1/moments/{id}/members/{id} requires auth."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.patch(
            f"/api/v1/moments/{fake_id}/members/{fake_id}",
            json={"role": "admin"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_timeline_requires_token(self, client):
        """GET /api/v1/moments/{id}/timeline requires auth."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/moments/{fake_id}/timeline")
        assert response.status_code == 401


class TestMomentMemberSchema:
    """Test moment member Pydantic schema validation."""

    def test_member_update_valid(self):
        """Valid member role update."""
        req = MomentMemberUpdate(role="admin")
        assert req.role == "admin"

    def test_member_update_reject_invalid_role(self):
        """Reject invalid role."""
        with pytest.raises(ValueError):
            MomentMemberUpdate(role="superadmin")
