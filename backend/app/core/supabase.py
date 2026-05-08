from functools import lru_cache

import httpx
from postgrest.constants import DEFAULT_POSTGREST_CLIENT_TIMEOUT
from supabase import Client, ClientOptions, create_client

from app.config import get_settings


@lru_cache
def get_supabase() -> Client:
    """Supabase client with service role — full DB (PostgREST) + Storage. Server-side only."""
    s = get_settings()
    if not s.supabase_url or not s.supabase_service_role_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    # Postgrest defaults to httpx/http2=True. Sync calls from FastAPI's thread pool on
    # macOS can hit EAGAIN (errno 35) during h2 reads; HTTP/1.1 avoids that path.
    http_client = httpx.Client(
        http2=False,
        follow_redirects=True,
        timeout=httpx.Timeout(DEFAULT_POSTGREST_CLIENT_TIMEOUT),
    )
    return create_client(
        s.supabase_url,
        s.supabase_service_role_key,
        ClientOptions(httpx_client=http_client),
    )
