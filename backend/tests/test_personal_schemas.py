"""Lightweight schema checks (no DB). Run: python -m pytest tests/ -q  or  python -m unittest discover -s tests"""

from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.personal import BudgetCreate, TransactionUpdate


def test_budget_create_requires_scope() -> None:
    with pytest.raises(ValidationError):
        BudgetCreate(cycle_id=uuid4(), allocated_amount=Decimal("100"))


def test_budget_create_accepts_category_text() -> None:
    b = BudgetCreate(cycle_id=uuid4(), category="Food", allocated_amount=Decimal("50"))
    assert b.category == "Food"


def test_transaction_update_empty_invalid_for_router() -> None:
    u = TransactionUpdate()
    assert u.model_dump(exclude_unset=True) == {}
