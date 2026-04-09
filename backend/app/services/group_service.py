from __future__ import annotations

import calendar
import json
import secrets
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from postgrest.exceptions import APIError
from supabase import Client

from app.config import get_settings
from app.schemas.group import (
    GroupCommitmentsBulkCreate,
    GroupExpenseCreate,
    GroupMomentCreate,
    GroupMomentUpdate,
    GroupParticipantCreate,
    GroupParticipantUpdate,
    GroupInviteSendBody,
    GroupRecurringExpenseCreate,
    GroupRecurringExpenseUpdate,
    GroupReminderCreate,
    GroupSettlementCreate,
    PayCommitmentBody,
)


def _d(x: Any) -> Decimal:
    if x is None:
        return Decimal("0")
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def _f(x: Decimal | float | int | None) -> float:
    if x is None:
        return 0.0
    if isinstance(x, Decimal):
        return float(x)
    return float(x)


def _month_bounds(d: date) -> tuple[date, date]:
    last = calendar.monthrange(d.year, d.month)[1]
    return date(d.year, d.month, 1), date(d.year, d.month, last)


def _type_defaults(group_type: str) -> dict[str, str]:
    t = (group_type or "").strip().lower()
    if t in ("trip", "event"):
        return {
            "duration_type": "one_time",
            "funding_model": "pooled",
            "cycle_type": "none",
            "split_rule_type": "equal",
        }
    if t == "roommates":
        return {
            "duration_type": "ongoing",
            "funding_model": "split_expenses",
            "cycle_type": "monthly",
            "split_rule_type": "equal",
        }
    if t in ("family", "couple"):
        return {
            "duration_type": "ongoing",
            "funding_model": "pooled",
            "cycle_type": "monthly",
            "split_rule_type": "equal",
        }
    return {
        "duration_type": "one_time",
        "funding_model": "hybrid",
        "cycle_type": "none",
        "split_rule_type": "equal",
    }


def _merge_create_fields(body: GroupMomentCreate) -> dict[str, Any]:
    defaults = _type_defaults(body.group_type)
    duration = body.duration_type or defaults["duration_type"]
    cycle_t = body.cycle_type or defaults["cycle_type"]
    funding = body.funding_model or defaults["funding_model"]
    split_t = body.split_rule_type or defaults["split_rule_type"]
    return {
        "title": body.title.strip(),
        "group_type": body.group_type,
        "duration_type": duration,
        "cycle_type": cycle_t,
        "funding_model": funding,
        "split_rule_type": split_t,
        "target_amount": _f(body.target_amount) if body.target_amount is not None else None,
        "start_date": str(body.start_date) if body.start_date else None,
        "end_date": str(body.end_date) if body.end_date else None,
        "description": body.description,
        "status": body.status or "active",
    }


def _fetch_group(sb: Client, group_id: str) -> dict[str, Any] | None:
    try:
        r = sb.table("group_moments").select("*").eq("group_id", group_id).maybe_single().execute()
        return r.data
    except APIError:
        return None


def _active_participants(sb: Client, group_id: str) -> list[dict[str, Any]]:
    r = (
        sb.table("group_participants")
        .select("*")
        .eq("group_id", group_id)
        .eq("status", "active")
        .execute()
    )
    return list(r.data or [])


def _participant_map(sb: Client, group_id: str) -> dict[str, dict[str, Any]]:
    return {str(p["participant_id"]): p for p in _active_participants(sb, group_id)}


def assert_member(sb: Client, user_id: str, group_id: str) -> dict[str, Any]:
    if _fetch_group(sb, group_id) is None:
        raise ValueError("group_not_found")
    r = (
        sb.table("group_participants")
        .select("*")
        .eq("group_id", group_id)
        .eq("user_id", user_id)
        .eq("status", "active")
        .maybe_single()
        .execute()
    )
    if not r.data:
        raise PermissionError("not_a_member")
    return r.data


def assert_admin_group(sb: Client, user_id: str, group_id: str) -> dict[str, Any]:
    m = assert_member(sb, user_id, group_id)
    if str(m.get("role")) != "admin":
        raise PermissionError("admin_only")
    return m


def _participants_for_detail(sb: Client, group_id: str) -> list[dict[str, Any]]:
    r = (
        sb.table("group_participants")
        .select("*")
        .eq("group_id", group_id)
        .in_("status", ["active", "invited"])
        .order("created_at")
        .execute()
    )
    return list(r.data or [])


def _invite_join_url(token: str) -> str:
    base = get_settings().app_public_url.rstrip("/")
    return f"{base}/group/join?token={token}"


def log_activity(
    sb: Client,
    group_id: str,
    *,
    event_type: str,
    message: str,
    actor_id: str | None = None,
    cycle_id: str | None = None,
) -> None:
    row: dict[str, Any] = {
        "group_id": group_id,
        "event_type": event_type,
        "message": message,
    }
    if actor_id:
        row["actor_id"] = actor_id
    if cycle_id:
        row["cycle_id"] = cycle_id
    sb.table("group_activity").insert(row).execute()


def commitment_derived_status(
    committed: Decimal,
    paid: Decimal,
    due: date | None,
    *,
    today: date | None = None,
) -> str:
    today = today or date.today()
    if paid >= committed:
        return "fulfilled"
    if due is not None and due < today and paid < committed:
        return "overdue"
    if paid > 0:
        return "partial"
    return "pending"


def sync_cycle_collected(sb: Client, cycle_id: str) -> None:
    r = (
        sb.table("group_commitments")
        .select("paid_amount")
        .eq("cycle_id", cycle_id)
        .execute()
    )
    total = sum(_f(row.get("paid_amount")) for row in (r.data or []))
    sb.table("group_cycles").update({"collected_amount": total}).eq("cycle_id", cycle_id).execute()


