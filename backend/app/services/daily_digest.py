"""Morning Daily Digest: builds summary + sends FCM push notification."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from app.core.supabase import get_supabase
from app.postgrest_rows import as_dict_row, as_dict_rows


def format_inr(amount: float) -> str:
    """Format number as INR without decimals for digest (e.g. ₹12,400)."""
    abs_amt = abs(amount)
    s = f"{abs_amt:,.0f}"
    return f"₹{s}"


def _date_bounds(today: date | None = None) -> tuple[str, str]:
    """Return YYYY-MM-DD start/end for the current month."""
    d = today or date.today()
    start = date(d.year, d.month, 1).isoformat()
    if d.month == 12:
        end = date(d.year + 1, 1, 1).isoformat()
    else:
        end = date(d.year, d.month + 1, 1).isoformat()
    return start, end


def build_digest(user_id: str) -> str | None:
    """
    Build the morning digest text for a user.
    Returns None if user has no activity at all (skip notification).
    """
    sb = get_supabase()

    # ── 1. Yesterday's spending ─────────────────────────────────────────
    month_start, month_end = _date_bounds()
    today_str = date.today().isoformat()

    try:
        summary_raw = (
            sb.rpc("get_personal_summary", {"p_user_id": user_id})
            .execute()
        )
    except Exception:
        summary_raw = None

    plan_remaining = None
    total_spent = None
    if summary_raw and summary_raw.data:
        row = as_dict_row(summary_raw.data)
        if row:
            plan_remaining = float(row.get("plan_remaining") or row.get("money_left") or 0)
            total_spent = float(row.get("total_spent_period") or 0)

    # Try to get summary from the REST endpoint fallback
    if plan_remaining is None:
        try:
            txns = (
                sb.table("personal_transactions")
                .select("amount")
                .eq("user_id", user_id)
                .gte("transaction_date", month_start)
                .lt("transaction_date", month_end)
                .execute()
            )
            total_spent = sum(float(r["amount"]) for r in as_dict_rows(txns.data) or []) if txns.data else 0

            cycles = (
                sb.table("personal_cycles")
                .select("allocated_budget,spent_amount")
                .eq("user_id", user_id)
                .gte("start_date", month_start)
                .lt("start_date", month_end)
                .execute()
            )
            total_budget = sum(
                float(r.get("allocated_budget") or 0) for r in as_dict_rows(cycles.data) or []
            )
            plan_remaining = total_budget - total_spent if total_budget else 0
        except Exception:
            total_spent = None
            plan_remaining = None

    # ── 2. Yesterday's transactions ──────────────────────────────────────
    yesterday_spent = None
    yesterday_count = 0
    try:
        # Last 24 hours worth of transactions
        from datetime import timedelta
        yesterday_start = (date.today() - timedelta(days=1)).isoformat()
        yesterday_txns = (
            sb.table("personal_transactions")
            .select("amount")
            .eq("user_id", user_id)
            .gte("transaction_date", yesterday_start)
            .lt("transaction_date", today_str)
            .execute()
        )
        if yesterday_txns.data:
            rows = as_dict_rows(yesterday_txns.data)
            yesterday_spent = sum(float(r["amount"]) for r in rows)
            yesterday_count = len(rows)
    except Exception:
        pass

    # ── 3. Upcoming reminders ────────────────────────────────────────────
    reminder_count = 0
    reminder_total = 0.0
    try:
        reminders = (
            sb.table("personal_reminders")
            .select("amount")
            .eq("user_id", user_id)
            .eq("is_paid", False)
            .gte("due_date", today_str)
            .execute()
        )
        if reminders.data:
            rows = as_dict_rows(reminders.data)
            reminder_count = len(rows)
            reminder_total = sum(float(r["amount"]) for r in rows)
    except Exception:
        pass

    # ── 4. Group activities (unsettled, pending) ──────────────────────────
    group_pending_count = 0
    try:
        # Check group participants for unsettled balances
        groups = (
            sb.table("group_moments")
            .select("moment_id")
            .eq("owner_uid", user_id)
            .eq("status", "active")
            .execute()
        )
        if groups.data:
            gids = [str(g["moment_id"]) for g in as_dict_rows(groups.data)]
            if gids:
                commitments = (
                    sb.table("group_commitments")
                    .select("amount_pending")
                    .in_("moment_id", gids)
                    .gt("amount_pending", 0)
                    .execute()
                )
                if commitments.data:
                    group_pending_count = len(as_dict_rows(commitments.data))
    except Exception:
        pass

    # ── 5. Goals progress ────────────────────────────────────────────────
    goal_count = 0
    goal_total = 0.0
    goal_saved = 0.0
    try:
        goals = (
            sb.table("personal_goals")
            .select("target_amount,saved_amount")
            .eq("user_id", user_id)
            .execute()
        )
        if goals.data:
            rows = as_dict_rows(goals.data)
            goal_count = len(rows)
            goal_total = sum(float(r["target_amount"]) for r in rows)
            goal_saved = sum(float(r["saved_amount"]) for r in rows)
    except Exception:
        pass

    # ── Build the digest string ──────────────────────────────────────────
    lines: list[str] = []
    lines.append("☀️ Morning Money Brief")

    if yesterday_spent is not None:
        pct_line = ""
        if plan_remaining is not None and plan_remaining > 0 and total_spent and total_spent > 0:
            daily_pct = (yesterday_spent / max(total_spent, 1)) * 100
            pct_line = f" ({daily_pct:.0f}% of month)"
        lines.append(f"📊 Yesterday: {format_inr(yesterday_spent)}{pct_line}")

    if plan_remaining is not None:
        if plan_remaining > 0:
            lines.append(f"📋 Plan Remaining: {format_inr(plan_remaining)}")
        else:
            lines.append(f"⚠️ Plan Remaining: {format_inr(plan_remaining)} — you're over budget!")

    if reminder_count > 0:
        lines.append(f"🔔 {reminder_count} bill{'' if reminder_count == 1 else 's'} due: {format_inr(reminder_total)} total")

    if group_pending_count > 0:
        lines.append(f"👥 {group_pending_count} pending group settlement{'' if group_pending_count == 1 else 's'}")

    if goal_count > 0 and goal_total > 0:
        pct = min(100, int((goal_saved / goal_total) * 100)) if goal_total else 0
        lines.append(f"🎯 {goal_count} goal{'' if goal_count == 1 else 's'} — {pct}% saved")

    if not lines:
        return None

    lines.append("")
    lines.append("Open Momentra to see the full picture →")

    return "\n".join(lines)


def build_weekly_report(user_id: str) -> str | None:
    """
    Build a weekly spend report comparing last 7 days vs the previous 7 days.
    Returns a human-readable summary string, or None if there's no data.
    """
    from datetime import timedelta

    sb = get_supabase()
    today = date.today()
    prev_week_end = today - timedelta(days=1)
    prev_week_start = today - timedelta(days=7)
    prev2_week_end = today - timedelta(days=8)
    prev2_week_start = today - timedelta(days=14)

    try:
        # ── This week (last 7 days: D-7 to D-1) ────────────────
        this_week_txns = (
            sb.table("personal_transactions")
            .select("amount,category,subcategory,merchant,description")
            .eq("user_id", user_id)
            .gte("transaction_date", prev_week_start.isoformat())
            .lt("transaction_date", prev_week_end.isoformat())
            .execute()
        )
        # ── Previous week (D-14 to D-8) ────────────────────────
        prev_week_txns = (
            sb.table("personal_transactions")
            .select("amount,category,subcategory,merchant,description")
            .eq("user_id", user_id)
            .gte("transaction_date", prev2_week_start.isoformat())
            .lt("transaction_date", prev2_week_end.isoformat())
            .execute()
        )
    except Exception:
        return None

    this_rows = list(as_dict_rows(this_week_txns.data)) if this_week_txns.data else []
    prev_rows = list(as_dict_rows(prev_week_txns.data)) if prev_week_txns.data else []

    if not this_rows and not prev_rows:
        return None

    # ── Aggregate by category ──────────────────────────────────
    def agg(rows: list[dict]) -> dict[str, float]:
        cat_totals: dict[str, float] = {}
        for r in rows:
            cat = r.get("category") or "Other"
            amt = float(r.get("amount") or 0)
            cat_totals[cat] = cat_totals.get(cat, 0) + amt
        return cat_totals

    this_cats = agg(this_rows)
    prev_cats = agg(prev_rows)

    this_total = sum(this_cats.values())
    prev_total = sum(prev_cats.values())

    # ── Build report text ──────────────────────────────────────
    parts: list[str] = []

    # Total spend line
    if this_total > 0:
        if prev_total > 0:
            diff_pct = ((this_total - prev_total) / prev_total) * 100
            direction = "up" if diff_pct > 0 else "down"
            parts.append(
                f"Last week: Spent {format_inr(this_total)} "
                f"({direction} {abs(diff_pct):.0f}% vs previous week)"
            )
        else:
            parts.append(f"Last week: Spent {format_inr(this_total)}")
    elif prev_total > 0:
        parts.append("Last week: No spending (down 100% vs previous week)")
    else:
        return None

    # Top 3 categories this week with change vs previous week
    sorted_cats = sorted(this_cats.items(), key=lambda x: -x[1])
    top_cats = sorted_cats[:3]

    cat_lines: list[str] = []
    for cat, amt in top_cats:
        prev_amt = prev_cats.get(cat, 0)
        if prev_amt > 0:
            pct = ((amt - prev_amt) / prev_amt) * 100
            sign = "+" if pct >= 0 else ""
            cat_lines.append(f"{cat}: {format_inr(amt)} ({sign}{pct:.0f}%)")
        else:
            cat_lines.append(f"{cat}: {format_inr(amt)}")
    if cat_lines:
        parts.append(". ".join(cat_lines))

    # ── Plan remaining (monthly budget context) ────────────────
    try:
        month_start = date(today.year, today.month, 1).isoformat()
        if today.month == 12:
            month_end = date(today.year + 1, 1, 1).isoformat()
        else:
            month_end = date(today.year, today.month + 1, 1).isoformat()

        cycles = (
            sb.table("personal_cycles")
            .select("allocated_budget,spent_amount")
            .eq("user_id", user_id)
            .gte("start_date", month_start)
            .lt("start_date", month_end)
            .execute()
        )
        total_budget = sum(
            float(r.get("allocated_budget") or 0) for r in as_dict_rows(cycles.data) or []
        )
        total_month_spent = sum(
            float(r.get("spent_amount") or 0) for r in as_dict_rows(cycles.data) or []
        )
        plan_remaining = total_budget - total_month_spent
        if plan_remaining > 0:
            parts.append(f"Plan remaining: {format_inr(plan_remaining)}")
    except Exception:
        pass

    # ── Suggested action ──────────────────────────────────────
    # Look for food delivery patterns (merchant-based heuristic)
    delivery_keywords = ["swiggy", "zomato", "zepto", "blinkit", "instamart", "delivery"]
    delivery_count_this = sum(
        1
        for r in this_rows
        if any(kw in (r.get("merchant") or "").lower() for kw in delivery_keywords)
    )
    if delivery_count_this >= 3:
        cut = min(delivery_count_this // 2, 3)
        parts.append(
            f"Suggested: Cut food delivery by {cut} meal{'s' if cut > 1 else ''} "
            "this week to stay on track"
        )
    elif this_total > 0 and prev_total > 0 and this_total > prev_total * 1.2:
        parts.append(
            "Suggested: Look for one area to cut back this week"
        )

    return ". ".join(parts) + "."


def _get_fcm_api_key() -> str | None:
    """Get FCM server key from environment."""
    import os
    key = os.getenv("FCM_SERVER_KEY") or os.getenv("FCM_API_KEY")
    return key


def send_push_notification(token: str, title: str, body: str) -> dict[str, Any]:
    """
    Send an FCM push notification to a single device token.
    Uses HTTP v1 API or legacy API based on available credentials.
    """
    server_key = _get_fcm_api_key()
    if not server_key:
        return {"status": "skipped", "reason": "No FCM_SERVER_KEY configured"}

    import json
    import urllib.request

    payload = {
        "to": token,
        "notification": {
            "title": title,
            "body": body,
        },
        "android": {
            "priority": "high",
            "notification": {
                "channel_id": "morning_digest",
                "priority": "high",
            },
        },
        "apns": {
            "headers": {
                "apns-priority": "10",
            },
            "payload": {
                "aps": {
                    "sound": "default",
                    "badge": 1,
                },
            },
        },
    }

    req = urllib.request.Request(
        "https://fcm.googleapis.com/fcm/send",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"key={server_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return {"status": "sent", "result": result}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def send_daily_digest_to_user(user_id: str) -> dict[str, Any]:
    """
    Build and send the morning digest to a user.
    Returns result dict.
    """
    digest = build_digest(user_id)
    if digest is None:
        return {"status": "skipped", "reason": "No data for digest"}

    sb = get_supabase()
    try:
        tokens = (
            sb.table("personal_device_tokens")
            .select("token,platform")
            .eq("user_id", user_id)
            .execute()
        )
        if not tokens.data:
            return {"status": "skipped", "reason": "No device tokens registered"}

        results: list[dict[str, Any]] = []
        rows = as_dict_rows(tokens.data)
        for row in rows:
            t = str(row["token"])
            result = send_push_notification(t, "☀️ Morning Money Brief", digest)
            results.append(result)

        return {"status": "sent", "tokens": len(results), "digest_preview": digest[:100]}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def send_daily_digest_all_users() -> dict[str, Any]:
    """
    Send morning digest to all users who have device tokens registered.
    Called by cron job.
    """
    sb = get_supabase()
    try:
        user_ids = (
            sb.table("personal_device_tokens")
            .select("user_id", count="distinct")
            .execute()
        )
        if not user_ids.data:
            return {"status": "skipped", "reason": "No users with device tokens"}

        uids = {str(r["user_id"]) for r in as_dict_rows(user_ids.data) if r.get("user_id")}
        results: list[dict[str, Any]] = []
        for uid in sorted(uids):
            result = send_daily_digest_to_user(uid)
            results.append({"user_id": uid, **result})

        sent = sum(1 for r in results if r.get("status") == "sent")
        skipped = sum(1 for r in results if r.get("status") == "skipped")
        return {
            "status": "complete",
            "total_users": len(uids),
            "sent": sent,
            "skipped": skipped,
            "results": results,
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
