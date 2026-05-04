"""Cron script: sends FCM push notification for bills due tomorrow.

Runnable standalone. Queries personal_reminders where due_date = tomorrow
and is_paid = false, then sends an FCM push to each device token.

Usage:
    python scripts/bill_reminder_push.py

Requires FCM_SERVER_KEY env var (or in .env at backend root).
"""

from __future__ import annotations

import os
import sys
from datetime import date, timedelta
from typing import Any

from dotenv import load_dotenv

# Ensure the backend root is on sys.path so `app.*` imports resolve.
# This script lives at backend/scripts/bill_reminder_push.py.
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

# Load .env from the backend root (same pattern as app/config.py)
_env_path = os.path.join(_BACKEND_ROOT, ".env")
if os.path.isfile(_env_path):
    load_dotenv(_env_path)

from app.core.supabase import get_supabase
from app.postgrest_rows import as_dict_rows
from app.services.daily_digest import send_push_notification


def send_bill_reminders() -> dict[str, Any]:
    """Query tomorrow's unpaid reminders and send push notifications."""
    sb = get_supabase()

    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    # ── 1. Fetch reminders due tomorrow ────────────────────────────────
    try:
        reminders = (
            sb.table("personal_reminders")
            .select("id, user_id, title, amount")
            .eq("due_date", tomorrow)
            .eq("is_paid", False)
            .execute()
        )
    except Exception as e:
        return {"status": "error", "error": f"Failed to query reminders: {e}"}

    if not reminders.data:
        return {"status": "skipped", "reason": f"No unpaid reminders due {tomorrow}"}

    rows = as_dict_rows(reminders.data)
    total_reminders = len(rows)
    results: list[dict[str, Any]] = []
    sent_count = 0

    # ── 2. For each reminder, fetch device tokens and send pushes ───────
    for reminder in rows:
        reminder_id = reminder.get("id")
        user_id = reminder.get("user_id")
        title = str(reminder.get("title", "Bill"))
        amount = reminder.get("amount", 0)

        # Format amount as INR string
        try:
            amt_float = float(amount or 0)
            amt_str = f"₹{amt_float:,.0f}"
        except (ValueError, TypeError):
            amt_str = f"₹{amount}"

        body = f"{title} — {amt_str} due tomorrow"

        # Fetch user's device tokens
        try:
            tokens = (
                sb.table("personal_device_tokens")
                .select("token, platform")
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as e:
            results.append({
                "reminder_id": reminder_id,
                "user_id": user_id,
                "status": "error",
                "error": f"Failed to fetch tokens: {e}",
            })
            continue

        if not tokens.data:
            results.append({
                "reminder_id": reminder_id,
                "user_id": user_id,
                "status": "skipped",
                "reason": "No device tokens",
            })
            continue

        token_rows = as_dict_rows(tokens.data)
        for token_row in token_rows:
            token = str(token_row["token"])
            try:
                result = send_push_notification(
                    token,
                    "Bill due tomorrow",
                    body,
                )
                if result.get("status") == "sent":
                    sent_count += 1
                results.append({
                    "reminder_id": reminder_id,
                    "user_id": user_id,
                    "token": token[-8:],  # last 8 chars for logging
                    **result,
                })
            except Exception as e:
                results.append({
                    "reminder_id": reminder_id,
                    "user_id": user_id,
                    "token": token[-8:],
                    "status": "error",
                    "error": str(e),
                })

    return {
        "status": "complete",
        "total_reminders": total_reminders,
        "sent_count": sent_count,
        "results": results,
    }


def main() -> None:
    """Standalone entry point."""
    result = send_bill_reminders()
    status = result.get("status", "unknown")
    print(f"[bill_reminder_push] Status: {status}")

    if status == "error":
        print(f"  Error: {result.get('error')}")
        sys.exit(1)

    if status == "skipped":
        print(f"  Reason: {result.get('reason')}")
        return

    print(f"  Total reminders due tomorrow: {result.get('total_reminders')}")
    print(f"  Push notifications sent: {result.get('sent_count')}")

    # Log any non-sent results for debugging
    for r in result.get("results", []):
        if r.get("status") != "sent":
            print(f"  [{r.get('status')}] reminder_id={r.get('reminder_id')} "
                  f"user_id={r.get('user_id')}: {r.get('reason') or r.get('error')}")


if __name__ == "__main__":
    main()