def calculate_group_summary(sb: Client, group_id: str) -> dict[str, Any]:
    group = _fetch_group(sb, group_id)
    if not group:
        raise ValueError("group_not_found")

    commitments = (
        sb.table("group_commitments").select("*").eq("group_id", group_id).execute().data or []
    )
    pending = sum(1 for c in commitments if str(c.get("status")) in ("pending", "partial"))
    overdue = sum(1 for c in commitments if str(c.get("status")) == "overdue")

    target: Decimal | None = None
    collected = Decimal("0")
    if str(group.get("duration_type")) == "ongoing":
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
        if cycles:
            cy = cycles[0]
            target = _d(cy.get("target_amount"))
            collected = _d(cy.get("collected_amount"))
        else:
            target = _d(group.get("target_amount")) if group.get("target_amount") is not None else None
    else:
        target = _d(group.get("target_amount")) if group.get("target_amount") is not None else None
        collected = sum(_d(c.get("paid_amount")) for c in commitments)

    ex_rows = (
        sb.table("group_expenses").select("expense_id").eq("group_id", group_id).execute().data or []
    )
    expense_ids = [str(e["expense_id"]) for e in ex_rows]
    open_debt = Decimal("0")
    if expense_ids:
        shares = (
            sb.table("group_expense_shares")
            .select("owed_amount,settled_amount,expense_id")
            .in_("expense_id", expense_ids)
            .execute()
            .data
            or []
        )
        for s in shares:
            open_debt += _d(s.get("owed_amount")) - _d(s.get("settled_amount"))

    return {
        "collected_amount": collected,
        "target_amount": target,
        "pending_commitment_count": pending,
        "overdue_commitment_count": overdue,
        "open_share_debt": open_debt,
    }


def _detail_payload(sb: Client, group_id: str) -> dict[str, Any]:
    g = _fetch_group(sb, group_id)
    if not g:
        raise ValueError("group_not_found")
    summary = calculate_group_summary(sb, group_id)
    parts = _participants_for_detail(sb, group_id)
    cycles = (
        sb.table("group_cycles")
        .select("*")
        .eq("group_id", group_id)
        .order("start_date", desc=True)
        .execute()
        .data
        or []
    )
    active_cycle = None
    for c in cycles:
        if str(c.get("status")) == "active":
            active_cycle = c
            break
    return {**g, "summary": summary, "participants": parts, "cycles": cycles, "active_cycle": active_cycle}


def create_group_moment(sb: Client, creator_id: str, body: GroupMomentCreate) -> dict[str, Any]:
    row = _merge_create_fields(body)
    row["created_by"] = creator_id
    ins = sb.table("group_moments").insert(row).execute()
    data = ins.data
    if not data:
        raise RuntimeError("insert_failed")
    group_id = str(data[0]["group_id"])

    creator_name = "You"
    try:
        prof = (
            sb.table("profiles")
            .select("display_name")
            .eq("id", creator_id)
            .maybe_single()
            .execute()
        )
        if prof.data and prof.data.get("display_name"):
            creator_name = str(prof.data["display_name"])
    except APIError:
        pass

    sb.table("group_participants").insert(
        {
            "group_id": group_id,
            "user_id": creator_id,
            "display_name": creator_name,
            "role": "admin",
            "status": "active",
            "joined_at": date.today().isoformat(),
        }
    ).execute()

    for p in body.participants:
        uid = (p.user_id or "").strip() or None
        if uid == creator_id:
            continue
        inv_em = (p.invite_email or "").strip() or None
        sb.table("group_participants").insert(
            {
                "group_id": group_id,
                "user_id": uid,
                "display_name": p.display_name.strip(),
                "role": p.role or "member",
                "status": "active" if uid else "invited",
                "joined_at": date.today().isoformat() if uid else None,
                "invite_email": inv_em,
                "invite_token": None,
                "invite_sent_at": None,
            }
        ).execute()

    g = _fetch_group(sb, group_id)
    if g and str(g.get("duration_type")) == "ongoing" and str(g.get("cycle_type")) != "none":
        start, end = _month_bounds(date.today())
        label = start.strftime("%B %Y")
        tar = _f(g.get("target_amount")) if g.get("target_amount") is not None else 0.0
        cyc = (
            sb.table("group_cycles")
            .insert(
                {
                    "group_id": group_id,
                    "label": label,
                    "start_date": str(start),
                    "end_date": str(end),
                    "target_amount": tar,
                    "status": "active",
                }
            )
            .execute()
        )
        if cyc.data and g.get("funding_model") == "pooled" and g.get("target_amount"):
            _seed_equal_commitments(sb, group_id, str(cyc.data[0]["cycle_id"]), _d(g["target_amount"]))

    g2 = _fetch_group(sb, group_id)
    if (
        g2
        and str(g2.get("duration_type")) == "one_time"
        and g2.get("funding_model") == "pooled"
        and g2.get("target_amount")
    ):
        _seed_equal_commitments(sb, group_id, None, _d(g2["target_amount"]))

    log_activity(sb, group_id, event_type="group_created", message=f"Group «{row['title']}» created", actor_id=creator_id)
    refresh_group_signals(sb, group_id)
    return _detail_payload(sb, group_id)


def _seed_equal_commitments(sb: Client, group_id: str, cycle_id: str | None, total: Decimal) -> None:
    parts = _active_participants(sb, group_id)
    if not parts or total <= 0:
        return
    n = len(parts)
    base = (total / n).quantize(Decimal("0.01"))
    remainder = total - base * n
    for i, p in enumerate(parts):
        amt = base + (remainder if i == 0 else Decimal("0"))
        due = date.today() + timedelta(days=7)
        row_ins: dict[str, Any] = {
            "group_id": group_id,
            "participant_id": str(p["participant_id"]),
            "committed_amount": _f(amt),
            "paid_amount": 0.0,
            "due_date": str(due),
            "status": "pending",
        }
        if cycle_id:
            row_ins["cycle_id"] = cycle_id
        ins = sb.table("group_commitments").insert(row_ins).execute()
        if ins.data:
            log_activity(
                sb,
                group_id,
                event_type="commitment_created",
                message=f"Commitment created for {p.get('display_name')}",
                cycle_id=cycle_id,
            )


def list_groups_for_user(sb: Client, user_id: str) -> list[dict[str, Any]]:
    pr = (
        sb.table("group_participants")
        .select("group_id")
        .eq("user_id", user_id)
        .eq("status", "active")
        .execute()
    )
    ids = [str(x["group_id"]) for x in (pr.data or [])]
    if not ids:
        return []
    r = sb.table("group_moments").select("*").in_("group_id", ids).order("updated_at", desc=True).execute()
    return list(r.data or [])


def get_group_detail(sb: Client, user_id: str, group_id: str) -> dict[str, Any]:
    assert_member(sb, user_id, group_id)
    return _detail_payload(sb, group_id)


