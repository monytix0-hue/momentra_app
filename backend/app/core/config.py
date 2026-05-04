"""Shared runtime configuration."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./momentra.db")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
FIREBASE_AUTH_DISABLED = os.getenv("FIREBASE_AUTH_DISABLED", "false").lower() == "true"
PUBLIC_APP_BASE_URL = (
    os.getenv("PUBLIC_APP_BASE_URL")
    or os.getenv("MOMENTRA_APP_INVITE_BASE_URL")
    or "https://momentra.app"
).rstrip("/")
MOMENTRA_UPLOAD_DIR = Path(os.getenv("MOMENTRA_UPLOAD_DIR", str(Path.cwd() / "uploads")))

RESEND_API_KEY = os.getenv("RESEND_API_KEY") or os.getenv("MOMENTRA_RESEND_API_KEY")
RESEND_FROM_EMAIL = (
    os.getenv("RESEND_FROM_EMAIL")
    or os.getenv("MOMENTRA_RESEND_FROM")
    or "Momentra <no-reply@momentra.app>"
)

