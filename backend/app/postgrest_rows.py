"""Narrow PostgREST ``JSON``-typed ``.data`` payloads for static typing."""

from __future__ import annotations

from typing import Any, cast


def as_dict_rows(data: Any) -> list[dict[str, Any]]:
    """List responses from ``.execute().data``."""
    if not data:
        return []
    if not isinstance(data, list):
        return []
    return cast(list[dict[str, Any]], data)


def as_dict_row(data: Any) -> dict[str, Any] | None:
    """``maybe_single()`` and single-object responses."""
    if data is None:
        return None
    if not isinstance(data, dict):
        return None
    return cast(dict[str, Any], data)
