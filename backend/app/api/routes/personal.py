"""Personal route constants and wrappers grouped for backend split."""

from app.services.personal_service import get_personal_home, list_personal_moments, list_personal_transactions

PERSONAL_ROUTE_PATHS = (
    "/personal/home",
    "/personal/moments",
    "/personal/transactions",
)

__all__ = [
    "PERSONAL_ROUTE_PATHS",
    "get_personal_home",
    "list_personal_moments",
    "list_personal_transactions",
]

