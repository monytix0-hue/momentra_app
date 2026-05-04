from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from postgrest.exceptions import APIError

from app.core.supabase import get_supabase
from app.dependencies import get_current_user, get_current_user_id
from app.postgrest_rows import as_dict_row, as_dict_rows
from app.schemas.personal import ReceiptUploadOut

router = APIRouter(prefix="/storage", tags=["storage"])


def _sb():
    try:
        return get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e


def _exec(resp: Any) -> Any:
    if resp is None:
        raise HTTPException(status_code=502, detail="Empty database response")
    return resp


def _one(data: Any) -> dict[str, Any]:
    rows = as_dict_rows(data)
    if not rows:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Empty response")
    return rows[0]


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


@router.post("/upload/receipt")
async def upload_receipt(
    file: UploadFile,
    transaction_id: str | None = Form(default=None),
    group_expense_id: str | None = Form(default=None),
    compress: str = Form(default="true"),
    user_id: str = Depends(get_current_user_id),
) -> ReceiptUploadOut:
    """
    Upload a receipt photo for a personal transaction or group expense.
    Exactly one of `transaction_id` or `group_expense_id` must be provided.
    """
    # Validate exactly one foreign key
    has_txn = transaction_id is not None
    has_ge = group_expense_id is not None
    if has_txn == has_ge:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide exactly one of transaction_id or group_expense_id",
        )

    sb = _sb()

    # Read file data
    data = await file.read()
    file_size = len(data)
    ext = _guess_extension(file.filename or "receipt.jpg")
    mime = file.content_type or "image/jpeg"
    # Robust bool parsing for compress form field
    compress_images = compress.lower() in ("true", "1", "yes")
    # TODO: client-side compression already done; server-side resize can be added later

    # Build storage path
    object_id = str(uuid.uuid4())
    storage_path = f"receipts/{user_id}/{object_id}{ext}"

    # Upload to Supabase Storage
    try:
        opts = {"content-type": mime}
        sb.storage.from_("receipts").upload(storage_path, data, file_options=opts)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Storage upload failed: {e}",
        ) from e

    # Build public URL (Supabase format)
    public_url = f"{sb.supabase_url}/storage/v1/object/public/{storage_path}"

    # Insert DB record
    try:
        row = _one(
            _exec(
                sb.table("transaction_receipts")
                .insert({
                    "user_id": user_id,
                    "transaction_id": transaction_id,
                    "group_expense_id": group_expense_id,
                    "file_path": storage_path,
                    "public_url": public_url,
                    "thumbnail_url": None,
                    "mime_type": mime,
                    "file_size_bytes": file_size,
                })
                .execute()
            )
        )
    except APIError as e:
        # Cleanup storage if DB insert fails
        try:
            sb.storage.from_("receipts").remove([storage_path])
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database insert failed: {e.message}",
        ) from e

    return ReceiptUploadOut(
        receipt_id=row["id"],
        public_url=row["public_url"],
        thumbnail_url=row.get("thumbnail_url"),
        file_path=row["file_path"],
        mime_type=row.get("mime_type"),
        file_size_bytes=row.get("file_size_bytes"),
    )


@router.delete("/upload/receipt/{receipt_id}")
async def delete_receipt(
    receipt_id: str,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, str]:
    """
    Delete a receipt (storage file + DB record).  Only the owner can delete.
    """
    sb = _sb()

    # Fetch record to verify ownership
    try:
        rows = as_dict_rows(
            _exec(
                sb.table("transaction_receipts")
                .select("*")
                .eq("id", receipt_id)
                .eq("user_id", user_id)
                .execute()
            )
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        ) from e

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found or not owned by user",
        )

    row = rows[0]
    file_path = row["file_path"]

    # Delete from storage
    try:
        sb.storage.from_("receipts").remove([file_path])
    except Exception:
        pass  # Continue even if storage delete fails

    # Delete DB record
    try:
        _exec(
            sb.table("transaction_receipts")
            .delete()
            .eq("id", receipt_id)
            .eq("user_id", user_id)
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        ) from e

    return {"status": "deleted"}


def _guess_extension(filename: str | None) -> str:
    """Extract file extension from filename, defaulting to .jpg."""
    if filename and "." in filename:
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext in ("jpg", "jpeg", "png", "gif", "webp", "heic", "heif"):
            return f".{ext}"
    return ".jpg"
