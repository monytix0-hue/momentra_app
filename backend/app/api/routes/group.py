"""Group route constants and wrappers grouped for backend split."""

from app.services.group_service import get_group_moment, list_group_moments

GROUP_ROUTE_PATHS = (
    "/group/moments",
    "/group/moments/{moment_id}",
)

__all__ = ["GROUP_ROUTE_PATHS", "get_group_moment", "list_group_moments"]

