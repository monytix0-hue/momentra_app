"""Tests for Phase 8 notification features."""
import pytest
from sqlalchemy import select

from app.models.notifications import Notification
from app.models.analytics import NotificationPreference
from app.services.notification_service import (
    create_notification,
    get_user_notifications,
    mark_read,
    dismiss_notification,
    get_unread_count,
    delete_expired,
    get_or_create_preferences,
)


@pytest.mark.asyncio
async def test_create_notification(db_session):
    n = await create_notification(
        db=db_session,
        user_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        type="expense_created",
        title="Test",
        body="Test body",
    )
    assert n.title == "Test"
    assert n.type == "expense_created"
    assert n.read == "N"


@pytest.mark.asyncio
async def test_get_user_notifications(db_session):
    n = await create_notification(
        db=db_session, user_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        type="expense_created", title="T1", body="B1",
    )
    notifications, unread, total, has_more = await get_user_notifications(
        db_session, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    )
    assert len(notifications) == 1
    assert total == 1
    assert unread == 1


@pytest.mark.asyncio
async def test_mark_read_single(db_session):
    n = await create_notification(
        db=db_session, user_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        type="expense_created", title="T1", body="B1",
    )
    count = await mark_read(
        db_session, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        notification_ids=[n.id]
    )
    assert count == 1
    result = await db_session.execute(select(Notification).where(Notification.id == n.id))
    updated = result.scalar_one()
    assert updated.read == "Y"


@pytest.mark.asyncio
async def test_mark_read_all(db_session):
    for i in range(3):
        await create_notification(
            db=db_session, user_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            type="expense_created", title=f"T{i}", body="B",
        )
    count = await mark_read(
        db_session, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", mark_all=True
    )
    assert count == 3
    notifications, unread, total, _ = await get_user_notifications(
        db_session, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", unread_only=True
    )
    assert unread == 0


@pytest.mark.asyncio
async def test_dismiss_notification(db_session):
    n = await create_notification(
        db=db_session, user_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        type="expense_created", title="T1", body="B1",
    )
    ok = await dismiss_notification(
        db_session, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", n.id
    )
    assert ok is True
    notifications, _, total, _ = await get_user_notifications(
        db_session, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    )
    assert total == 0  # dismissed are filtered


@pytest.mark.asyncio
async def test_notification_list_response_structure(db_session):
    n = await create_notification(
        db=db_session, user_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        type="expense_created", title="T1", body="B1", priority="critical",
    )
    from app.schemas.notification import NotificationListResponse, NotificationResponse
    notifications, unread_count, total, has_more = await get_user_notifications(
        db_session, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    )
    unread_critical = sum(1 for x in notifications if x.read == "N" and x.priority == "critical")
    response = NotificationListResponse(
        notifications=[NotificationResponse.model_validate(n) for n in notifications],
        unread_count=unread_count,
        unread_critical=unread_critical,
        total=total,
        has_more=has_more,
    )
    assert response.unread_count == 1
    assert response.total == 1


@pytest.mark.asyncio
async def test_get_or_create_preferences(db_session):
    prefs = await get_or_create_preferences(
        db_session, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    )
    assert len(prefs) == 6  # all default categories created
    categories = {p.category for p in prefs}
    assert "bills" in categories
    assert "invites" in categories
