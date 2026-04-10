from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import auth, credentials
from google.auth.exceptions import DefaultCredentialsError

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

    # PaaS-friendly: paste full service account JSON in env (e.g. Dokploy) — no file mount.
    json_raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if json_raw:
        try:
            data = json.loads(json_raw)
        except json.JSONDecodeError:
            _log.warning("FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON")
        else:
            if not isinstance(data, dict):
                _log.warning("FIREBASE_SERVICE_ACCOUNT_JSON must be a JSON object")
            else:
                cred = credentials.Certificate(data)
                pid = (s.firebase_project_id or "").strip()
                if not pid:
                    raw_pid = data.get("project_id")
                    pid = raw_pid.strip() if isinstance(raw_pid, str) else ""
                if not pid:
                    for key in ("GOOGLE_CLOUD_PROJECT", "GCLOUD_PROJECT"):
                        v = os.environ.get(key, "").strip()
                        if v:
                            pid = v
                            break
                json_app_options: dict[str, Any] | None = {"projectId": pid} if pid else None
                firebase_admin.initialize_app(cred, json_app_options)
                _log.info("Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_JSON (project_id=%s)", pid or "(unset)")
                return

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

    if s.firebase_credentials_path and cred_path is None:
        # If JSON env is set but invalid, we already logged above — do not also blame the file path
        # (Compose/Dokploy often leave FIREBASE_CREDENTIALS_PATH=/run/secrets/... without a mount).
        if not json_raw:
            _log.warning(
                "FIREBASE_CREDENTIALS_PATH is set but file not found (tried: %r). "
                "Place the JSON in the backend folder, use an absolute path, or set "
                "FIREBASE_SERVICE_ACCOUNT_JSON (one line).",
                s.firebase_credentials_path,
            )

    if not project_id:
        _log.warning(
            "Firebase project id is unset. Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT "
            "(or use a service account JSON with project_id) so Auth can verify ID tokens."
        )

    # Do not call initialize_app() with ADC by default: in Docker it "succeeds" but
    # verify_id_token then raises DefaultCredentialsError. Use explicit credentials
    # (FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CREDENTIALS_PATH), or opt in on GCP:
    allow_adc = os.environ.get("FIREBASE_ALLOW_APPLICATION_DEFAULT_CREDENTIALS", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    if allow_adc:
        try:
            firebase_admin.initialize_app(options=app_options)
            _log.info("Firebase Admin initialized with application default credentials (opt-in)")
        except ValueError:
            _log.warning(
                "Firebase Admin not configured (missing service account file and no ADC). "
                "Protected routes will fail until configured."
            )
    else:
        _log.error(
            "Firebase Admin has no service account. Set FIREBASE_SERVICE_ACCOUNT_JSON (one line) "
            "or mount a key file and set FIREBASE_CREDENTIALS_PATH. "
            "Protected routes will return errors until this is fixed. "
            "(On GCP with metadata credentials only, set FIREBASE_ALLOW_APPLICATION_DEFAULT_CREDENTIALS=true.)"
        )


def verify_firebase_token(id_token: str) -> dict[str, Any]:
    """Validate a Firebase ID token from the client; returns decoded claims."""
    init_firebase()
    try:
        firebase_admin.get_app()
    except ValueError as e:
        raise RuntimeError(
            "Firebase Admin is not initialized. Set FIREBASE_SERVICE_ACCOUNT_JSON (one-line JSON) "
            "or FIREBASE_CREDENTIALS_PATH to a mounted key file, then rebuild and restart the container."
        ) from e
    try:
        return auth.verify_id_token(id_token)
    except DefaultCredentialsError as e:
        raise RuntimeError(
            "Firebase Admin is using Application Default Credentials, but none exist in this "
            "environment (typical in Docker). Set FIREBASE_SERVICE_ACCOUNT_JSON to the full "
            "service account JSON on one line, run `docker compose build --no-cache api` and "
            "redeploy so the latest app code is used, and unset FIREBASE_ALLOW_APPLICATION_DEFAULT_CREDENTIALS."
        ) from e
