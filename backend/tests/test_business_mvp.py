import unittest
from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from pydantic import ValidationError

from main import (
    BUSINESS_APPROVER_ROLES,
    BusinessBudgetApproval,
    BusinessExpenseIn,
    _approval_to_out,
    _business_role_norm,
    _require_business_role,
)


class BusinessMvpTests(unittest.TestCase):
    def test_business_role_norm(self) -> None:
        self.assertEqual(_business_role_norm("member"), "employee")
        self.assertEqual(_business_role_norm("admin"), "admin")
        self.assertEqual(_business_role_norm("OWNER"), "owner")
        self.assertEqual(_business_role_norm("random-role"), "employee")

    def test_require_business_role_guard(self) -> None:
        _require_business_role("admin", BUSINESS_APPROVER_ROLES)
        with self.assertRaises(HTTPException) as err:
            _require_business_role("employee", BUSINESS_APPROVER_ROLES)
        self.assertEqual(err.exception.status_code, 403)

    def test_business_expense_accepts_purchase_fields(self) -> None:
        payload = BusinessExpenseIn(
            amount=1200.0,
            category_id="cat1",
            title="Oil drum purchase",
            expense_or_purchase="purchase",
            vendor_name="Local Mill",
            invoice_number="INV-1009",
            payment_mode="UPI",
            due_date=date(2026, 4, 30),
            gstin="29ABCDE1234F2Z5",
            tax_amount=54.5,
            receipt_attached=True,
        )
        self.assertEqual(payload.expense_or_purchase, "purchase")
        self.assertEqual(payload.vendor_name, "Local Mill")
        self.assertEqual(payload.invoice_number, "INV-1009")
        self.assertEqual(payload.gstin, "29ABCDE1234F2Z5")
        self.assertEqual(payload.tax_amount, 54.5)

    def test_business_expense_rejects_negative_tax(self) -> None:
        with self.assertRaises(ValidationError):
            BusinessExpenseIn(
                amount=100.0,
                category_id="cat1",
                tax_amount=-1.0,
            )

    def test_approval_to_out_maps_new_fields(self) -> None:
        approval = BusinessBudgetApproval(
            approval_id="a1",
            budget_id="b1",
            title="Store purchase",
            requester_name="Rahul",
            amount=Decimal("999.50"),
            submitter_uid="u_submit",
            approver_uid="u_admin",
            category_id="cat1",
            subcategory_label="Inventory",
            vendor_name="VendorX",
            invoice_number="INV-1",
            expense_or_purchase="purchase",
            payment_mode="cash",
            due_date=date(2026, 4, 25),
            gstin="29ABCDE1234F2Z5",
            tax_amount=Decimal("18.00"),
            receipt_attached=True,
            receipt_verified=True,
            receipt_followup_requested=False,
            status="approved",
            created_at=datetime.now(timezone.utc),
            resolved_at=datetime.now(timezone.utc),
        )
        out = _approval_to_out(approval)
        self.assertEqual(out.submitter_uid, "u_submit")
        self.assertEqual(out.approver_uid, "u_admin")
        self.assertEqual(out.vendor_name, "VendorX")
        self.assertEqual(out.expense_or_purchase, "purchase")
        self.assertEqual(out.tax_amount, 18.0)


if __name__ == "__main__":
    unittest.main()