def update_group(sb: Client, user_id: str, group_id: str, body: GroupMomentUpdate) -> dict[str, Any]:
    m = assert_member(sb, user_id, group_id)
    if str(m.get("role")) != "admin":
        raise PermissionError("admin_only")
    raw = body.model_dump(exclude_unset=True)
    patch: dict[str, Any] = {}
    for k, v in raw.items():
        if k in ("target_amount",) and v is not None:
            patch[k] = _f(v)
        elif k in ("start_date", "end_date") and v is not None:
            patch[k] = str(v)
        elif v is not None:
            patch[k] = v
    if patch:
        sb.table("group_moments").update(patch).eq("group_id", group_id).execute()
        log_activity(sb, group_id, event_type="group_updated", message="Group details updated", actor_id=user_id)
    refresh_group_signals(sb, group_id)
    return _detail_payload(sb, group_id)


def archive_group(sb: Client, user_id: str, group_id: str) -> None:
    m = assert_member(sb, user_id, group_id)
    if str(m.get("role")) != "admin":
        raise PermissionError("admin_only")
    sb.table("group_moments").update({"status": "archived"}).eq("group_id", group_id).execute()
    log_activity(sb, group_id, event_type="group_archived", message="Group archived", actor_id=user_id)


def add_participant(sb: Client, user_id: str, group_id: str, body: GroupParticipantCreate) -> dict[str, Any]:
    assert_member(sb, user_id, group_id)
    uid = (body.user_id or "").strip() or None
    inv_em = (body.invite_email or "").strip() or None
    row = {
        "group_id": group_id,
        "user_id": uid,
        "display_name": body.display_name.strip(),
        "role": body.role or "member",
        "status": "active" if uid else "invited",
        "joined_at": date.today().isoformat() if uid else None,
        "invite_email": inv_em,
        "invite_token": None,
        "invite_sent_at": None,
    }
    r = sb.table("group_participants").insert(row).execute()
    if not r.data:
        raise RuntimeError("insert_failed")
    log_activity(
        sb,
        group_id,
        event_type="participant_added",
        message=f"Added participant {body.display_name}",
        actor_id=user_id,
    )
    return r.data[0]


def update_participant(
    sb: Client, user_id: str, group_id: str, participant_id: str, body: GroupParticipantUpdate
) -> dict[str, Any]:
    assert_member(sb, user_id, group_id)
    raw = body.model_dump(exclude_unset=True)
    if "invite_email" in raw:
        assert_admin_group(sb, user_id, group_id)
    if not raw:
        r = (
            sb.table("group_participants")
            .select("*")
            .eq("participant_id", participant_id)
            .eq("group_id", group_id)
            .maybe_single()
            .execute()
        )
        if not r.data:
            raise ValueError("participant_not_found")
        return r.data
    sb.table("group_participants").update(raw).eq("participant_id", participant_id).eq("group_id", group_id).execute()
    r2 = (
        sb.table("group_participants")
        .select("*")
        .eq("participant_id", participant_id)
        .maybe_single()
        .execute()
    )
    if not r2.data:
        raise ValueError("participant_not_found")
    return r2.data


def remove_participant(sb: Client, user_id: str, group_id: str, participant_id: str) -> None:
    actor = assert_member(sb, user_id, group_id)
    target = (
        sb.table("group_participants")
        .select("*")
        .eq("participant_id", participant_id)
        .eq("group_id", group_id)
        .maybe_single()
        .execute()
    )
    if not target.data:
        raise ValueError("participant_not_found")
    if str(target.data.get("role")) == "admin":
        others = (
            sb.table("group_participants")
            .select("participant_id")
            .eq("group_id", group_id)
            .eq("role", "admin")
            .eq("status", "active")
            .execute()
            .data
            or []
        )
        if len(others) <= 1:
            raise ValueError("last_admin")
    if str(actor.get("role")) != "admin" and str(target.data.get("user_id")) != user_id:
        raise PermissionError("admin_or_self")
    sb.table("group_participants").update({"status": "removed"}).eq("participant_id", participant_id).execute()
    log_activity(sb, group_id, event_type="participant_removed", message="Participant removed", actor_id=user_id)


def send_participant_invite(
    sb: Client,
    user_id: str,
    group_id: str,
    participant_id: str,
    body: GroupInviteSendBody | None,
) -> dict[str, Any]:
    assert_admin_group(sb, user_id, group_id)
    r = (
        sb.table("group_participants")
        .select("*")
        .eq("participant_id", participant_id)
        .eq("group_id", group_id)
        .maybe_single()
        .execute()
    )
    if not r.data:
        raise ValueError("participant_not_found")
    p = r.data
    if str(p.get("status")) != "invited" or p.get("user_id"):
        raise ValueError("invalid_invite_target")

    patch: dict[str, Any] = {}
    if body is not None:
        data = body.model_dump(exclude_unset=True)
        if "invite_email" in data:
            v = data["invite_email"]
            patch["invite_email"] = (v or "").strip() or None

    token = (str(p.get("invite_token") or "").strip() or None) or secrets.token_urlsafe(32)
    patch["invite_token"] = token

    sb.table("group_participants").update(patch).eq("participant_id", participant_id).eq("group_id", group_id).execute()

    r2 = (
        sb.table("group_participants")
        .select("*")
        .eq("participant_id", participant_id)
        .maybe_single()
        .execute()
    )
    if not r2.data:
        raise ValueError("participant_not_found")
    p2 = r2.data
    final_email = (str(p2.get("invite_email") or "").strip() or None)
    join_url = _invite_join_url(token)
    settings = get_settings()
    email_sent = False
    message: str | None = None

    if final_email and settings.resend_api_key.strip():
        from app.services.email_invites import send_group_invite_email

        g = _fetch_group(sb, group_id)
        title = str(g.get("title") or "Group") if g else "Group"
        try:
            send_group_invite_email(
                to_email=final_email,
                join_url=join_url,
                group_title=title,
                invitee_display_name=str(p2.get("display_name") or "there"),
            )
        except RuntimeError as exc:
            raise ValueError("email_send_failed") from exc
        sent_at = datetime.now(timezone.utc).isoformat()
        sb.table("group_participants").update({"invite_sent_at": sent_at}).eq(
            "participant_id", participant_id
        ).execute()
        email_sent = True
    elif final_email:
        message = (
            "Email delivery is not configured (set MOMENTRA_RESEND_API_KEY or RESEND_API_KEY); "
            "share the link manually."
        )

    return {"join_url": join_url, "email_sent": email_sent, "message": message}


