"""Group domain service wrappers during backend split migration."""

from typing import Any

import main as legacy


def list_group_moments(*, authorization: str | None) -> Any:
    return legacy.list_group_moments(authorization=authorization)


def get_group_moment(*, moment_id: str, authorization: str | None) -> Any:
    return legacy.get_group_moment(moment_id=moment_id, authorization=authorization)

