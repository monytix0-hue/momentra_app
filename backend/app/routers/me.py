from typing import Any

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user

router = APIRouter(prefix="/me", tags=["me"])


@router.get("")
async def read_me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Example protected route — requires Firebase ID token."""
    return {
        "uid": user.get("uid"),
        "email": user.get("email"),
    }