def preview_invite_by_token(sb: Client, token: str) -> dict[str, Any]:
    t = (token or "").strip()
    if len(t) < 8:
        raise ValueError("invalid_token")
    r = sb.table("group_participants").select("*").eq("invite_token", t).maybe_single().execute()
    if not r.data:
        raise ValueError("invite_not_found")
    p = r.data
    if str(p.get("status")) != "invited" or p.get("user_id"):
        raise ValueError("invite_not_found")
    g = _fetch_group(sb, str(p["group_id"]))
    if not g:
        raise ValueError("invite_not_found")
    return {
        "group_id": str(p["group_id"]),
        "group_title": str(g.get("title") or "Group"),
        "display_name": str(p.get("display_name") or ""),
    }


def accept_group_invite(sb: Client, user_id: str, user_email: str | None, token: str) -> dict[str, Any]:
    t = (token or "").strip()
    if len(t) < 8:
        raise ValueError("invalid_token")
    r = sb.table("group_participants").select("*").eq("invite_token", t).maybe_single().execute()
    if not r.data:
        raise ValueError("invite_not_found")
    p = r.data
    if str(p.get("status")) != "invited" or p.get("user_id"):
        raise ValueError("invite_not_found")

    inv_mail = (str(p.get("invite_email") or "").strip().lower() or None)
    if inv_mail:
        ue = (user_email or "").strip().lower() if user_email else None
        if not ue:
            raise ValueError("email_required_for_invite")
        if ue != inv_mail:
            raise ValueError("email_mismatch")

    gid = str(p["group_id"])
    pid = str(p["participant_id"])

    dup = (
        sb.table("group_participants")
        .select("participant_id")
        .eq("group_id", gid)
        .eq("user_id", user_id)
        .eq("status", "active")
        .maybe_single()
        .execute()
    )
    if dup.data and str(dup.data.get("participant_id")) != pid:
        raise ValueError("already_member")

    sb.table("group_participants").update(
        {
            "user_id": user_id,
            "status": "active",
            "joined_at": date.today().isoformat(),
            "invite_token": None,
            "invite_email": None,
            "invite_sent_at": None,
        }
    ).eq("participant_id", pid).eq("group_id", gid).execute()

    log_activity(
        sb,
        gid,
        event_type="participant_joined",
        message=f"{p.get('display_name') or 'Member'} joined via invite",
        actor_id=user_id,
    )
    refresh_group_signals(sb, gid)
    return {"group_id": gid}


def list_cycles(sb: Client, user_id: str, group_id: str) -> list[dict[str, Any]]:
    assert_member(sb, user_id, group_id)
    r = (
        sb.table("group_cycles")
        .select("*")
        .eq("group_id", group_id)
        .order("start_date", desc=True)
        .execute()
    )
    return list(r.data or [])


