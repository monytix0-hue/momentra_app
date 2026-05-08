"""Tests for Phase 8 security features."""

import pytest
from sqlalchemy import select

from app.core.security import (
    create_access_token,
    create_pin_token,
    hash_pin,
    verify_pin,
    verify_token,
    hash_refresh_token,
)


# ── PIN Tests ──

def test_hash_pin_valid():
    hashed = hash_pin("123456")
    assert hashed.startswith("$2")
    assert len(hashed) > 20


def test_hash_pin_invalid_length():
    with pytest.raises(ValueError):
        hash_pin("123")  # too short
    with pytest.raises(ValueError):
        hash_pin("1234567")  # too long
    with pytest.raises(ValueError):
        hash_pin("abcdef")  # not digits


def test_verify_pin_correct():
    hashed = hash_pin("5555")
    assert verify_pin("5555", hashed) is True


def test_verify_pin_wrong():
    hashed = hash_pin("5555")
    assert verify_pin("5556", hashed) is False
    assert verify_pin("55555", hashed) is False
    assert verify_pin("", hashed) is False


# ── Token Tests ──

def test_create_access_token():
    token = create_access_token("some-user-id")
    assert isinstance(token, str)
    payload = verify_token(token)
    assert payload["sub"] == "some-user-id"
    assert payload["type"] == "access"


def test_create_pin_token():
    token = create_pin_token("some-user-id")
    assert isinstance(token, str)
    payload = verify_token(token)
    assert payload["sub"] == "some-user-id"
    assert payload["type"] == "pin"


def test_pin_token_is_shorter_lived():
    import time
    from datetime import datetime, timezone
    # Just verify it decodes properly; expiration is checked by the library
    token = create_pin_token("u")
    payload = verify_token(token)
    exp = payload["exp"]
    iat = payload["iat"]
    # Should be ~5 minutes (300 seconds)
    assert (exp - iat) <= 305


def test_hash_refresh_token():
    token = "my-refresh-token"
    hashed = hash_refresh_token(token)
    assert hashed.startswith("$2")


# ── Audit Logger Tests ──

@pytest.mark.asyncio
async def test_log_event_creates_row(db_session):
    from app.core.audit_logger import log_event
    from app.models.security import AuditLog

    audit_id = await log_event(
        db=db_session,
        event_type="test_event",
        action="POST /test",
        ip="127.0.0.1",
        user_agent="pytest",
        details={"test": True},
    )
    assert audit_id is not None

    result = await db_session.execute(
        select(AuditLog).where(AuditLog.id == audit_id)
    )
    row = result.scalar_one()
    assert row.event_type == "test_event"
    assert row.action == "POST /test"
    assert row.details == {"test": True}


@pytest.mark.asyncio
async def test_log_auth_success(db_session):
    from app.core.audit_logger import log_auth_success

    audit_id = await log_auth_success(
        db=db_session,
        user_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        ip="127.0.0.1",
        user_agent="pytest",
    )
    assert audit_id is not None


@pytest.mark.asyncio
async def test_log_auth_failure(db_session):
    from app.core.audit_logger import log_auth_failure

    audit_id = await log_auth_failure(
        db=db_session,
        reason="bad_password",
        ip="127.0.0.1",
        user_agent="pytest",
    )
    assert audit_id is not None


# ── Rate Limit Schema Tests ──

def test_rate_limit_status_schema():
    from app.schemas.security import RateLimitStatus
    from datetime import datetime, timezone

    r = RateLimitStatus(
        key="ip:127.0.0.1:/health",
        limit=100,
        window="1m",
        remaining=95,
        reset_at=datetime.now(timezone.utc),
        blocked=False,
    )
    assert r.remaining == 95
    assert r.blocked is False

