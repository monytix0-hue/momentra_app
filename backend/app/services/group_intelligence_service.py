"""Group coordination intelligence: deterministic signals, recommendations, health, time-aware metrics.

Data access uses Supabase (PostgREST), same as ``group_service``. Optional snapshot tables support future caching.
"""

from __future__ import annotations

import calendar
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from supabase import Client

from app.services import group_service as gs


def _d(x: Any) -> Decimal:
    return gs._d(x)


def _utc_day_bounds() -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    return start, start + timedelta(days=1)


def _week_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now - timedelta(days=7)


def _severity_db_to_api(sev: str) -> str:
    s = (sev or "medium").lower()
    if s == "high":
        return "HIGH"
    if s == "low":
        return "LOW"
    return "MEDIUM"


def _money_in(m: Decimal) -> str:
    q = m.quantize(Decimal("1")) if m == m.to_integral() else m.quantize(Decimal("0.01"))
    return f"₹{q}"


def compute_open_settlement_balance(sb: Client, group_id: str, cycle_id: str | None = None) -> Decimal:
    """Sum of (owed - settled) for non-settled expense shares, optionally scoped to a cycle."""
    q = sb.table("group_expenses").select("expense_id,cycle_id").eq("group_id", group_id).execute()
    rows = q.data or []
    if cycle_id:
        rows = [r for r in rows if str(r.get("cycle_id") or "") == cycle_id]
    eids = [str(r["expense_id"]) for r in rows]
    if not eids:
        return Decimal("0")
    total = Decimal("0")
    chunk = 80
    for i in range(0, len(eids), chunk):
        part = eids[i : i + chunk]
        sh = (
            sb.table("group_expense_shares")
            .select("owed_amount,settled_amount,status")
            .in_("expense_id", part)
            .execute()
            .data
            or []
        )
        for s in sh:
            if str(s.get("status") or "") == "settled":
                continue
            total += _d(s.get("owed_amount")) - _d(s.get("settled_amount"))
    return total