def create_cycle(sb: Client, user_id: str, group_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    m = assert_member(sb, user_id, group_id)
    if str(m.get("role")) != "admin":
        raise PermissionError("admin_only")
    row = {
        "group_id": group_id,
        "label": payload["label"],
        "start_date": str(payload["start_date"]),
        "end_date": str(payload["end_date"]),
        "target_amount": _f(payload.get("target_amount", 0)),
        "status": payload.get("status", "active"),
    }
    r = sb.table("group_cycles").insert(row).execute()
    if not r.data:
        raise RuntimeError("insert_failed")
    log_activity(sb, group_id, event_type="cycle_created", message=f"Cycle «{row['label']}»", actor_id=user_id)
    return r.data[0]


def generate_next_cycle(sb: Client, user_id: str, group_id: str) -> dict[str, Any]:
    m = assert_member(sb, user_id, group_id)
    if str(m.get("role")) != "admin":
        raise PermissionError("admin_only")
    last = (
        sb.table("group_cycles")
        .select("*")
        .eq("group_id", group_id)
        .order("end_date", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not last:
        raise ValueError("no_cycle")
    prev = last[0]
    sb.table("group_cycles").update({"status": "closed"}).eq("cycle_id", str(prev["cycle_id"])).execute()

    g = _fetch_group(sb, group_id)
    assert g is not None
    ct = str(g.get("cycle_type") or "monthly")
    ps = date.fromisoformat(str(prev["start_date"]))
    pe = date.fromisoformat(str(prev["end_date"]))
    span = (pe - ps).days + 1
    if ct == "weekly":
        ns = pe + timedelta(days=1)
        ne = ns + timedelta(days=6)
    else:
        ns = pe + timedelta(days=1)
        ne = ns.replace(day=calendar.monthrange(ns.year, ns.month)[1])
    label = ns.strftime("%B %Y")
    new_row = {
        "group_id": group_id,
        "label": label,
        "start_date": str(ns),
        "end_date": str(ne),
        "target_amount": float(prev.get("target_amount") or 0),
        "status": "active",
    }
    ins = sb.table("group_cycles").insert(new_row).execute()
    if not ins.data:
        raise RuntimeError("insert_failed")
    new_id = str(ins.data[0]["cycle_id"])
    old_coms = (
        sb.table("group_commitments")
        .select("*")
        .eq("cycle_id", str(prev["cycle_id"]))
        .execute()
        .data
        or []
    )
    due = ns + timedelta(days=min(7, span))
    for c in old_coms:
        sb.table("group_commitments").insert(
            {
                "group_id": group_id,
                "cycle_id": new_id,
                "participant_id": str(c["participant_id"]),
                "committed_amount": float(c.get("committed_amount") or 0),
                "paid_amount": 0.0,
                "due_date": str(due),
                "status": "pending",
            }
        ).execute()
    log_activity(sb, group_id, event_type="cycle_rolled", message=f"New cycle «{label}»", actor_id=user_id, cycle_id=new_id)
    apply_recurring_templates_to_cycle(sb, user_id, group_id, new_id)
    refresh_group_signals(sb, group_id)
    return ins.data[0]


def list_commitments(sb: Client, user_id: str, group_id: str, cycle_id: str | None) -> list[dict[str, Any]]:
    assert_member(sb, user_id, group_id)
    q = sb.table("group_commitments").select("*").eq("group_id", group_id)
    if cycle_id:
        q = q.eq("cycle_id", cycle_id)
    r = q.execute()
    return list(r.data or [])


def bulk_create_commitments(sb: Client, user_id: str, group_id: str, body: GroupCommitmentsBulkCreate) -> list[dict[str, Any]]:
    m = assert_member(sb, user_id, group_id)
    if str(m.get("role")) != "admin":
        raise PermissionError("admin_only")
    pmap = _participant_map(sb, group_id)
    created: list[dict[str, Any]] = []
    cycle_id = str(body.cycle_id) if body.cycle_id else None
    due = body.due_date

    if body.equal_split_total is not None and body.equal_split_total > 0:
        parts = list(pmap.values())
        n = len(parts)
        if n == 0:
            raise ValueError("no_participants")
        total = body.equal_split_total
        base = (total / n).quantize(Decimal("0.01"))
        rem = total - base * n
        for i, p in enumerate(parts):
            amt = base + (rem if i == 0 else Decimal("0"))
            row: dict[str, Any] = {
                "group_id": group_id,
                "participant_id": str(p["participant_id"]),
                "committed_amount": _f(amt),
                "paid_amount": 0.0,
                "due_date": str(due) if due else None,
                "status": "pending",
            }
            if cycle_id:
                row["cycle_id"] = cycle_id
            ins = sb.table("group_commitments").insert(row).execute()
            if ins.data:
                created.append(ins.data[0])
    else:
        for line in body.lines:
            pid = str(line.participant_id)
            if pid not in pmap:
                raise ValueError("invalid_participant")
            dd = line.due_date or due
            row = {
                "group_id": group_id,
                "participant_id": pid,
                "committed_amount": _f(line.committed_amount),
                "paid_amount": 0.0,
                "due_date": str(dd) if dd else None,
                "status": "pending",
            }
            if cycle_id:
                row["cycle_id"] = cycle_id
            ins = sb.table("group_commitments").insert(row).execute()
            if ins.data:
                created.append(ins.data[0])
    for c in created:
        log_activity(
            sb,
            group_id,
            event_type="commitment_created",
            message="Commitment added",
            actor_id=user_id,
            cycle_id=str(c.get("cycle_id")) if c.get("cycle_id") else None,
        )
    if cycle_id:
        sync_cycle_collected(sb, cycle_id)
    refresh_group_signals(sb, group_id)
    return created


def update_commitment(
    sb: Client, user_id: str, group_id: str, commitment_id: str, patch: dict[str, Any]
) -> dict[str, Any]:
    assert_admin_group(sb, user_id, group_id)
    cur = (
        sb.table("group_commitments")
        .select("*")
        .eq("commitment_id", commitment_id)
        .eq("group_id", group_id)
        .maybe_single()
        .execute()
    )
    if not cur.data:
        raise ValueError("not_found")
    row = dict(cur.data)
    if "committed_amount" in patch and patch["committed_amount"] is not None:
        row["committed_amount"] = _f(patch["committed_amount"])
    if "due_date" in patch and patch["due_date"] is not None:
        row["due_date"] = str(patch["due_date"])
    if "status" in patch and patch["status"] is not None:
        row["status"] = patch["status"]
    committed = _d(row.get("committed_amount"))
    paid = _d(row.get("paid_amount"))
    if paid > committed:
        paid = committed
        row["paid_amount"] = _f(paid)
    dd = date.fromisoformat(str(row["due_date"])) if row.get("due_date") else None
    row["status"] = commitment_derived_status(committed, paid, dd)
    up = {
        "committed_amount": _f(row["committed_amount"]),
        "paid_amount": _f(row["paid_amount"]),
        "due_date": row.get("due_date"),
        "status": row["status"],
    }
    sb.table("group_commitments").update(up).eq("commitment_id", commitment_id).execute()
    r2 = sb.table("group_commitments").select("*").eq("commitment_id", commitment_id).maybe_single().execute()
    if r2.data and r2.data.get("cycle_id"):
        sync_cycle_collected(sb, str(r2.data["cycle_id"]))
    refresh_group_signals(sb, group_id)
    return r2.data or {}


def delete_commitment(sb: Client, user_id: str, group_id: str, commitment_id: str) -> None:
    assert_admin_group(sb, user_id, group_id)
    cur = (
        sb.table("group_commitments")
        .select("*")
        .eq("commitment_id", commitment_id)
        .eq("group_id", group_id)
        .maybe_single()
        .execute()
    )
    if not cur.data:
        raise ValueError("not_found")
    cycle_id = cur.data.get("cycle_id")
    sb.table("group_commitments").delete().eq("commitment_id", commitment_id).eq("group_id", group_id).execute()
    log_activity(
        sb,
        group_id,
        event_type="commitment_deleted",
        message="Commitment removed",
        actor_id=user_id,
        cycle_id=str(cycle_id) if cycle_id else None,
    )
    if cycle_id:
        sync_cycle_collected(sb, str(cycle_id))
    refresh_group_signals(sb, group_id)


def record_commitment_payment(
    sb: Client, user_id: str, group_id: str, commitment_id: str, body: PayCommitmentBody
) -> dict[str, Any]:
    assert_member(sb, user_id, group_id)
    cur = (
        sb.table("group_commitments")
        .select("*")
        .eq("commitment_id", commitment_id)
        .eq("group_id", group_id)
        .maybe_single()
        .execute()
    )
    if not cur.data:
        raise ValueError("not_found")
    paid = _d(cur.data.get("paid_amount")) + body.amount
    committed = _d(cur.data.get("committed_amount"))
    paid = min(paid, committed) if committed > 0 else paid
    dd = date.fromisoformat(str(cur.data["due_date"])) if cur.data.get("due_date") else None
    st = commitment_derived_status(committed, paid, dd)
    sb.table("group_commitments").update({"paid_amount": _f(paid), "status": st}).eq("commitment_id", commitment_id).execute()
    pmap = _participant_map(sb, group_id)
    part = pmap.get(str(cur.data["participant_id"]), {})
    log_activity(
        sb,
        group_id,
        event_type="payment_recorded",
        message=f"Payment recorded for {part.get('display_name', 'member')}",
        actor_id=user_id,
        cycle_id=str(cur.data["cycle_id"]) if cur.data.get("cycle_id") else None,
    )
    if cur.data.get("cycle_id"):
        sync_cycle_collected(sb, str(cur.data["cycle_id"]))
    refresh_group_signals(sb, group_id)
    r2 = sb.table("group_commitments").select("*").eq("commitment_id", commitment_id).maybe_single().execute()
    return r2.data or {}


def list_expenses(sb: Client, user_id: str, group_id: str) -> list[dict[str, Any]]:
    assert_member(sb, user_id, group_id)
    ex = (
        sb.table("group_expenses")
        .select("*")
        .eq("group_id", group_id)
        .order("expense_date", desc=True)
        .execute()
        .data
        or []
    )
    if not ex:
        return []
    ids = [str(e["expense_id"]) for e in ex]
    sh = (
        sb.table("group_expense_shares")
        .select("*")
        .in_("expense_id", ids)
        .execute()
        .data
        or []
    )
    by_e: dict[str, list[dict[str, Any]]] = {}
    for s in sh:
        by_e.setdefault(str(s["expense_id"]), []).append(s)
    for e in ex:
        e["shares"] = by_e.get(str(e["expense_id"]), [])
    return ex


def _build_expense_shares(
    pmap: dict[str, dict[str, Any]], body: GroupExpenseCreate
) -> list[dict[str, Any]]:
    amount = body.amount
    shares: list[dict[str, Any]] = []

    if body.split_rule == "equal":
        parts = list(pmap.keys())
        n = len(parts)
        if n == 0:
            raise ValueError("no_participants")
        total = amount
        base = (total / n).quantize(Decimal("0.01"))
        rem = total - base * n
        for i, pid in enumerate(parts):
            owed = base + (rem if i == 0 else Decimal("0"))
            shares.append({"participant_id": pid, "owed_amount": _f(owed)})
    elif body.split_rule == "custom_amounts":
        if not body.shares:
            raise ValueError("shares_required")
        ssum = sum(_d(s.owed_amount) for s in body.shares)
        if ssum != amount:
            raise ValueError("share_sum_mismatch")
        for s in body.shares:
            if str(s.participant_id) not in pmap:
                raise ValueError("invalid_participant")
            shares.append({"participant_id": str(s.participant_id), "owed_amount": _f(s.owed_amount)})
    elif body.split_rule == "percentages":
        if not body.shares:
            raise ValueError("shares_required")
        pct_sum = sum(_d(s.owed_amount) for s in body.shares)
        if abs(pct_sum - Decimal("100")) > Decimal("0.02"):
            raise ValueError("percent_sum")
        for s in body.shares:
            if str(s.participant_id) not in pmap:
                raise ValueError("invalid_participant")
            owed = (amount * _d(s.owed_amount) / Decimal("100")).quantize(Decimal("0.01"))
            shares.append({"participant_id": str(s.participant_id), "owed_amount": _f(owed)})
    else:
        raise ValueError("bad_split_rule")
    return shares


def _insert_expense_row(
    sb: Client,
    user_id: str,
    group_id: str,
    body: GroupExpenseCreate,
    *,
    source_recurring_id: str | None = None,
) -> dict[str, Any]:
    pmap = _participant_map(sb, group_id)
    payer = str(body.paid_by_participant_id)
    if payer not in pmap:
        raise ValueError("invalid_payer")
    shares = _build_expense_shares(pmap, body)
    row: dict[str, Any] = {
        "group_id": group_id,
        "cycle_id": str(body.cycle_id) if body.cycle_id else None,
        "title": body.title.strip(),
        "amount": _f(body.amount),
        "paid_by_participant_id": payer,
        "category": body.category,
        "description": body.description,
        "expense_date": str(body.expense_date),
    }
    if source_recurring_id:
        row["source_recurring_id"] = source_recurring_id
    ins = sb.table("group_expenses").insert(row).execute()
    if not ins.data:
        raise RuntimeError("insert_failed")
    eid = str(ins.data[0]["expense_id"])
    for sh in shares:
        sb.table("group_expense_shares").insert(
            {
                "expense_id": eid,
                "participant_id": sh["participant_id"],
                "owed_amount": sh["owed_amount"],
                "settled_amount": 0.0,
                "status": "pending",
            }
        ).execute()
    log_activity(
        sb,
        group_id,
        event_type="expense_added",
        message=f"Expense: {body.title}",
        actor_id=user_id,
        cycle_id=row.get("cycle_id"),
    )
    refresh_group_signals(sb, group_id)
    r = sb.table("group_expenses").select("*").eq("expense_id", eid).maybe_single().execute()
    out = dict(r.data or ins.data[0])
    sh2 = sb.table("group_expense_shares").select("*").eq("expense_id", eid).execute().data or []
    out["shares"] = sh2
    return out


def create_expense(sb: Client, user_id: str, group_id: str, body: GroupExpenseCreate) -> dict[str, Any]:
    assert_member(sb, user_id, group_id)
    return _insert_expense_row(sb, user_id, group_id, body, source_recurring_id=None)


def _recurring_shares_json(body: GroupRecurringExpenseCreate) -> list[dict[str, Any]]:
    return [
        {"participant_id": str(s.participant_id), "owed_amount": float(_d(s.owed_amount))}
        for s in body.shares
    ]


def _validate_recurring_template(sb: Client, group_id: str, body: GroupRecurringExpenseCreate) -> None:
    pmap = _participant_map(sb, group_id)
    probe = GroupExpenseCreate(
        title=body.title,
        amount=body.amount,
        paid_by_participant_id=body.paid_by_participant_id,
        category=body.category,
        description=body.description,
        expense_date=date.today(),
        cycle_id=None,
        split_rule=body.split_rule,
        shares=body.shares,
    )
    _build_expense_shares(pmap, probe)


def _recurring_template_to_expense_create(
    tmpl: dict[str, Any], cycle_id: str, expense_date: date
) -> GroupExpenseCreate:
    sj = tmpl.get("shares_json") or []
    if isinstance(sj, str):
        sj = json.loads(sj)
    from app.schemas.group import ExpenseShareLine

    lines = [
        ExpenseShareLine(participant_id=UUID(str(x["participant_id"])), owed_amount=Decimal(str(x["owed_amount"])))
        for x in sj
    ]
    return GroupExpenseCreate(
        title=str(tmpl["title"]),
        amount=Decimal(str(tmpl["amount"])),
        paid_by_participant_id=UUID(str(tmpl["paid_by_participant_id"])),
        category=tmpl.get("category"),
        description=tmpl.get("description"),
        expense_date=expense_date,
        cycle_id=UUID(cycle_id),
        split_rule=str(tmpl.get("split_rule") or "equal"),
        shares=lines,
    )


def list_recurring_expenses(sb: Client, user_id: str, group_id: str) -> list[dict[str, Any]]:
    assert_member(sb, user_id, group_id)
    rows = (
        sb.table("group_recurring_expenses")
        .select("*")
        .eq("group_id", group_id)
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )
    out: list[dict[str, Any]] = []
    for row in rows:
        d = dict(row)
        sj = d.pop("shares_json", []) or []
        if isinstance(sj, str):
            sj = json.loads(sj)
        d["shares"] = sj
        out.append(d)
    return out


def create_recurring_expense(
    sb: Client, user_id: str, group_id: str, body: GroupRecurringExpenseCreate
) -> dict[str, Any]:
    assert_admin_group(sb, user_id, group_id)
    _validate_recurring_template(sb, group_id, body)
    row = {
        "group_id": group_id,
        "title": body.title.strip(),
        "amount": _f(body.amount),
        "paid_by_participant_id": str(body.paid_by_participant_id),
        "category": body.category,
        "description": body.description,
        "split_rule": body.split_rule,
        "shares_json": _recurring_shares_json(body),
        "is_active": body.is_active,
    }
    r = sb.table("group_recurring_expenses").insert(row).execute()
    if not r.data:
        raise RuntimeError("insert_failed")
    log_activity(
        sb,
        group_id,
        event_type="recurring_expense_created",
        message=f"Recurring expense: {body.title}",
        actor_id=user_id,
    )
    d = dict(r.data[0])
    sj = d.pop("shares_json", []) or []
    if isinstance(sj, str):
        sj = json.loads(sj)
    d["shares"] = sj
    return d


def update_recurring_expense(
    sb: Client, user_id: str, group_id: str, recurring_id: str, body: GroupRecurringExpenseUpdate
) -> dict[str, Any]:
    assert_admin_group(sb, user_id, group_id)
    cur = (
        sb.table("group_recurring_expenses")
        .select("*")
        .eq("recurring_id", recurring_id)
        .eq("group_id", group_id)
        .maybe_single()
        .execute()
    )
    if not cur.data:
        raise ValueError("not_found")
    row = cur.data
    raw = body.model_dump(exclude_unset=True)
    patch: dict[str, Any] = {}

    if "title" in raw and raw["title"] is not None:
        patch["title"] = raw["title"].strip()
    if "amount" in raw and raw["amount"] is not None:
        patch["amount"] = _f(raw["amount"])
    if "paid_by_participant_id" in raw and raw["paid_by_participant_id"] is not None:
        patch["paid_by_participant_id"] = str(raw["paid_by_participant_id"])
    if "category" in raw:
        patch["category"] = raw["category"]
    if "description" in raw:
        patch["description"] = raw["description"]
    if "split_rule" in raw and raw["split_rule"] is not None:
        patch["split_rule"] = raw["split_rule"]
    if "is_active" in raw and raw["is_active"] is not None:
        patch["is_active"] = raw["is_active"]

    need_validate = any(
        k in raw
        for k in ("title", "amount", "paid_by_participant_id", "category", "description", "split_rule", "shares")
    )
    if need_validate:
        from app.schemas.group import ExpenseShareLine

        sj_cur = row.get("shares_json") or []
        if isinstance(sj_cur, str):
            sj_cur = json.loads(sj_cur)
        share_lines = (
            [ExpenseShareLine.model_validate(s) for s in raw["shares"]]
            if "shares" in raw and raw["shares"] is not None
            else [
                ExpenseShareLine(participant_id=UUID(str(x["participant_id"])), owed_amount=Decimal(str(x["owed_amount"])))
                for x in sj_cur
            ]
        )
        merged = GroupRecurringExpenseCreate(
            title=str(patch.get("title", row["title"])),
            amount=Decimal(str(patch.get("amount", row["amount"]))),
            paid_by_participant_id=UUID(str(patch.get("paid_by_participant_id", row["paid_by_participant_id"]))),
            category=raw["category"] if "category" in raw else row.get("category"),
            description=raw["description"] if "description" in raw else row.get("description"),
            split_rule=str(patch.get("split_rule", row.get("split_rule") or "equal")),
            shares=share_lines,
            is_active=bool(patch["is_active"]) if "is_active" in raw else bool(row.get("is_active", True)),
        )
        _validate_recurring_template(sb, group_id, merged)
        patch["shares_json"] = _recurring_shares_json(merged)

    if patch:
        sb.table("group_recurring_expenses").update(patch).eq("recurring_id", recurring_id).execute()
    r2 = (
        sb.table("group_recurring_expenses")
        .select("*")
        .eq("recurring_id", recurring_id)
        .maybe_single()
        .execute()
    )
    if not r2.data:
        raise ValueError("not_found")
    d = dict(r2.data)
    sj = d.pop("shares_json", []) or []
    if isinstance(sj, str):
        sj = json.loads(sj)
    d["shares"] = sj
    return d


def delete_recurring_expense(sb: Client, user_id: str, group_id: str, recurring_id: str) -> None:
    assert_admin_group(sb, user_id, group_id)
    r = (
        sb.table("group_recurring_expenses")
        .select("recurring_id")
        .eq("recurring_id", recurring_id)
        .eq("group_id", group_id)
        .maybe_single()
        .execute()
    )
    if not r.data:
        raise ValueError("not_found")
    sb.table("group_recurring_expenses").delete().eq("recurring_id", recurring_id).execute()


def apply_recurring_templates_to_cycle(
    sb: Client, user_id: str, group_id: str, cycle_id: str
) -> dict[str, int]:
    assert_admin_group(sb, user_id, group_id)
    cyc = (
        sb.table("group_cycles")
        .select("*")
        .eq("cycle_id", cycle_id)
        .eq("group_id", group_id)
        .maybe_single()
        .execute()
    )
    if not cyc.data:
        raise ValueError("not_found")
    start = date.fromisoformat(str(cyc.data["start_date"]))
    templates = (
        sb.table("group_recurring_expenses")
        .select("*")
        .eq("group_id", group_id)
        .eq("is_active", True)
        .execute()
        .data
        or []
    )
    created = 0
    skipped = 0
    for tmpl in templates:
        rid = str(tmpl["recurring_id"])
        exists = (
            sb.table("group_expenses")
            .select("expense_id")
            .eq("source_recurring_id", rid)
            .eq("cycle_id", cycle_id)
            .maybe_single()
            .execute()
        )
        if exists.data:
            skipped += 1
            continue
        body = _recurring_template_to_expense_create(tmpl, cycle_id, start)
        try:
            _insert_expense_row(sb, user_id, group_id, body, source_recurring_id=rid)
            created += 1
        except ValueError as e:
            if str(e) in ("invalid_payer", "invalid_participant", "no_participants", "shares_required", "share_sum_mismatch", "percent_sum", "bad_split_rule"):
                skipped += 1
                continue
            raise
        except APIError:
            skipped += 1
            continue
    refresh_group_signals(sb, group_id)
    return {"created_count": created, "skipped_count": skipped}


def active_cycle_id_for_group(sb: Client, group_id: str) -> str | None:
    r = (
        sb.table("group_cycles")
        .select("cycle_id")
        .eq("group_id", group_id)
        .eq("status", "active")
        .limit(1)
        .execute()
        .data
        or []
    )
    return str(r[0]["cycle_id"]) if r else None


def apply_recurring_templates_optional_cycle(
    sb: Client, user_id: str, group_id: str, cycle_id: str | None
) -> dict[str, int]:
    cid = cycle_id or active_cycle_id_for_group(sb, group_id)
    if not cid:
        raise ValueError("no_cycle")
    return apply_recurring_templates_to_cycle(sb, user_id, group_id, cid)


def create_settlement(sb: Client, user_id: str, group_id: str, body: GroupSettlementCreate) -> dict[str, Any]:
    assert_member(sb, user_id, group_id)
    pmap = _participant_map(sb, group_id)
    f = str(body.from_participant_id)
    t = str(body.to_participant_id)
    if f not in pmap or t not in pmap:
        raise ValueError("invalid_participant")
    row = {
        "group_id": group_id,
        "cycle_id": str(body.cycle_id) if body.cycle_id else None,
        "from_participant_id": f,
        "to_participant_id": t,
        "amount": _f(body.amount),
        "status": "completed",
        "settled_at": date.today().isoformat(),
    }
    ins = sb.table("group_settlements").insert(row).execute()
    if not ins.data:
        raise RuntimeError("insert_failed")
    log_activity(
        sb,
        group_id,
        event_type="settlement_recorded",
        message=f"Settlement {body.amount} recorded",
        actor_id=user_id,
        cycle_id=row.get("cycle_id"),
    )
    refresh_group_signals(sb, group_id)
    return ins.data[0]


def list_activity(sb: Client, user_id: str, group_id: str, limit: int = 50) -> list[dict[str, Any]]:
    assert_member(sb, user_id, group_id)
    r = (
        sb.table("group_activity")
        .select("*")
        .eq("group_id", group_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return list(r.data or [])


def list_signals(sb: Client, user_id: str, group_id: str) -> list[dict[str, Any]]:
    assert_member(sb, user_id, group_id)
    r = (
        sb.table("group_signals")
        .select("*")
        .eq("group_id", group_id)
        .eq("resolved", False)
        .order("created_at", desc=True)
        .execute()
    )
    return list(r.data or [])


def refresh_group_signals(sb: Client, group_id: str) -> list[dict[str, Any]]:
    from app.services.group_intelligence_service import refresh_group_signals_intel

    return refresh_group_signals_intel(sb, group_id)


def send_reminder(sb: Client, user_id: str, group_id: str, body: GroupReminderCreate) -> dict[str, Any]:
    assert_member(sb, user_id, group_id)
    row = {
        "group_id": group_id,
        "cycle_id": str(body.cycle_id) if body.cycle_id else None,
        "participant_id": str(body.participant_id),
        "reminder_type": body.reminder_type,
        "message": body.message,
        "sent_by": user_id,
        "sent_at": None,
    }
    ins = sb.table("group_reminders").insert(row).execute()
    if not ins.data:
        raise RuntimeError("insert_failed")
    log_activity(
        sb,
        group_id,
        event_type="reminder_queued",
        message=f"Reminder ({body.reminder_type}): {body.message[:80]}",
        actor_id=user_id,
        cycle_id=row.get("cycle_id"),
    )
    return ins.data[0]


def group_home(sb: Client, user_id: str) -> dict[str, Any]:
    groups = list_groups_for_user(sb, user_id)
    active = [g for g in groups if str(g.get("status")) == "active"]
    gids = [str(g["group_id"]) for g in active]

    all_signals: list[dict[str, Any]] = []
    for gid in gids:
        refresh_group_signals(sb, gid)
        all_signals.extend(list_signals(sb, user_id, gid))

    sev_rank = {"high": 3, "medium": 2, "low": 1}
    all_signals.sort(key=lambda s: sev_rank.get(str(s.get("severity")), 0), reverse=True)
    top = all_signals[:10]

    trigger_msg = "All clear — no open signals."
    trigger_sev: str | None = None
    if top:
        trigger_msg = str(top[0].get("title") or top[0].get("message") or "")
        trigger_sev = str(top[0].get("severity"))

    pending_count = 0
    overdue_count = 0
    pending_rows: list[dict[str, Any]] = []
    for g in active:
        gid = str(g["group_id"])
        coms = sb.table("group_commitments").select("*").eq("group_id", gid).execute().data or []
        pmap = {str(p["participant_id"]): p for p in _active_participants(sb, gid)}
        for c in coms:
            st = str(c.get("status"))
            if st in ("pending", "partial"):
                pending_count += 1
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
            if st == "overdue":
                overdue_count += 1

    activity_all: list[dict[str, Any]] = []
    for gid in gids[:20]:
        try:
            assert_member(sb, user_id, gid)
        except PermissionError:
            continue
        a = (
            sb.table("group_activity")
            .select("*")
            .eq("group_id", gid)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
            .data
            or []
        )
        activity_all.extend(a)
    activity_all.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    recent = activity_all[:15]

    return {
        "trigger_message": trigger_msg,
        "trigger_severity": trigger_sev,
        "active_group_count": len(active),
        "pending_commitment_count": pending_count,
        "overdue_commitment_count": overdue_count,
        "groups": active,
        "pending_commitments": pending_rows[:20],
        "recent_activity": recent,
        "top_signals": top,
    }
