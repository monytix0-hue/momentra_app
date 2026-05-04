"""Personal domain service wrappers during backend split migration."""

from typing import Any

import main as legacy


def list_personal_moments(*, authorization: str | None) -> Any:
    return legacy.list_personal_moments(authorization=authorization)


def get_personal_home(*, authorization: str | None) -> Any:
    return legacy.personal_home(authorization=authorization)


def list_personal_transactions(*, authorization: str | None, kind: str = "all", limit: int = 10) -> Any:
    return legacy.list_personal_transactions(authorization=authorization, kind=kind, limit=limit)

