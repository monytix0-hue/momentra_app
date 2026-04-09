from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve `.env` from the backend package root, not the shell cwd (uvicorn is often run from repo root).
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_env_backend = _BACKEND_ROOT / ".env"
_env_cwd = Path.cwd() / ".env"
_env_files: tuple[str, ...] = tuple(
    str(p) for p in (_env_backend, _env_cwd) if p.is_file()
) or (".env",)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_files,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    supabase_url: str = Field(default="", description="Supabase project URL")
    supabase_service_role_key: str = Field(
        default="",
        description="Server-only key; never expose to browsers",
    )

    database_url: str = Field(
        default="",
        description="Optional async Postgres URL (Supabase pooler) for direct SQL",
    )

    firebase_credentials_path: str = Field(
        default="",
        description="Path to Firebase service account JSON",
    )
    firebase_project_id: str = Field(default="", description="GCP / Firebase project id")

    api_host: str = "0.0.0.0"
    api_port: int = 6000
    cors_origins: str = "http://localhost:3000"

    app_public_url: str = Field(
        default="http://localhost:3000",
        description="Browser base URL for invite links in emails (no trailing slash)",
        validation_alias=AliasChoices(
            "MOMENTRA_APP_INVITE_BASE_URL",
            "APP_PUBLIC_URL",
        ),
    )
    resend_api_key: str = Field(
        default="",
        description="Resend API key; empty skips sending email",
        validation_alias=AliasChoices(
            "MOMENTRA_RESEND_API_KEY",
            "RESEND_API_KEY",
        ),
    )
    invite_from_email: str = Field(
        default="onboarding@resend.dev",
        description='Resend "from" (e.g. Momentra <invite@momentra.tech>)',
        validation_alias=AliasChoices(
            "MOMENTRA_RESEND_FROM",
            "INVITE_FROM_EMAIL",
        ),
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
