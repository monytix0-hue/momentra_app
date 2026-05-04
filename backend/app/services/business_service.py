"""Business domain service wrappers during backend split migration."""

from typing import Any

import main as legacy


def list_business_budgets(*, authorization: str | None) -> Any:
    return legacy.list_business_budgets(authorization=authorization)


def get_business_budget(*, budget_id: str, authorization: str | None) -> Any:
    return legacy.get_business_budget(budget_id=budget_id, authorization=authorization)


def get_business_catalog(*, budget_id: str, authorization: str | None) -> Any:
    return legacy.get_business_budget_catalog(budget_id=budget_id, authorization=authorization)

