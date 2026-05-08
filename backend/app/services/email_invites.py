"""Optional Resend delivery for group invite emails."""

from __future__ import annotations

import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

RESEND_API = "https://api.resend.com/emails"


def send_group_invite_email(
    *,
    to_email: str,
    join_url: str,
    group_title: str,
    invitee_display_name: str,
) -> None:
    s = get_settings()
    key = (s.resend_api_key or "").strip()
    if not key:
        logger.info(
            "Group invite email skipped (set MOMENTRA_RESEND_API_KEY or RESEND_API_KEY). join_url=%s to=%s",
            join_url,
            to_email,
        )
        return

    html = f"""
    <p>Hi {invitee_display_name},</p>
    <p>You have been invited to join the group <strong>{group_title}</strong> on Momentra.</p>
    <p><a href="{join_url}">Accept invitation</a></p>
    <p>If the button does not work, paste this link into your browser:<br/>{join_url}</p>
    """

    payload = {
        "from": s.invite_from_email,
        "to": [to_email],
        "subject": f"Invitation: {group_title}",
        "html": html,
    }
    with httpx.Client(timeout=30.0) as client:
        r = client.post(RESEND_API, json=payload, headers={"Authorization": f"Bearer {key}"})
        if r.status_code >= 400:
            raise RuntimeError(f"resend_failed: {r.status_code} {r.text}")
    logger.info("Invite email sent to %s for group %s", to_email, group_title)


def send_business_invite_email(
    *,
    to_email: str,
    join_url: str,
    workspace_title: str,
    role: str,
) -> None:
    s = get_settings()
    key = (s.resend_api_key or "").strip()
    if not key:
        logger.info(
            "Business invite email skipped (set MOMENTRA_RESEND_API_KEY or RESEND_API_KEY). join_url=%s to=%s",
            join_url,
            to_email,
        )
        return

    html = f"""
    <p>Hi,</p>
    <p>You have been invited to join the workspace <strong>{workspace_title}</strong> on Momentra.</p>
    <p>Assigned role: <strong>{role}</strong></p>
    <p><a href="{join_url}">Accept invitation</a></p>
    <p>If the button does not work, paste this link into your browser:<br/>{join_url}</p>
    """
    payload = {
        "from": s.invite_from_email,
        "to": [to_email],
        "subject": f"Invitation: {workspace_title}",
        "html": html,
    }
    with httpx.Client(timeout=30.0) as client:
        r = client.post(RESEND_API, json=payload, headers={"Authorization": f"Bearer {key}"})
        if r.status_code >= 400:
            raise RuntimeError(f"resend_failed: {r.status_code} {r.text}")
    logger.info("Invite email sent to %s for workspace %s", to_email, workspace_title)
