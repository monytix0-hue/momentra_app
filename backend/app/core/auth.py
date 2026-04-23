"""Auth helpers re-exported from legacy module during migration."""

from typing import Any

from main import _user_from_auth_header


def get_auth_user(authorization: str | None) -> dict[str, Any]:
    """Decode auth header and return canonical auth user payload."""
    return _user_from_auth_header(authorization)

