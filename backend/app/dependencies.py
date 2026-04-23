from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import exceptions as firebase_exceptions

from app.core.firebase import verify_firebase_token

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> dict[str, Any]:
    """Require `Authorization: Bearer <Firebase ID token>`."""
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return verify_firebase_token(creds.credentials)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e
    except firebase_exceptions.FirebaseError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None


def get_current_user_id(user: Annotated[dict[str, Any], Depends(get_current_user)]) -> str:
    uid = str(user.get("uid") or user.get("user_id") or user.get("sub") or "")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token missing uid",
        )
    return uid


def get_current_user_email(user: Annotated[dict[str, Any], Depends(get_current_user)]) -> str | None:
    """Primary email from Firebase ID token (used for invite acceptance when invite_email is set)."""
    e = user.get("email")
    if isinstance(e, str):
        s = e.strip()
        if s:
            return s
    return None
