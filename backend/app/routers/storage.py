from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.supabase import get_supabase
from app.dependencies import get_current_user

router = APIRouter(prefix="/storage", tags=["storage"])


@router.post("/upload/{bucket}/{path:path}")
async def upload_object(
    bucket: str,
    path: str,
    file: UploadFile,
    _user: dict = Depends(get_current_user),
) -> dict[str, str]:
    """
    Upload bytes to a Supabase Storage bucket (authenticated users only).
    Configure bucket policies in Supabase; service role bypasses RLS on storage.
    """
    try:
        sb = get_supabase()
        data = await file.read()
        opts = {"content-type": file.content_type or "application/octet-stream"}
        sb.storage.from_(bucket).upload(path, data, file_options=opts)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        ) from e
    return {"bucket": bucket, "path": path}
