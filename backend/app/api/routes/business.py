"""Business route constants and wrappers grouped for backend split."""

from app.services.business_service import get_business_budget, get_business_catalog, list_business_budgets

BUSINESS_ROUTE_PATHS = (
    "/business/budgets",
    "/business/budgets/{budget_id}",
    "/business/budgets/{budget_id}/catalog",
)

__all__ = ["BUSINESS_ROUTE_PATHS", "get_business_budget", "get_business_catalog", "list_business_budgets"]

