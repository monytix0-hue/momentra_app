from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from postgrest.exceptions import APIError

from app.core.supabase import get_supabase
from app.dependencies import get_current_user
from app.schemas.user import ProfileOut, ProfileSyncIn

router = APIRouter(prefix="/users", tags=["users"])


def _uid(claims: dict[str, Any]) -> str:
    return str(claims.get("uid") or claims.get("user_id") or claims.get("sub") or "")


@router.post("/sync")
async def sync_profile(
    body: ProfileSyncIn | None = None,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, bool]:
    """
    Upsert the current user into public.profiles (Firebase uid = id).
    Call from the web app after sign-in so Supabase stays aligned with Firebase.
    """
    uid = _uid(user)
    if not uid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing uid in token")

    email = user.get("email")
    token_name = user.get("name")
    token_picture = user.get("picture")
    payload = {
        "id": uid,
        "email": email,
        "display_name": (body.display_name if body and body.display_name else None) or token_name,
        "photo_url": (body.photo_url if body and body.photo_url else None) or token_picture,
    }
    if not payload["display_name"] and email and isinstance(email, str):
        payload["display_name"] = email.split("@", 1)[0]

    try:
        sb = get_supabase()
        sb.table("profiles").upsert(payload, on_conflict="id").execute()
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Supabase error: {e!s}",
        ) from e
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e

    return {"ok": True}


@router.get("/profile", response_model=ProfileOut)
async def get_profile(user: dict[str, Any] = Depends(get_current_user)) -> ProfileOut:
    uid = _uid(user)
    if not uid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing uid in token")

    try:
        sb = get_supabase()
        res = sb.table("profiles").select("*").eq("id", uid).maybe_single().execute()
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Supabase error: {e!s}",
        ) from e
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e

    row = res.data
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    return ProfileOut(
        id=row["id"],
        email=row.get("email"),
        display_name=row.get("display_name"),
        photo_url=row.get("photo_url"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )
