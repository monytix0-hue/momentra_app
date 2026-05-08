"""Tests for Momentra Business API v1 endpoints and schemas."""
import pytest
from datetime import date
from uuid import uuid4

from app.schemas.business import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    VendorCreate,
    VendorUpdate,
    VendorResponse,
    SaleCreate,
    SaleUpdate,
    SaleResponse,
    BusinessExpenseCreate,
    BusinessExpenseUpdate,
    BusinessExpenseResponse,
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    BusinessDashboardResponse,
    BusinessActivityItem,
)
from app.schemas.moments import MomentMemberUpdate


class TestCustomerSchemas:
    """Test customer Pydantic schema validation."""

    def test_create_customer_valid(self):
        c = CustomerCreate(name="Acme Corp", email="acme@example.com", phone="+911234567890")
        assert c.name == "Acme Corp"
        assert c.email == "acme@example.com"

    def test_create_customer_minimal(self):
        c = CustomerCreate(name="John")
        assert c.name == "John"
        assert c.email is None

    def test_reject_empty_name(self):
        with pytest.raises(ValueError):
            CustomerCreate(name="")

    def test_update_customer(self):
        u = CustomerUpdate(phone="+919999999999")
        assert u.phone == "+919999999999"
        assert u.email is None


class TestVendorSchemas:
    """Test vendor Pydantic schema validation."""

    def test_create_vendor_valid(self):
        v = VendorCreate(name="Supplier Inc", email="supply@vendor.com")
        assert v.name == "Supplier Inc"

    def test_vendor_response(self):
        resp = VendorResponse(
            id=uuid4(), moment_id=uuid4(), name="Vendor",
            created_at=date.today(), updated_at=date.today()
        )
        assert resp.name == "Vendor"


class TestSaleSchemas:
    """Test sale Pydantic schema validation."""

    def test_create_sale_valid(self):
        s = SaleCreate(
            title="Widget Sale",
            amount_minor=50000,
            sale_date=date.today(),
            payment_method="card",
        )
        assert s.title == "Widget Sale"
        assert s.amount_minor == 50000
        assert s.currency_code == "INR"

    def test_create_sale_with_customer(self):
        cid = uuid4()
        s = SaleCreate(title="Sale", amount_minor=1000, sale_date=date.today(), customer_id=cid)
        assert s.customer_id == cid

    def test_zero_amount_valid_at_schema(self):
        s = SaleCreate(title="Free", amount_minor=0, sale_date=date.today())
        assert s.amount_minor == 0

    def test_reject_negative_amount(self):
        with pytest.raises(ValueError):
            SaleCreate(title="Negative", amount_minor=-100, sale_date=date.today())

    def test_update_sale(self):
        u = SaleUpdate(note="Updated note")
        assert u.note == "Updated note"


class TestBusinessExpenseSchemas:
    """Test business expense schema validation."""

    def test_create_expense_valid(self):
        e = BusinessExpenseCreate(
            title="Office Rent",
            amount_minor=1200000,
            expense_date=date.today(),
            category="rent",
        )
        assert e.title == "Office Rent"
        assert e.category == "rent"

    def test_create_expense_with_vendor(self):
        vid = uuid4()
        e = BusinessExpenseCreate(
            title="Hosting", amount_minor=5000, expense_date=date.today(), vendor_id=vid
        )
        assert e.vendor_id == vid

    def test_update_expense_approval(self):
        u = BusinessExpenseUpdate(approval_status="approved")
        assert u.approval_status == "approved"

    def test_reject_invalid_approval_status(self):
        with pytest.raises(ValueError):
            BusinessExpenseUpdate(approval_status="maybe")


class TestInvoiceSchemas:
    """Test invoice Pydantic schema validation."""

    def test_create_invoice_valid(self):
        inv = InvoiceCreate(
            invoice_number="INV-001",
            amount_minor=100000,
            issue_date=date.today(),
            due_date=date(2025, 6, 1),
        )
        assert inv.invoice_number == "INV-001"
        assert inv.status == "draft"

    def test_create_invoice_paid(self):
        inv = InvoiceCreate(
            invoice_number="INV-002",
            amount_minor=50000,
            issue_date=date.today(),
            due_date=date(2025, 6, 1),
            status="paid",
        )
        assert inv.status == "paid"

    def test_reject_empty_invoice_number(self):
        with pytest.raises(ValueError):
            InvoiceCreate(
                invoice_number="",
                amount_minor=1000,
                issue_date=date.today(),
                due_date=date.today(),
            )

    def test_reject_invalid_status(self):
        with pytest.raises(ValueError):
            InvoiceCreate(
                invoice_number="INV-003",
                amount_minor=1000,
                issue_date=date.today(),
                due_date=date.today(),
                status="unknown",
            )

    def test_update_invoice_status(self):
        u = InvoiceUpdate(status="sent")
        assert u.status == "sent"


class TestBusinessDashboardSchema:
    """Test business dashboard schema validation."""

    def test_dashboard_defaults(self):
        d = BusinessDashboardResponse()
        assert d.today_sales == 0
        assert d.monthly_sales == 0
        assert d.net_cash_flow == 0
        assert d.overdue_invoice_count == 0
        assert d.recent_activity == []

    def test_dashboard_with_data(self):
        d = BusinessDashboardResponse(
            today_sales=50000,
            today_expenses=15000,
            monthly_sales=500000,
            monthly_expenses=200000,
            net_cash_flow=300000,
            receivables_amount=100000,
            payables_amount=50000,
            overdue_invoice_count=2,
            pending_approval_count=1,
            recent_activity=[
                BusinessActivityItem(
                    type="sale",
                    title="Widget Sale",
                    amount_minor=50000,
                    timestamp=date.today(),
                    reference_id=uuid4(),
                    reference_type="sale",
                )
            ],
        )
        assert d.net_cash_flow == 300000
        assert len(d.recent_activity) == 1


class TestBusinessApiAuthGuards:
    """Test that business endpoints require authentication."""

    @pytest.mark.asyncio
    async def test_dashboard_requires_token(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/businesses/{fake_id}/dashboard")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_customers_requires_token(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/businesses/{fake_id}/customers")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_customer_requires_token(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.post(
            f"/api/v1/businesses/{fake_id}/customers",
            json={"name": "Test"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_vendors_requires_token(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/businesses/{fake_id}/vendors")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sales_requires_token(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/businesses/{fake_id}/sales")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_sale_requires_token(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.post(
            f"/api/v1/businesses/{fake_id}/sales",
            json={"title": "Sale", "amount_minor": 1000, "sale_date": str(date.today())},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_expenses_requires_token(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/businesses/{fake_id}/expenses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_expense_requires_token(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.post(
            f"/api/v1/businesses/{fake_id}/expenses",
            json={"title": "Expense", "amount_minor": 500, "expense_date": str(date.today())},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_invoices_requires_token(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/businesses/{fake_id}/invoices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_invoice_requires_token(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.post(
            f"/api/v1/businesses/{fake_id}/invoices",
            json={"invoice_number": "INV-TEST", "amount_minor": 1000,
                  "issue_date": str(date.today()), "due_date": str(date.today())},
        )
        assert response.status_code == 401
