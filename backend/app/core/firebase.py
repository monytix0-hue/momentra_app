from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import auth, credentials

from app.config import Settings, get_settings

_log = logging.getLogger(__name__)

# Directory that contains `app/` (the backend project root when installed as this layout).
_BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _resolve_credentials_file(raw: str) -> Path | None:
    """
    Resolve FIREBASE_CREDENTIALS_PATH for local dev.

    Common mistake: `.env` uses `backend/foo.json` while uvicorn cwd is already `backend/`,
    which makes Python look for `backend/backend/foo.json`. We strip a leading `backend/`
    and also try paths relative to the backend project root.
    """
    p = raw.strip()
    if not p:
        return None
    p = os.path.expanduser(p)
    # Duplicate prefix when cwd is backend/
    if p.startswith("backend/") or p.startswith("backend\\"):
        p = p[8:].lstrip("/\\")

    candidates: list[Path] = []
    first = Path(p)
    if first.is_absolute():
        candidates.append(first)
    else:
        candidates.append(Path.cwd() / p)
        candidates.append(_BACKEND_ROOT / p)

    for c in candidates:
        try:
            if c.is_file():
                return c.resolve()
        except OSError:
            continue
    return None


def _firebase_project_id(s: Settings, cred_path: Path | None) -> str | None:
    """
    Auth (verify_id_token) requires a project id. Prefer explicit settings, then JSON, then env.
    """
    raw = (s.firebase_project_id or "").strip()
    if raw:
        return raw
    if cred_path and cred_path.is_file():
        try:
            data = json.loads(cred_path.read_text(encoding="utf-8"))
            pid = data.get("project_id")
            if isinstance(pid, str) and pid.strip():
                return pid.strip()
        except (OSError, json.JSONDecodeError, TypeError):
            pass
    for key in ("GOOGLE_CLOUD_PROJECT", "GCLOUD_PROJECT"):
        v = os.environ.get(key, "").strip()
        if v:
            return v
    return None


def init_firebase() -> None:
    """Initialize Firebase Admin once (call from app lifespan)."""
    try:
        firebase_admin.get_app()
        return
    except ValueError:
        pass
    s = get_settings()
    cred_path = _resolve_credentials_file(s.firebase_credentials_path) if s.firebase_credentials_path else None
    project_id = _firebase_project_id(s, cred_path)
    app_options: dict[str, Any] | None = (
        {"projectId": project_id} if project_id else None
    )

    if cred_path is not None:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred, app_options)
        _log.info(
            "Firebase Admin initialized from credentials file: %s (project_id=%s)",
            cred_path,
            project_id or "(from credential JSON if present)",
        )
        return

    if s.firebase_credentials_path:
        _log.warning(
            "FIREBASE_CREDENTIALS_PATH is set but file not found (tried: %r). "
            "Place the JSON in the backend folder or use an absolute path. Falling back to ADC.",
            s.firebase_credentials_path,
        )

    if not project_id:
        _log.warning(
            "Firebase project id is unset. Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT "
            "(or use a service account JSON with project_id) so Auth can verify ID tokens."
        )

    try:
        firebase_admin.initialize_app(options=app_options)
        _log.info("Firebase Admin initialized with application default credentials")
    except ValueError:
        _log.warning(
            "Firebase Admin not configured (missing service account file and no ADC). "
            "Protected routes will fail until configured."
        )


def verify_firebase_token(id_token: str) -> dict[str, Any]:
    """Validate a Firebase ID token from the client; returns decoded claims."""
    init_firebase()
    try:
        firebase_admin.get_app()
    except ValueError as e:
        raise RuntimeError("Firebase Admin is not initialized") from e
    decoded: dict[str, Any] = auth.verify_id_token(id_token)
    return decoded