def _active_cycle(sb: Client, group_id: str) -> dict[str, Any] | None:
    cycles = (
        sb.table("group_cycles")
        .select("*")
        .eq("group_id", group_id)
        .eq("status", "active")
        .order("start_date", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )
    return cycles[0] if cycles else None


def compute_group_health_state(
    *,
    pending_count: int,
    overdue_count: int,
    open_commitment_balance: Decimal,
    open_share_debt: Decimal,
    funding_ratio: float | None,
) -> str:
    """Return ON_TRACK | SLIGHTLY_BEHIND | NEEDS_ATTENTION."""
    if overdue_count > 0 or open_commitment_balance > Decimal("0.01") and pending_count >= 3:
        return "NEEDS_ATTENTION"
    if (
        overdue_count == 0
        and pending_count == 0
        and open_commitment_balance <= Decimal("0.01")
        and open_share_debt <= Decimal("0.01")
        and (funding_ratio is None or funding_ratio >= 0.85)
    ):
        return "ON_TRACK"
    return "SLIGHTLY_BEHIND"


def build_persistable_signals_for_group(sb: Client, group_id: str) -> list[dict[str, Any]]:
    """Rows for ``group_signals`` insert (lowercase severity for DB check)."""
    g = gs._fetch_group(sb, group_id)
    if not g or str(g.get("status")) != "active":
        return []

    today = date.today()
    cycle_row = _active_cycle(sb, group_id)
    cycle_id = str(cycle_row["cycle_id"]) if cycle_row else None

    coms = sb.table("group_commitments").select("*").eq("group_id", group_id).execute().data or []
    if cycle_id:
        coms = [c for c in coms if str(c.get("cycle_id") or "") == cycle_id]

    pmap = gs._participant_map(sb, group_id)
    pending_by_name: list[tuple[str, str, Decimal]] = []  # name, pid, remaining
    overdue_detail: list[tuple[str, str, Decimal, int]] = []  # name, pid, remaining, days

    for c in coms:
        committed = _d(c.get("committed_amount"))
        paid = _d(c.get("paid_amount"))
        due = date.fromisoformat(str(c["due_date"])) if c.get("due_date") else None
        st = gs.commitment_derived_status(committed, paid, due, today=today)
        pid = str(c["participant_id"])
        nm = pmap.get(pid, {}).get("display_name", "Member")
        rem = committed - paid
        if rem <= Decimal("0.01"):
            continue
        is_overdue = st == "overdue" or (due is not None and due < today and paid < committed)
        if is_overdue:
            days = (today - due).days if due else 0
            overdue_detail.append((str(nm), pid, rem, max(days, 0)))
        elif st in ("pending", "partial"):
            pending_by_name.append((str(nm), pid, rem))

    overdue_pids = {x[1] for x in overdue_detail}
    pending_by_name = [x for x in pending_by_name if x[1] not in overdue_pids]

    signals: list[dict[str, Any]] = []

    if pending_by_name:
        n = len(pending_by_name)
        gtitle = str(g.get("title") or "this group")
        title = f"{n} member{'s' if n != 1 else ''} still pending" if n > 1 else f"{pending_by_name[0][0]} hasn’t finished paying"
        names = ", ".join(x[0] for x in pending_by_name[:4])
        if len(pending_by_name) > 4:
            names += "…"
        signals.append(
            {
                "group_id": group_id,
                "cycle_id": cycle_id,
                "signal_type": "PENDING_PAYMENTS",
                "severity": "medium" if n == 1 else "medium",
                "title": title,
                "message": f"{names} still owe into {gtitle}.",
                "action_type": "OPEN_GROUP",
                "action_target_type": "GROUP",
                "action_target_id": None,
                "resolved": False,
            }
        )

    overdue_pids_used: set[str] = set()
    for nm, pid, rem, days in overdue_detail:
        if pid in overdue_pids_used:
            continue
        overdue_pids_used.add(pid)
        if len(overdue_pids_used) > 5:
            break
        signals.append(
            {
                "group_id": group_id,
                "cycle_id": cycle_id,
                "signal_type": "OVERDUE_COMMITMENT",
                "severity": "high",
                "title": f"{nm} is overdue" + (f" by {days} day{'s' if days != 1 else ''}" if days else ""),
                "message": f"{_money_in(rem)} overdue in {str(g.get('title') or 'group')}.",
                "action_type": "SEND_REMINDER",
                "action_target_type": "PARTICIPANT",
                "action_target_id": pid,
                "resolved": False,
            }
        )

    if cycle_row and str(g.get("funding_model")) == "pooled":
        target = _d(cycle_row.get("target_amount"))
        collected = _d(cycle_row.get("collected_amount"))
        if target > Decimal("0.01"):
            start = date.fromisoformat(str(cycle_row["start_date"]))
            end = date.fromisoformat(str(cycle_row["end_date"]))
            total_days = max((end - start).days, 1)
            elapsed = max((today - start).days, 0)
            expected = target * Decimal(elapsed) / Decimal(total_days)
            if collected + Decimal("0.01") < expected * Decimal("0.85") and elapsed > 3:
                signals.append(
                    {
                        "group_id": group_id,
                        "cycle_id": cycle_id,
                        "signal_type": "FUNDING_LAG",
                        "severity": "low",
                        "title": "Pool is behind this cycle",
                        "message": f"{str(g.get('title') or 'Group')} is collecting slower than expected for the current period.",
                        "action_type": "OPEN_GROUP",
                        "action_target_type": "GROUP",
                        "action_target_id": None,
                        "resolved": False,
                    }
                )

    summary = gs.calculate_group_summary(sb, group_id)
    if summary["open_share_debt"] > Decimal("0.01"):
        signals.append(
            {
                "group_id": group_id,
                "cycle_id": cycle_id,
                "signal_type": "SETTLEMENT_IMBALANCE",
                "severity": "medium",
                "title": "Open expense balances",
                "message": f"{_money_in(summary['open_share_debt'])} still unsettled from recorded expenses.",
                "action_type": "OPEN_GROUP",
                "action_target_type": "GROUP",
                "action_target_id": None,
                "resolved": False,
            }
        )

    no_due_pending = [
        c
        for c in coms
        if not c.get("due_date")
        and gs.commitment_derived_status(
            _d(c.get("committed_amount")), _d(c.get("paid_amount")), None, today=today
        )
        in ("pending", "partial")
    ]
    if len(no_due_pending) >= 2:
        signals.append(
            {
                "group_id": group_id,
                "cycle_id": cycle_id,
                "signal_type": "MISSING_DUE_DATES",
                "severity": "low",
                "title": "Some commitments have no due date",
                "message": "Set due dates so reminders and overdue states stay clear.",
                "action_type": "OPEN_GROUP",
                "action_target_type": "GROUP",
                "action_target_id": None,
                "resolved": False,
            }
        )

    admins = [p for p in gs._active_participants(sb, group_id) if str(p.get("role")) == "admin"]
    if not admins:
        signals.append(
            {
                "group_id": group_id,
                "cycle_id": cycle_id,
                "signal_type": "NO_ADMIN",
                "severity": "high",
                "title": "No admin on this group",
                "message": "Assign an admin so settings and approvals stay owned.",
                "action_type": "OPEN_GROUP",
                "action_target_type": "GROUP",
                "action_target_id": None,
                "resolved": False,
            }
        )

    if str(g.get("duration_type")) == "ongoing" and str(g.get("cycle_type")) != "none" and not cycle_row:
        signals.append(
            {
                "group_id": group_id,
                "cycle_id": None,
                "signal_type": "MISSING_ACTIVE_CYCLE",
                "severity": "medium",
                "title": "Ongoing group needs a cycle",
                "message": "Start or roll the next cycle so commitments and targets line up.",
                "action_type": "START_NEW_CYCLE",
                "action_target_type": "GROUP",
                "action_target_id": None,
                "resolved": False,
            }
        )

    only_one = len(gs._active_participants(sb, group_id)) < 2
    if only_one:
        signals.append(
            {
                "group_id": group_id,
                "cycle_id": cycle_id,
                "signal_type": "NEEDS_PARTICIPANTS",
                "severity": "low",
                "title": "Add people to coordinate",
                "message": "Invite members so splits and pooled targets involve everyone.",
                "action_type": "ADD_PARTICIPANT",
                "action_target_type": "GROUP",
                "action_target_id": None,
                "resolved": False,
            }
        )

    return signals


def refresh_group_signals_intel(sb: Client, group_id: str) -> list[dict[str, Any]]:
    """Delete unresolved signals for group and insert freshly computed rows."""
    sb.table("group_signals").delete().eq("group_id", group_id).eq("resolved", False).execute()
    rows = build_persistable_signals_for_group(sb, group_id)
    if rows:
        sb.table("group_signals").insert(rows).execute()
    r = (
        sb.table("group_signals")
        .select("*")
        .eq("group_id", group_id)
        .eq("resolved", False)
        .order("created_at", desc=True)
        .execute()
    )
    return list(r.data or [])


def _enrich_signal(row: dict[str, Any], title_map: dict[str, str]) -> dict[str, Any]:
    gid = str(row.get("group_id"))
    out = {**row, "group_title": title_map.get(gid), "severity": _severity_db_to_api(str(row.get("severity") or "medium"))}
    if not out.get("title"):
        out["title"] = (row.get("message") or "Signal")[:80]
    if not out.get("action_type"):
        out["action_type"] = "OPEN_GROUP"
    if not out.get("action_target_type"):
        out["action_target_type"] = "GROUP"
    return out


def generate_group_signals(sb: Client, user_id: str) -> list[dict[str, Any]]:
    """Refresh persisted signals for all active groups the user belongs to; return enriched list."""
    groups = gs.list_groups_for_user(sb, user_id)
    active = [g for g in groups if str(g.get("status")) == "active"]
    title_map = {str(g["group_id"]): str(g.get("title") or "") for g in active}
    all_rows: list[dict[str, Any]] = []
    for g in active:
        gid = str(g["group_id"])
        try:
            gs.assert_member(sb, user_id, gid)
        except PermissionError:
            continue
        refresh_group_signals_intel(sb, gid)
        all_rows.extend(
            sb.table("group_signals")
            .select("*")
            .eq("group_id", gid)
            .eq("resolved", False)
            .execute()
            .data
            or []
        )
    sev_rank = {"high": 3, "medium": 2, "low": 1}
    all_rows.sort(key=lambda s: sev_rank.get(str(s.get("severity")), 0), reverse=True)
    return [_enrich_signal(r, title_map) for r in all_rows[:50]]


def _pending_commitment_rows(sb: Client, user_id: str) -> list[dict[str, Any]]:
    groups = gs.list_groups_for_user(sb, user_id)
    active = [g for g in groups if str(g.get("status")) == "active"]
    pending_rows: list[dict[str, Any]] = []
    today = date.today()
    for g in active:
        gid = str(g["group_id"])
        try:
            gs.assert_member(sb, user_id, gid)
        except PermissionError:
            continue
        pmap = gs._participant_map(sb, gid)
        coms = sb.table("group_commitments").select("*").eq("group_id", gid).execute().data or []
        for c in coms:
            committed = _d(c.get("committed_amount"))
            paid = _d(c.get("paid_amount"))
            if paid >= committed:
                continue
            due = date.fromisoformat(str(c["due_date"])) if c.get("due_date") else None
            st = gs.commitment_derived_status(committed, paid, due, today=today)
            pending_rows.append(
                {
                    "commitment_id": c["commitment_id"],
                    "group_id": gid,
                    "group_title": g.get("title") or "",
                    "participant_id": c["participant_id"],
                    "display_name": pmap.get(str(c["participant_id"]), {}).get("display_name", ""),
                    "committed_amount": c.get("committed_amount"),
                    "paid_amount": c.get("paid_amount"),
                    "due_date": c.get("due_date"),
                    "status": st,
                }
            )
    return pending_rows


def compute_people_needing_nudges(sb: Client, user_id: str) -> list[dict[str, Any]]:
    rows = _pending_commitment_rows(sb, user_id)
    today = date.today()
    out: list[dict[str, Any]] = []
    for r in rows:
        committed = _d(r["committed_amount"])
        paid = _d(r["paid_amount"])
        rem = committed - paid
        due = date.fromisoformat(str(r["due_date"])) if r.get("due_date") else None
        overdue_days = max((today - due).days, 0) if due and due < today else 0
        gid = str(r["group_id"])
        ac = _active_cycle(sb, gid)
        clabel = str(ac["label"]) if ac else None
        out.append(
            {
                **r,
                "amount_remaining": rem,
                "overdue_days": overdue_days,
                "cycle_label": clabel,
                "recommended_action_type": "SEND_REMINDER" if overdue_days else "NUDGE_PAYMENT",
                "recommended_cta": "Open group to remind or record payment",
            }
        )
    out.sort(key=lambda x: (x["overdue_days"], float(x["amount_remaining"])), reverse=True)
    return out[:30]


def generate_group_recommendations(sb: Client, user_id: str) -> list[dict[str, Any]]:
    nudges = compute_people_needing_nudges(sb, user_id)
    recs: list[dict[str, Any]] = []
    aid = 0

    for n in nudges[:4]:
        aid += 1
        rem = _money_in(_d(n["amount_remaining"]))
        due_s = ""
        if n.get("due_date"):
            due_s = f"Due {n['due_date']}."
        elif n.get("overdue_days", 0) > 0:
            due_s = f"Overdue {n['overdue_days']}d."
        recs.append(
            {
                "recommendation_id": None,
                "group_id": n["group_id"],
                "group_title": n["group_title"],
                "cycle_id": None,
                "recommendation_type": "SEND_REMINDER",
                "priority": 1 if n.get("overdue_days", 0) > 0 else 2,
                "title": f"Remind {n['display_name']} about {rem} pending",
                "message": f"{n['group_title']}. {due_s}".strip(),
                "action_type": "SEND_REMINDER",
                "action_target_type": "PARTICIPANT",
                "action_target_id": str(n["participant_id"]),
                "created_at": None,
            }
        )

    groups = [g for g in gs.list_groups_for_user(sb, user_id) if str(g.get("status")) == "active"]
    start, _ = _utc_day_bounds()
    for g in groups[:15]:
        gid = str(g["group_id"])
        try:
            gs.assert_member(sb, user_id, gid)
        except PermissionError:
            continue
        acts = (
            sb.table("group_activity")
            .select("event_type,message,created_at")
            .eq("group_id", gid)
            .gte("created_at", start.isoformat())
            .execute()
            .data
            or []
        )
        for a in acts:
            if str(a.get("event_type")) == "expense_added" and len(recs) < 6:
                recs.append(
                    {
                        "recommendation_id": None,
                        "group_id": gid,
                        "group_title": g.get("title"),
                        "cycle_id": None,
                        "recommendation_type": "REVIEW_EXPENSE",
                        "priority": 2,
                        "title": "Review a new expense",
                        "message": str(a.get("message") or "")[:200],
                        "action_type": "OPEN_GROUP",
                        "action_target_type": "GROUP",
                        "action_target_id": None,
                        "created_at": None,
                    }
                )
                break

    ob = Decimal("0")
    for n in nudges:
        ob += _d(n.get("amount_remaining"))
    if ob > Decimal("0.01") and len(recs) < 6:
        gid = str(nudges[0]["group_id"]) if nudges else None
        if gid:
            recs.append(
                {
                    "recommendation_id": None,
                    "group_id": gid,
                    "group_title": nudges[0].get("group_title"),
                    "cycle_id": None,
                    "recommendation_type": "SETTLE_BALANCE",
                    "priority": 2,
                    "title": f"Track {_money_in(ob)} still open",
                    "message": "Record payments or settle shares inside each group.",
                    "action_type": "OPEN_GROUP",
                    "action_target_type": "GROUP",
                    "action_target_id": None,
                    "created_at": None,
                }
            )

    recs.sort(key=lambda r: r.get("priority", 3))
    return recs[:5]


def compute_group_home_summary(sb: Client, user_id: str) -> dict[str, Any]:
    groups = [g for g in gs.list_groups_for_user(sb, user_id) if str(g.get("status")) == "active"]
    pooled = Decimal("0")
    for g in groups:
        t = g.get("target_amount")
        if t is not None and t != "":
            v = _d(t)
            if v > 0:
                pooled += v
    pending_count = 0
    overdue_count = 0
    open_bal = Decimal("0")
    debt_total = Decimal("0")
    attention = 0
    for g in groups:
        gid = str(g["group_id"])
        try:
            gs.assert_member(sb, user_id, gid)
        except PermissionError:
            continue
        s = gs.calculate_group_summary(sb, gid)
        pending_count += int(s["pending_commitment_count"])
        overdue_count += int(s["overdue_commitment_count"])
        debt_total += _d(s["open_share_debt"])
        pr = _pending_commitment_rows_for_group(sb, gid)
        for row in pr:
            open_bal += _d(row["committed_amount"]) - _d(row["paid_amount"])
        if int(s["pending_commitment_count"]) > 0 or int(s["overdue_commitment_count"]) > 0:
            attention += 1

    line_parts = []
    if attention == 1:
        line_parts.append("1 active group needs attention")
    elif attention > 1:
        line_parts.append(f"{attention} active groups need attention")
    else:
        line_parts.append("Groups look coordinated")
    if open_bal > Decimal("0.01"):
        line_parts.append(f"{_money_in(open_bal)} open in commitments")
    else:
        line_parts.append("no open commitment balance")

    return {
        "active_group_count": len(groups),
        "pooled_target_sum": pooled if pooled > 0 else None,
        "pending_commitment_count": pending_count,
        "overdue_commitment_count": overdue_count,
        "open_commitment_balance": open_bal,
        "open_share_debt_total": debt_total,
        "supporting_line": " · ".join(line_parts),
    }


def _pending_commitment_rows_for_group(sb: Client, group_id: str) -> list[dict[str, Any]]:
    coms = sb.table("group_commitments").select("*").eq("group_id", group_id).execute().data or []
    out = []
    today = date.today()
    for c in coms:
        committed = _d(c.get("committed_amount"))
        paid = _d(c.get("paid_amount"))
        if paid >= committed:
            continue
        due = date.fromisoformat(str(c["due_date"])) if c.get("due_date") else None
        st = gs.commitment_derived_status(committed, paid, due, today=today)
        out.append(
            {
                "committed_amount": c.get("committed_amount"),
                "paid_amount": c.get("paid_amount"),
                "status": st,
            }
        )
    return out


def compute_group_health_rows(sb: Client, user_id: str) -> list[dict[str, Any]]:
    groups = [g for g in gs.list_groups_for_user(sb, user_id) if str(g.get("status")) == "active"]
    out: list[dict[str, Any]] = []
    for g in groups:
        gid = str(g["group_id"])
        try:
            gs.assert_member(sb, user_id, gid)
        except PermissionError:
            continue
        summary = gs.calculate_group_summary(sb, gid)
        pend = int(summary["pending_commitment_count"])
        ovd = int(summary["overdue_commitment_count"])
        debt = _d(summary["open_share_debt"])
        pr = _pending_commitment_rows_for_group(sb, gid)
        open_c = sum(_d(x["committed_amount"]) - _d(x["paid_amount"]) for x in pr)
        cycle = _active_cycle(sb, gid)
        target = _d(cycle.get("target_amount")) if cycle else Decimal("0")
        coll = _d(cycle.get("collected_amount")) if cycle else Decimal("0")
        fr: float | None = None
        if cycle and target > Decimal("0.01"):
            fr = float(coll / target)
        health = compute_group_health_state(
            pending_count=pend,
            overdue_count=ovd,
            open_commitment_balance=open_c,
            open_share_debt=debt,
            funding_ratio=fr,
        )
        if ovd > 0:
            story = f"{ovd} overdue — coordinate payments soon."
        elif pend > 0:
            story = f"{pend} commitment{'s' if pend != 1 else ''} still pending."
        elif debt > Decimal("0.01"):
            story = f"{_money_in(debt)} open on expense shares."
        else:
            story = "All tracked commitments are in good shape."
        out.append(
            {
                "group_id": gid,
                "title": g.get("title") or "",
                "group_type": g.get("group_type") or "",
                "duration_type": g.get("duration_type") or "",
                "funding_model": g.get("funding_model") or "",
                "cycle_id": str(cycle["cycle_id"]) if cycle else None,
                "cycle_label": str(cycle["label"]) if cycle else None,
                "health_state": health,
                "pending_count": pend,
                "overdue_count": ovd,
                "open_commitment_balance": open_c,
                "open_share_debt": debt,
                "funding_pct": round(fr * 100, 1) if fr is not None else None,
                "story": story,
            }
        )
    return out


def compute_recent_group_movement(sb: Client, user_id: str, limit: int = 40) -> list[dict[str, Any]]:
    groups = [g for g in gs.list_groups_for_user(sb, user_id) if str(g.get("status")) == "active"]
    gids = []
    title_map: dict[str, str] = {}
    for g in groups:
        gid = str(g["group_id"])
        try:
            gs.assert_member(sb, user_id, gid)
        except PermissionError:
            continue
        gids.append(gid)
        title_map[gid] = str(g.get("title") or "")
    merged: list[dict[str, Any]] = []
    start, end = _utc_day_bounds()
    for gid in gids[:25]:
        a = (
            sb.table("group_activity")
            .select("*")
            .eq("group_id", gid)
            .order("created_at", desc=True)
            .limit(12)
            .execute()
            .data
            or []
        )
        for row in a:
            ca = row.get("created_at")
            is_today = False
            if ca:
                try:
                    dt = datetime.fromisoformat(str(ca).replace("Z", "+00:00"))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    is_today = start <= dt < end
                except ValueError:
                    pass
            merged.append({**row, "group_title": title_map.get(gid), "is_today_utc": is_today})
    merged.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return merged[:limit]


def compute_home_today(sb: Client, user_id: str) -> dict[str, Any]:
    start, end = _utc_day_bounds()
    week_from = _week_start()
    groups = [g for g in gs.list_groups_for_user(sb, user_id) if str(g.get("status")) == "active"]
    gids: list[str] = []
    titles: dict[str, str] = {}
    for g in groups:
        gid = str(g["group_id"])
        try:
            gs.assert_member(sb, user_id, gid)
        except PermissionError:
            continue
        gids.append(gid)
        titles[gid] = str(g.get("title") or "")

    pay_n = rem_n = exp_n = grp_n = 0
    week_count: dict[str, int] = defaultdict(int)
    for gid in gids[:30]:
        for row in (
            sb.table("group_activity")
            .select("event_type,created_at")
            .eq("group_id", gid)
            .gte("created_at", start.isoformat())
            .execute()
            .data
            or []
        ):
            et = str(row.get("event_type"))
            if et == "payment_recorded":
                pay_n += 1
            elif et == "reminder_queued":
                rem_n += 1
            elif et == "expense_added":
                exp_n += 1
            elif et == "group_created":
                grp_n += 1
        for row in (
            sb.table("group_activity")
            .select("event_type")
            .eq("group_id", gid)
            .gte("created_at", week_from.isoformat())
            .execute()
            .data
            or []
        ):
            week_count[gid] += 1

    prev_week_from = week_from - timedelta(days=7)
    prev_week_total = 0
    for gid in gids[:30]:
        prev_week_total += len(
            sb.table("group_activity")
            .select("activity_id")
            .eq("group_id", gid)
            .gte("created_at", prev_week_from.isoformat())
            .lt("created_at", week_from.isoformat())
            .execute()
            .data
            or []
        )

    most_gid: str | None = None
    if week_count:
        most_gid = max(week_count.keys(), key=lambda k: week_count[k])

    nudges = compute_people_needing_nudges(sb, user_id)
    signals = generate_group_signals(sb, user_id)
    cards: list[dict[str, Any]] = []

    if nudges and nudges[0].get("overdue_days", 0) > 0:
        n0 = nudges[0]
        cards.append(
            {
                "id": "overdue-top",
                "headline": f"{n0['display_name']} is overdue on {_money_in(_d(n0['committed_amount']) - _d(n0['paid_amount']))}",
                "severity": "high",
                "cta_label": "Open group",
                "group_id": str(n0["group_id"]),
                "href_hint": f"/group/{n0['group_id']}",
            }
        )
    open_total = sum(_d(n.get("amount_remaining")) for n in nudges)
    if open_total > Decimal("0.01") and len(cards) < 3:
        cards.append(
            {
                "id": "open-balance",
                "headline": f"{_money_in(open_total)} still open across your groups",
                "severity": "medium",
                "cta_label": "See commitments",
                "group_id": str(nudges[0]["group_id"]) if nudges else None,
                "href_hint": f"/group/{nudges[0]['group_id']}" if nudges else None,
            }
        )
    for a in compute_recent_group_movement(sb, user_id, limit=8):
        if a.get("is_today_utc") and str(a.get("event_type")) == "expense_added" and len(cards) < 3:
            cards.append(
                {
                    "id": f"exp-{a.get('activity_id')}",
                    "headline": str(a.get("message") or "New expense recorded today"),
                    "severity": "low",
                    "cta_label": "Review",
                    "group_id": str(a.get("group_id")),
                    "href_hint": f"/group/{a.get('group_id')}",
                }
            )
            break
    if signals and len(cards) < 3:
        s0 = signals[0]
        cards.append(
            {
                "id": f"sig-{s0.get('signal_id') or 'x'}",
                "headline": str(s0.get("title") or s0.get("message")),
                "severity": "high" if s0.get("severity") == "HIGH" else "medium" if s0.get("severity") == "MEDIUM" else "low",
                "cta_label": "Open group",
                "group_id": str(s0.get("group_id")),
                "href_hint": f"/group/{s0.get('group_id')}",
            }
        )
    if not cards:
        cards.append(
            {
                "id": "calm",
                "headline": "No urgent issues — your groups look stable today" if gids else "Create a group to start coordinating",
                "severity": "calm",
                "cta_label": "Browse groups" if gids else "New group",
                "group_id": str(gids[0]) if gids else None,
                "href_hint": f"/group/{gids[0]}" if gids else "/group/new",
            }
        )

    cur_week = sum(week_count.values())
    delta = cur_week - prev_week_total if prev_week_total else None

    needs = bool(nudges) or any(s.get("severity") == "HIGH" for s in signals)
    daily_status = "needs_attention" if needs else "quiet" if cur_week == 0 and pay_n + exp_n == 0 else "stable"
    if daily_status == "needs_attention":
        label = "Someone needs a nudge or payment recorded"
    elif daily_status == "quiet":
        label = "Quiet day — check in tomorrow"
    else:
        label = "Steady coordination"

    return {
        "daily_status": daily_status,
        "daily_status_label": label,
        "top_cards": cards[:3],
        "payments_today_count": pay_n,
        "reminders_today_count": rem_n,
        "new_expenses_today_count": exp_n,
        "new_groups_today_count": grp_n,
        "week_activity_delta": delta,
        "most_active_group_id": UUID(most_gid) if most_gid else None,
        "most_active_group_title": titles.get(most_gid) if most_gid else None,
    }


def compute_cycle_status(sb: Client, user_id: str, group_id: str) -> dict[str, Any]:
    gs.assert_member(sb, user_id, group_id)
    g = gs._fetch_group(sb, group_id)
    if not g:
        raise ValueError("group_not_found")
    today = date.today()
    cycles = (
        sb.table("group_cycles")
        .select("*")
        .eq("group_id", group_id)
        .order("start_date", desc=True)
        .execute()
        .data
        or []
    )
    active = next((c for c in cycles if str(c.get("status")) == "active"), None)
    closed = sorted(
        [c for c in cycles if str(c.get("status")) == "closed"],
        key=lambda c: str(c.get("end_date") or ""),
        reverse=True,
    )
    carry: Decimal | None = None
    if closed:
        last = closed[0]
        tgt = _d(last.get("target_amount"))
        coll = _d(last.get("collected_amount"))
        if coll > tgt + Decimal("0.01"):
            carry = coll - tgt

    unsettled = compute_open_settlement_balance(sb, group_id, str(active["cycle_id"]) if active else None)

    current_id = str(active["cycle_id"]) if active else None
    label = str(active["label"]) if active else None
    c_start = date.fromisoformat(str(active["start_date"])) if active else None
    c_end = date.fromisoformat(str(active["end_date"])) if active else None
    days_rem = (c_end - today).days if c_end else None
    target = _d(active.get("target_amount")) if active else None
    collected = _d(active.get("collected_amount")) if active else None
    fpct = float(collected / target * 100) if active and target and target > 0 else None

    next_hint = None
    next_days = None
    if c_end and str(g.get("duration_type")) == "ongoing" and str(g.get("cycle_type")) == "monthly":
        nxt = c_end + timedelta(days=1)
        last_d = calendar.monthrange(nxt.year, nxt.month)[1]
        nxt_end = date(nxt.year, nxt.month, last_d)
        next_days = max((nxt - today).days, 0)
        next_hint = f"Next monthly cycle from {nxt.isoformat()} to {nxt_end.isoformat()}"

    return {
        "group_id": UUID(group_id),
        "current_cycle_id": UUID(current_id) if current_id else None,
        "current_cycle_label": label,
        "cycle_start": c_start,
        "cycle_end": c_end,
        "days_remaining": days_rem,
        "target_amount": target,
        "collected_amount": collected,
        "funding_pct": round(fpct, 1) if fpct is not None else None,
        "next_cycle_starts_in_days": next_days,
        "next_cycle_hint": next_hint,
        "carry_over_amount": carry,
        "unsettled_expense_balance": unsettled,
    }


def persist_daily_snapshots(sb: Client, user_id: str, *, date_key: date | None = None) -> int:
    """Hook for writing ``group_summary_snapshots`` when you enable scheduled jobs (V1 returns 0)."""
    _ = (sb, user_id, date_key)
    return 0
