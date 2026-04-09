from __future__ import annotations

import secrets
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from supabase import Client

from app.config import get_settings
from app.services.email_invites import send_business_invite_email
from app.schemas.business import (
    BusinessCostCenterCreate,
    BusinessMemberCreate,
    BusinessMemberUpdate,
    BusinessSpendCreate,
    BusinessUnitCreate,
    BusinessVendorCreate,
    BusinessWorkspaceCreate,
    BusinessWorkspaceUpdate,
)


def _d(x: Any) -> Decimal:
    if x is None:
        return Decimal("0")
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def _f(x: Decimal | float | int | None) -> float | None:
    if x is None:
        return None
    if isinstance(x, Decimal):
        return float(x)
    return float(x)


def _fetch_workspace(sb: Client, workspace_id: str) -> dict[str, Any] | None:
    r = (
        sb.table("business_workspaces")
        .select("*")
        .eq("workspace_id", workspace_id)
        .maybe_single()
        .execute()
    )
    return r.data


def _assert_workspace(sb: Client, workspace_id: str) -> dict[str, Any]:
    ws = _fetch_workspace(sb, workspace_id)
    if not ws:
        raise ValueError("workspace_not_found")
    return ws


def _fetch_member(sb: Client, user_id: str, workspace_id: str) -> dict[str, Any]:
    r = (
        sb.table("business_members")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not r.data:
        raise PermissionError("not_a_member")
    return r.data


def _require_roles(member: dict[str, Any], roles: set[str]) -> None:
    role = str(member.get("role") or "")
    if role not in roles:
        raise PermissionError("forbidden")


def _is_admin(member: dict[str, Any]) -> bool:
    return str(member.get("role")) == "admin"


def _can_submit(member: dict[str, Any]) -> bool:
    return str(member.get("role") or "") in {"admin", "manager", "approver", "member"}


def _can_approve(member: dict[str, Any], spend: dict[str, Any]) -> bool:
    role = str(member.get("role") or "")
    if role in {"admin", "approver"}:
        return True
    if role == "manager":
        mid = str(member.get("unit_id") or "")
        sid = str(spend.get("unit_id") or "")
        return bool(mid and sid and mid == sid)
    return False


def _business_invite_join_url(token: str) -> str:
    base = get_settings().app_public_url.rstrip("/")
    return f"{base}/business/join?token={token}"


def log_activity(
    sb: Client,
    workspace_id: str,
    *,
    event_type: str,
    message: str,
    actor_id: str | None = None,
    unit_id: str | None = None,
    spend_id: str | None = None,
) -> None:
    row: dict[str, Any] = {
        "workspace_id": workspace_id,
        "event_type": event_type,
        "message": message,
    }
    if actor_id:
        row["actor_id"] = actor_id
    if unit_id:
        row["unit_id"] = unit_id
    if spend_id:
        row["spend_id"] = spend_id
    sb.table("business_activity").insert(row).execute()


def create_workspace(sb: Client, user_id: str, body: BusinessWorkspaceCreate) -> dict[str, Any]:
    row = {
        "title": body.title.strip(),
        "business_type": body.business_type.strip(),
        "total_budget": _f(body.total_budget),
        "currency": body.currency.strip().upper() if body.currency else "INR",
        "created_by": user_id,
        "status": body.status,
    }
    r = sb.table("business_workspaces").insert(row).execute()
    if not r.data:
        raise RuntimeError("insert_failed")
    ws = r.data[0]
    sb.table("business_members").insert(
        {
            "workspace_id": str(ws["workspace_id"]),
            "user_id": user_id,
            "role": "admin",
        }
    ).execute()
    log_activity(
        sb,
        str(ws["workspace_id"]),
        actor_id=user_id,
        event_type="workspace_created",
        message=f"Workspace created: {ws['title']}",
    )
    return ws


def list_workspaces(sb: Client, user_id: str, include_archived: bool = False) -> list[dict[str, Any]]:
    members = (
        sb.table("business_members")
        .select("workspace_id")
        .eq("user_id", user_id)
        .execute()
        .data
        or []
    )
    wids = [str(m["workspace_id"]) for m in members if m.get("workspace_id")]
    if not wids:
        return []
    q = sb.table("business_workspaces").select("*").in_("workspace_id", wids).order("created_at", desc=True)
    if not include_archived:
        q = q.neq("status", "archived")
    return list(q.execute().data or [])


def get_workspace(sb: Client, user_id: str, workspace_id: str) -> dict[str, Any]:
    _fetch_member(sb, user_id, workspace_id)
    ws = _assert_workspace(sb, workspace_id)
    return ws


def update_workspace(
    sb: Client, user_id: str, workspace_id: str, body: BusinessWorkspaceUpdate
) -> dict[str, Any]:
    member = _fetch_member(sb, user_id, workspace_id)
    _require_roles(member, {"admin"})
    patch = body.model_dump(exclude_unset=True)
    if "title" in patch and patch["title"] is not None:
        patch["title"] = patch["title"].strip()
    if "business_type" in patch and patch["business_type"] is not None:
        patch["business_type"] = patch["business_type"].strip()
    if "currency" in patch and patch["currency"] is not None:
        patch["currency"] = str(patch["currency"]).strip().upper()
    if "total_budget" in patch:
        patch["total_budget"] = _f(patch["total_budget"])
    if not patch:
        return _assert_workspace(sb, workspace_id)
    sb.table("business_workspaces").update(patch).eq("workspace_id", workspace_id).execute()
    return _assert_workspace(sb, workspace_id)


def archive_workspace(sb: Client, user_id: str, workspace_id: str) -> dict[str, Any]:
    member = _fetch_member(sb, user_id, workspace_id)
    _require_roles(member, {"admin"})
    sb.table("business_workspaces").update({"status": "archived"}).eq("workspace_id", workspace_id).execute()
    log_activity(sb, workspace_id, actor_id=user_id, event_type="workspace_archived", message="Workspace archived")
    return _assert_workspace(sb, workspace_id)


def create_unit(sb: Client, user_id: str, workspace_id: str, body: BusinessUnitCreate) -> dict[str, Any]:
    member = _fetch_member(sb, user_id, workspace_id)
    _require_roles(member, {"admin"})
    row = {
        "workspace_id": workspace_id,
        "name": body.name.strip(),
        "unit_type": body.unit_type,
        "location": body.location,
        "manager_user_id": body.manager_user_id,
        "budget_limit": _f(body.budget_limit),
        "status": body.status,
    }
    r = sb.table("business_units").insert(row).execute()
    if not r.data:
        raise RuntimeError("insert_failed")
    log_activity(
        sb,
        workspace_id,
        actor_id=user_id,
        event_type="unit_created",
        message=f"Unit created: {row['name']}",
        unit_id=str(r.data[0]["unit_id"]),
    )
    return r.data[0]


def list_units(sb: Client, user_id: str, workspace_id: str) -> list[dict[str, Any]]:
    _fetch_member(sb, user_id, workspace_id)
    return (
        sb.table("business_units")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )


def create_member(sb: Client, user_id: str, workspace_id: str, body: BusinessMemberCreate) -> dict[str, Any]:
    member = _fetch_member(sb, user_id, workspace_id)
    _require_roles(member, {"admin"})
    row = {
        "workspace_id": workspace_id,
        "user_id": body.user_id.strip(),
        "role": body.role,
        "unit_id": str(body.unit_id) if body.unit_id else None,
    }
    r = sb.table("business_members").upsert(row, on_conflict="workspace_id,user_id").execute()
    if not r.data:
        raise RuntimeError("insert_failed")
    return r.data[0]


def list_members(sb: Client, user_id: str, workspace_id: str) -> list[dict[str, Any]]:
    _fetch_member(sb, user_id, workspace_id)
    return (
        sb.table("business_members")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )


def send_member_invite(sb: Client, user_id: str, workspace_id: str, *, email: str, role: str, unit_id: str | None) -> dict[str, Any]:
    member = _fetch_member(sb, user_id, workspace_id)
    _require_roles(member, {"admin"})
    ws = _assert_workspace(sb, workspace_id)
    em = email.strip().lower()
    if not em or "@" not in em:
        raise ValueError("invalid_invite_email")
    if unit_id:
        _assert_ref_in_workspace(sb, "business_units", "unit_id", unit_id, workspace_id, "unit_not_found")
    token = secrets.token_urlsafe(24)
    now = datetime.now(timezone.utc)
    row = {
        "workspace_id": workspace_id,
        "email": em,
        "role": role,
        "unit_id": unit_id,
        "invite_token": token,
        "invited_by": user_id,
        "accepted_at": None,
        "accepted_by": None,
        "expires_at": (now + timedelta(days=14)).isoformat(),
    }
    r = sb.table("business_member_invites").insert(row).execute()
    if not r.data:
        raise RuntimeError("insert_failed")
    invite = r.data[0]
    join_url = _business_invite_join_url(token)
    settings = get_settings()
    email_sent = False
    invite_message: str | None = None

    if (settings.resend_api_key or "").strip():
        try:
            send_business_invite_email(
                to_email=em,
                join_url=join_url,
                workspace_title=str(ws.get("title") or "Momentra workspace"),
                role=role,
            )
        except Exception as e:
            raise ValueError("email_send_failed") from e
        email_sent = True
        log_activity(
            sb,
            workspace_id,
            actor_id=user_id,
            unit_id=unit_id,
            event_type="member_invited",
            message=f"Invitation emailed to {em} as {role}",
        )
    else:
        invite_message = (
            "Email delivery is not configured (set MOMENTRA_RESEND_API_KEY or RESEND_API_KEY); "
            "share the link manually."
        )
        log_activity(
            sb,
            workspace_id,
            actor_id=user_id,
            unit_id=unit_id,
            event_type="member_invited",
            message=f"Invitation created for {em} as {role} (email not sent)",
        )

    return {**invite, "join_url": join_url, "sent": email_sent, "message": invite_message}


def list_member_invites(sb: Client, user_id: str, workspace_id: str) -> list[dict[str, Any]]:
    member = _fetch_member(sb, user_id, workspace_id)
    _require_roles(member, {"admin"})
    return (
        sb.table("business_member_invites")
        .select("*")
        .eq("workspace_id", workspace_id)
        .is_("accepted_at", None)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )


def preview_member_invite(sb: Client, token: str) -> dict[str, Any]:
    t = token.strip()
    if len(t) < 8:
        raise ValueError("invalid_token")
    inv = (
        sb.table("business_member_invites")
        .select("*")
        .eq("invite_token", t)
        .is_("accepted_at", None)
        .maybe_single()
        .execute()
        .data
    )
    if not inv:
        raise ValueError("invite_not_found")
    exp = inv.get("expires_at")
    if exp and datetime.fromisoformat(str(exp).replace("Z", "+00:00")) < datetime.now(timezone.utc):
        raise ValueError("invite_not_found")
    ws = _fetch_workspace(sb, str(inv["workspace_id"]))
    if not ws:
        raise ValueError("workspace_not_found")
    unit_name = None
    uid = inv.get("unit_id")
    if uid:
        unit = sb.table("business_units").select("name").eq("unit_id", str(uid)).maybe_single().execute().data
        unit_name = str(unit.get("name")) if unit else None
    return {
        "workspace_id": inv["workspace_id"],
        "workspace_title": ws["title"],
        "email": inv["email"],
        "role": inv["role"],
        "unit_id": inv.get("unit_id"),
        "unit_name": unit_name,
    }


def accept_member_invite(sb: Client, user_id: str, user_email: str | None, token: str) -> dict[str, Any]:
    t = token.strip()
    if len(t) < 8:
        raise ValueError("invalid_token")
    inv = (
        sb.table("business_member_invites")
        .select("*")
        .eq("invite_token", t)
        .is_("accepted_at", None)
        .maybe_single()
        .execute()
        .data
    )
    if not inv:
        raise ValueError("invite_not_found")
    exp = inv.get("expires_at")
    if exp and datetime.fromisoformat(str(exp).replace("Z", "+00:00")) < datetime.now(timezone.utc):
        raise ValueError("invite_not_found")
    invite_email = str(inv.get("email") or "").strip().lower()
    actual_email = (user_email or "").strip().lower()
    if not actual_email:
        raise ValueError("email_required_for_invite")
    if actual_email != invite_email:
        raise ValueError("email_mismatch")
    workspace_id = str(inv["workspace_id"])
    upsert = {
        "workspace_id": workspace_id,
        "user_id": user_id,
        "role": str(inv.get("role") or "member"),
        "unit_id": str(inv["unit_id"]) if inv.get("unit_id") else None,
    }
    member_row = sb.table("business_members").upsert(upsert, on_conflict="workspace_id,user_id").execute().data
    if not member_row:
        raise RuntimeError("insert_failed")
    sb.table("business_member_invites").update(
        {"accepted_at": datetime.now(timezone.utc).isoformat(), "accepted_by": user_id}
    ).eq("invite_id", str(inv["invite_id"])).execute()
    log_activity(
        sb,
        workspace_id,
        actor_id=user_id,
        unit_id=str(inv["unit_id"]) if inv.get("unit_id") else None,
        event_type="member_invite_accepted",
        message=f"Invitation accepted by {actual_email}",
    )
    m = member_row[0]
    return {
        "workspace_id": m["workspace_id"],
        "member_id": m["member_id"],
        "role": m["role"],
        "unit_id": m.get("unit_id"),
    }


def update_member(
    sb: Client, user_id: str, workspace_id: str, member_id: str, body: BusinessMemberUpdate
) -> dict[str, Any]:
    member = _fetch_member(sb, user_id, workspace_id)
    _require_roles(member, {"admin"})
    patch = body.model_dump(exclude_unset=True)
    if "unit_id" in patch and patch["unit_id"] is not None:
        patch["unit_id"] = str(patch["unit_id"])
    if not patch:
        cur = sb.table("business_members").select("*").eq("member_id", member_id).maybe_single().execute()
        if not cur.data:
            raise ValueError("member_not_found")
        return cur.data
    r = sb.table("business_members").update(patch).eq("member_id", member_id).eq("workspace_id", workspace_id).execute()
    if not r.data:
        raise ValueError("member_not_found")
    return r.data[0]


def create_cost_center(
    sb: Client, user_id: str, workspace_id: str, body: BusinessCostCenterCreate
) -> dict[str, Any]:
    member = _fetch_member(sb, user_id, workspace_id)
    _require_roles(member, {"admin"})
    row = {
        "workspace_id": workspace_id,
        "name": body.name.strip(),
        "budget_limit": _f(body.budget_limit),
    }
    r = sb.table("business_cost_centers").insert(row).execute()
    if not r.data:
        raise RuntimeError("insert_failed")
    return r.data[0]


def list_cost_centers(sb: Client, user_id: str, workspace_id: str) -> list[dict[str, Any]]:
    _fetch_member(sb, user_id, workspace_id)
    return (
        sb.table("business_cost_centers")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )


def create_vendor(sb: Client, user_id: str, workspace_id: str, body: BusinessVendorCreate) -> dict[str, Any]:
    member = _fetch_member(sb, user_id, workspace_id)
    _require_roles(member, {"admin"})
    row = {
        "workspace_id": workspace_id,
        "name": body.name.strip(),
        "vendor_type": body.vendor_type,
        "contact_info": body.contact_info,
    }
    r = sb.table("business_vendors").insert(row).execute()
    if not r.data:
        raise RuntimeError("insert_failed")
    return r.data[0]


def list_vendors(sb: Client, user_id: str, workspace_id: str) -> list[dict[str, Any]]:
    _fetch_member(sb, user_id, workspace_id)
    return (
        sb.table("business_vendors")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )


def _assert_ref_in_workspace(
    sb: Client, table: str, id_col: str, value: str | None, workspace_id: str, err: str
) -> None:
    if not value:
        return
    r = (
        sb.table(table)
        .select(id_col)
        .eq(id_col, value)
        .eq("workspace_id", workspace_id)
        .maybe_single()
        .execute()
    )
    if not r.data:
        raise ValueError(err)


def submit_spend(sb: Client, user_id: str, workspace_id: str, body: BusinessSpendCreate) -> dict[str, Any]:
    member = _fetch_member(sb, user_id, workspace_id)
    if not _can_submit(member):
        raise PermissionError("forbidden")
    unit_id = str(body.unit_id)
    _assert_ref_in_workspace(sb, "business_units", "unit_id", unit_id, workspace_id, "unit_not_found")
    _assert_ref_in_workspace(
        sb,
        "business_cost_centers",
        "cost_center_id",
        str(body.cost_center_id) if body.cost_center_id else None,
        workspace_id,
        "cost_center_not_found",
    )
    _assert_ref_in_workspace(
        sb,
        "business_vendors",
        "vendor_id",
        str(body.vendor_id) if body.vendor_id else None,
        workspace_id,
        "vendor_not_found",
    )
    price = body.price_per_unit
    qty = body.quantity
    provided_amount = body.amount
    total: Decimal | None = None

    if price is not None or qty is not None:
        if price is None or qty is None:
            raise ValueError("purchase_fields_incomplete")
        if price < 0 or qty < 0:
            raise ValueError("purchase_fields_negative")
        total = (price * qty).quantize(Decimal("0.01"))
        if provided_amount is not None:
            amt2 = provided_amount.quantize(Decimal("0.01"))
            if amt2 != total:
                raise ValueError("amount_mismatch")
    else:
        if provided_amount is None:
            raise ValueError("amount_or_purchase_required")
        if provided_amount < 0:
            raise ValueError("amount_negative")
        total = provided_amount.quantize(Decimal("0.01"))

    row = {
        "workspace_id": workspace_id,
        "unit_id": unit_id,
        "title": body.title.strip(),
        "amount": _f(total),
        "price_per_unit": _f(price.quantize(Decimal("0.01"))) if price is not None else None,
        "quantity": _f(qty.quantize(Decimal("0.001"))) if qty is not None else None,
        "measurement_unit": (body.measurement_unit or "").strip() or None,
        "spend_type": body.spend_type,
        "cost_center_id": str(body.cost_center_id) if body.cost_center_id else None,
        "vendor_id": str(body.vendor_id) if body.vendor_id else None,
        "status": "pending",
        "submitted_by": user_id,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    r = sb.table("business_spends").insert(row).execute()
    if not r.data:
        raise RuntimeError("insert_failed")
    spend = r.data[0]
    log_activity(
        sb,
        workspace_id,
        unit_id=unit_id,
        spend_id=str(spend["spend_id"]),
        actor_id=user_id,
        event_type="spend_submitted",
        message=f"Spend submitted: {row['title']}",
    )
    refresh_business_signals(sb, workspace_id)
    return spend


def list_spends(sb: Client, user_id: str, workspace_id: str) -> list[dict[str, Any]]:
    _fetch_member(sb, user_id, workspace_id)
    return (
        sb.table("business_spends")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("submitted_at", desc=True)
        .execute()
        .data
        or []
    )


def _get_spend_for_action(sb: Client, spend_id: str) -> dict[str, Any]:
    r = sb.table("business_spends").select("*").eq("spend_id", spend_id).maybe_single().execute()
    if not r.data:
        raise ValueError("spend_not_found")
    return r.data


def approve_spend(sb: Client, user_id: str, spend_id: str) -> dict[str, Any]:
    spend = _get_spend_for_action(sb, spend_id)
    workspace_id = str(spend["workspace_id"])
    member = _fetch_member(sb, user_id, workspace_id)
    if not _can_approve(member, spend):
        raise PermissionError("forbidden")
    if str(spend.get("status")) != "pending":
        raise ValueError("invalid_spend_status")
    patch = {
        "status": "approved",
        "approved_by": user_id,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "rejection_reason": None,
    }
    r = sb.table("business_spends").update(patch).eq("spend_id", spend_id).execute()
    if not r.data:
        raise ValueError("spend_not_found")
    out = r.data[0]
    log_activity(
        sb,
        workspace_id,
        unit_id=str(out.get("unit_id") or ""),
        spend_id=spend_id,
        actor_id=user_id,
        event_type="spend_approved",
        message=f"Spend approved: {out.get('title') or 'Spend'}",
    )
    refresh_business_signals(sb, workspace_id)
    return out


def reject_spend(sb: Client, user_id: str, spend_id: str, reason: str) -> dict[str, Any]:
    spend = _get_spend_for_action(sb, spend_id)
    workspace_id = str(spend["workspace_id"])
    member = _fetch_member(sb, user_id, workspace_id)
    if not _can_approve(member, spend):
        raise PermissionError("forbidden")
    if str(spend.get("status")) != "pending":
        raise ValueError("invalid_spend_status")
    msg = reason.strip()
    if not msg:
        raise ValueError("rejection_reason_required")
    patch = {
        "status": "rejected",
        "approved_by": user_id,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "rejection_reason": msg,
    }
    r = sb.table("business_spends").update(patch).eq("spend_id", spend_id).execute()
    if not r.data:
        raise ValueError("spend_not_found")
    out = r.data[0]
    log_activity(
        sb,
        workspace_id,
        unit_id=str(out.get("unit_id") or ""),
        spend_id=spend_id,
        actor_id=user_id,
        event_type="spend_rejected",
        message=f"Spend rejected: {out.get('title') or 'Spend'}",
    )
    refresh_business_signals(sb, workspace_id)
    return out


def compute_workspace_summary(sb: Client, workspace_id: str) -> dict[str, Any]:
    ws = _assert_workspace(sb, workspace_id)
    spends = (
        sb.table("business_spends")
        .select("amount,status")
        .eq("workspace_id", workspace_id)
        .execute()
        .data
        or []
    )
    spent = Decimal("0")
    pending = Decimal("0")
    for s in spends:
        amt = _d(s.get("amount"))
        st = str(s.get("status") or "")
        if st == "approved":
            spent += amt
        elif st == "pending":
            pending += amt
    budget = _d(ws.get("total_budget")) if ws.get("total_budget") is not None else None
    remaining = (budget - spent) if budget is not None else None
    return {
        "total_budget": budget,
        "total_spent": spent,
        "pending_amount": pending,
        "remaining": remaining,
    }


def compute_unit_performance(sb: Client, workspace_id: str) -> list[dict[str, Any]]:
    units = (
        sb.table("business_units")
        .select("*")
        .eq("workspace_id", workspace_id)
        .execute()
        .data
        or []
    )
    approved = (
        sb.table("business_spends")
        .select("unit_id,amount")
        .eq("workspace_id", workspace_id)
        .eq("status", "approved")
        .execute()
        .data
        or []
    )
    by_unit: dict[str, Decimal] = {}
    for s in approved:
        uid = str(s.get("unit_id") or "")
        by_unit[uid] = by_unit.get(uid, Decimal("0")) + _d(s.get("amount"))
    out: list[dict[str, Any]] = []
    for u in units:
        uid = str(u["unit_id"])
        spent = by_unit.get(uid, Decimal("0"))
        lim = _d(u["budget_limit"]) if u.get("budget_limit") is not None else None
        ratio = float((spent / lim)) if lim and lim > 0 else None
        out.append(
            {
                "key": uid,
                "label": str(u.get("name") or "Unit"),
                "amount": spent,
                "budget_limit": lim,
                "utilization_ratio": ratio,
            }
        )
    return out


def _cost_center_breakdown(sb: Client, workspace_id: str) -> list[dict[str, Any]]:
    ccs = (
        sb.table("business_cost_centers")
        .select("*")
        .eq("workspace_id", workspace_id)
        .execute()
        .data
        or []
    )
    approved = (
        sb.table("business_spends")
        .select("cost_center_id,amount")
        .eq("workspace_id", workspace_id)
        .eq("status", "approved")
        .execute()
        .data
        or []
    )
    by_cc: dict[str, Decimal] = {}
    for s in approved:
        cid = str(s.get("cost_center_id") or "")
        if not cid:
            continue
        by_cc[cid] = by_cc.get(cid, Decimal("0")) + _d(s.get("amount"))
    out: list[dict[str, Any]] = []
    for cc in ccs:
        cid = str(cc["cost_center_id"])
        spent = by_cc.get(cid, Decimal("0"))
        lim = _d(cc["budget_limit"]) if cc.get("budget_limit") is not None else None
        ratio = float((spent / lim)) if lim and lim > 0 else None
        out.append(
            {
                "key": cid,
                "label": str(cc.get("name") or "Cost center"),
                "amount": spent,
                "budget_limit": lim,
                "utilization_ratio": ratio,
            }
        )
    return out


def _iso_day(d: date) -> str:
    return d.isoformat()


def _pct(n: Decimal, d: Decimal) -> float | None:
    if d <= 0:
        return None
    return float((n / d) * Decimal("100"))


def _severity_label(severity: str) -> str:
    s = (severity or "").upper()
    if s == "HIGH":
        return "HIGH"
    if s == "MEDIUM":
        return "MEDIUM"
    return "LOW"


def _db_severity_from_logical(sev: str) -> str:
    """Map console severities to values allowed by the original business_signals check."""
    u = (sev or "").upper()
    if u in ("HIGH", "CRITICAL"):
        return "critical"
    if u in ("MEDIUM", "WARNING"):
        return "warning"
    return "info"


def _logical_severity_from_db(sev: str) -> str:
    """Normalize DB severity to HIGH/MEDIUM/LOW for API and in-memory logic."""
    u = (sev or "").lower()
    if u == "critical":
        return "HIGH"
    if u == "warning":
        return "MEDIUM"
    if u == "info":
        return "LOW"
    u2 = (sev or "").upper()
    if u2 in ("HIGH", "MEDIUM", "LOW"):
        return u2
    return "LOW"


def _signal_message_for_db(s: dict[str, Any]) -> str:
    title = str(s.get("title") or "").strip()
    body = str(s.get("message") or "").strip()
    if title and body:
        return f"{title} — {body}"
    return title or body


def _signal_row_for_db_insert(s: dict[str, Any]) -> dict[str, Any]:
    """Rows compatible with the original business_signals table (no extended columns)."""
    row: dict[str, Any] = {
        "workspace_id": s["workspace_id"],
        "signal_type": s["signal_type"],
        "severity": _db_severity_from_logical(str(s.get("severity") or "LOW")),
        "message": _signal_message_for_db(s),
        "resolved": bool(s.get("resolved", False)),
    }
    uid = s.get("unit_id")
    if uid:
        row["unit_id"] = uid
    return row


def _normalize_signal_from_db(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    out["severity"] = _logical_severity_from_db(str(out.get("severity") or ""))
    raw_msg = str(out.get("message") or "")
    if not out.get("title") and " — " in raw_msg:
        t, _, rest = raw_msg.partition(" — ")
        if rest.strip():
            out["title"] = t.strip()
            out["message"] = rest.strip()
    return out


def _today_range_utc() -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    return start.isoformat(), end.isoformat()


def _day_range_utc(days_back_start: int, days_back_end: int) -> tuple[str, str]:
    # [start, end) in UTC
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    start = today_start - timedelta(days=days_back_start)
    end = today_start - timedelta(days=days_back_end)
    return start.isoformat(), end.isoformat()


def compute_control_score(sb: Client, workspace_id: str) -> dict[str, Any]:
    summary = compute_workspace_summary(sb, workspace_id)
    pending_count = (
        sb.table("business_spends")
        .select("spend_id", count="exact")
        .eq("workspace_id", workspace_id)
        .eq("status", "pending")
        .execute()
        .count
        or 0
    )
    units = compute_unit_performance(sb, workspace_id)
    cost_centers = (
        sb.table("business_cost_centers")
        .select("*")
        .eq("workspace_id", workspace_id)
        .execute()
        .data
        or []
    )
    signals = generate_business_signals(sb, None, workspace_id, persist=False)

    score = 0
    # approvals clear = +30
    if pending_count == 0:
        score += 30
    elif pending_count <= 2:
        score += 18
    else:
        score += 8
    # workspace budget healthy = +25
    budget = summary.get("total_budget")
    approved = _d(summary.get("total_spent"))
    pending = _d(summary.get("pending_amount"))
    if budget is not None and budget > 0:
        used_ratio = (approved + pending) / budget
        if used_ratio < Decimal("0.8"):
            score += 25
        elif used_ratio < Decimal("0.95"):
            score += 15
        else:
            score += 5
    else:
        score += 10
    # units healthy = +20
    unhealthy_units = 0
    for u in units:
        ratio = u.get("utilization_ratio")
        if ratio is not None and ratio >= 1:
            unhealthy_units += 1
    if unhealthy_units == 0:
        score += 20
    elif unhealthy_units == 1:
        score += 12
    else:
        score += 5
    # cost centers configured = +10
    if len(cost_centers) >= 2:
        score += 10
    elif len(cost_centers) == 1:
        score += 6
    # no unresolved high-severity signals = +15
    has_high = any(_severity_label(str(s.get("severity") or "")) == "HIGH" for s in signals)
    if not has_high:
        score += 15

    score = max(0, min(100, score))
    label = "Stable" if score >= 75 else ("Watch" if score >= 50 else "At Risk")
    return {"control_score": score, "control_label": label}


def compute_control_summary(sb: Client, user_id: str, workspace_id: str) -> dict[str, Any]:
    _fetch_member(sb, user_id, workspace_id)
    summary = compute_workspace_summary(sb, workspace_id)
    approvals_count = (
        sb.table("business_spends")
        .select("spend_id", count="exact")
        .eq("workspace_id", workspace_id)
        .eq("status", "pending")
        .execute()
        .count
        or 0
    )
    score = compute_control_score(sb, workspace_id)
    return {
        "total_budget": summary.get("total_budget"),
        "approved_spend": summary.get("total_spent"),
        "pending_spend": summary.get("pending_amount"),
        "remaining_budget": summary.get("remaining"),
        "approvals_count": approvals_count,
        "control_score": score["control_score"],
        "control_label": score["control_label"],
    }


def compute_cost_center_breakdown(sb: Client, user_id: str, workspace_id: str) -> list[dict[str, Any]]:
    _fetch_member(sb, user_id, workspace_id)
    ccs = (
        sb.table("business_cost_centers").select("*").eq("workspace_id", workspace_id).execute().data or []
    )
    spends = (
        sb.table("business_spends")
        .select("cost_center_id,amount,status")
        .eq("workspace_id", workspace_id)
        .execute()
        .data
        or []
    )
    by_cc_approved: dict[str, Decimal] = {}
    by_cc_pending: dict[str, Decimal] = {}
    for s in spends:
        cid = str(s.get("cost_center_id") or "")
        if not cid:
            continue
        amt = _d(s.get("amount"))
        if str(s.get("status") or "") == "approved":
            by_cc_approved[cid] = by_cc_approved.get(cid, Decimal("0")) + amt
        elif str(s.get("status") or "") == "pending":
            by_cc_pending[cid] = by_cc_pending.get(cid, Decimal("0")) + amt
    out: list[dict[str, Any]] = []
    for cc in ccs:
        cid = str(cc["cost_center_id"])
        approved_amt = by_cc_approved.get(cid, Decimal("0"))
        pending_amt = by_cc_pending.get(cid, Decimal("0"))
        lim = _d(cc["budget_limit"]) if cc.get("budget_limit") is not None else None
        ratio = float((approved_amt / lim)) if lim and lim > 0 else None
        util_pct = _pct(approved_amt, lim) if lim and lim > 0 else None
        state = "healthy"
        if ratio is not None and ratio >= 1:
            state = "over"
        elif ratio is not None and ratio >= 0.8:
            state = "warning"
        out.append(
            {
                "key": cid,
                "label": str(cc.get("name") or "Cost center"),
                "amount": approved_amt,
                "pending_amount": pending_amt,
                "budget_limit": lim,
                "utilization_ratio": ratio,
                "utilization_pct": util_pct,
                "state": state,
            }
        )
    return out


def compute_unit_performance_response(
    sb: Client, user_id: str | None, workspace_id: str
) -> dict[str, Any]:
    if user_id:
        _fetch_member(sb, user_id, workspace_id)
    units = (
        sb.table("business_units").select("*").eq("workspace_id", workspace_id).execute().data or []
    )
    spends = (
        sb.table("business_spends")
        .select("unit_id,amount,status")
        .eq("workspace_id", workspace_id)
        .execute()
        .data
        or []
    )
    by_unit_approved: dict[str, Decimal] = {}
    by_unit_pending: dict[str, Decimal] = {}
    for s in spends:
        uid = str(s.get("unit_id") or "")
        if not uid:
            continue
        amt = _d(s.get("amount"))
        if str(s.get("status") or "") == "approved":
            by_unit_approved[uid] = by_unit_approved.get(uid, Decimal("0")) + amt
        elif str(s.get("status") or "") == "pending":
            by_unit_pending[uid] = by_unit_pending.get(uid, Decimal("0")) + amt
    rows: list[dict[str, Any]] = []
    for u in units:
        uid = str(u["unit_id"])
        approved_amt = by_unit_approved.get(uid, Decimal("0"))
        pending_amt = by_unit_pending.get(uid, Decimal("0"))
        lim = _d(u["budget_limit"]) if u.get("budget_limit") is not None else None
        ratio = float((approved_amt / lim)) if lim and lim > 0 else None
        util_pct = _pct(approved_amt, lim) if lim and lim > 0 else None
        state = "on_track"
        if ratio is not None and ratio >= 1:
            state = "over_limit"
        elif ratio is not None and ratio >= 0.8:
            state = "near_limit"
        rows.append(
            {
                "key": uid,
                "label": str(u.get("name") or "Unit"),
                "unit_type": str(u.get("unit_type") or ""),
                "amount": approved_amt,
                "pending_amount": pending_amt,
                "budget_limit": lim,
                "utilization_ratio": ratio,
                "utilization_pct": util_pct,
                "performance_state": state,
            }
        )
    top_unit = max(rows, key=lambda r: _d(r.get("amount")), default=None)
    at_risk = max(rows, key=lambda r: float(r.get("utilization_ratio") or 0.0), default=None)
    return {
        "rows": rows,
        "top_unit_id": top_unit["key"] if top_unit else None,
        "top_unit_label": top_unit["label"] if top_unit else None,
        "at_risk_unit_id": at_risk["key"] if at_risk and (at_risk.get("utilization_ratio") or 0) >= 0.8 else None,
        "at_risk_unit_label": at_risk["label"] if at_risk and (at_risk.get("utilization_ratio") or 0) >= 0.8 else None,
    }


def generate_business_signals(
    sb: Client, user_id: str | None, workspace_id: str, *, persist: bool = True
) -> list[dict[str, Any]]:
    if user_id:
        _fetch_member(sb, user_id, workspace_id)
    summary = compute_workspace_summary(sb, workspace_id)
    units_perf = compute_unit_performance_response(sb, user_id, workspace_id)["rows"]
    if user_id:
        cc_breakdown = compute_cost_center_breakdown(sb, user_id, workspace_id)
    else:
        ccs = sb.table("business_cost_centers").select("*").eq("workspace_id", workspace_id).execute().data or []
        spends = (
            sb.table("business_spends")
            .select("cost_center_id,amount,status")
            .eq("workspace_id", workspace_id)
            .execute()
            .data
            or []
        )
        by_cc_approved: dict[str, Decimal] = {}
        by_cc_pending: dict[str, Decimal] = {}
        for s in spends:
            cid = str(s.get("cost_center_id") or "")
            if not cid:
                continue
            amt = _d(s.get("amount"))
            st = str(s.get("status") or "")
            if st == "approved":
                by_cc_approved[cid] = by_cc_approved.get(cid, Decimal("0")) + amt
            elif st == "pending":
                by_cc_pending[cid] = by_cc_pending.get(cid, Decimal("0")) + amt
        cc_breakdown = []
        for cc in ccs:
            cid = str(cc["cost_center_id"])
            approved_amt = by_cc_approved.get(cid, Decimal("0"))
            pending_amt = by_cc_pending.get(cid, Decimal("0"))
            lim = _d(cc["budget_limit"]) if cc.get("budget_limit") is not None else None
            ratio = float((approved_amt / lim)) if lim and lim > 0 else None
            util_pct = _pct(approved_amt, lim) if lim and lim > 0 else None
            state = "healthy"
            if ratio is not None and ratio >= 1:
                state = "over"
            elif ratio is not None and ratio >= 0.8:
                state = "warning"
            cc_breakdown.append(
                {
                    "key": cid,
                    "label": str(cc.get("name") or "Cost center"),
                    "amount": approved_amt,
                    "pending_amount": pending_amt,
                    "budget_limit": lim,
                    "utilization_ratio": ratio,
                    "utilization_pct": util_pct,
                    "state": state,
                }
            )
    members = sb.table("business_members").select("*").eq("workspace_id", workspace_id).execute().data or []
    units = sb.table("business_units").select("*").eq("workspace_id", workspace_id).execute().data or []
    cost_centers = (
        sb.table("business_cost_centers").select("*").eq("workspace_id", workspace_id).execute().data or []
    )

    pending_spends = (
        sb.table("business_spends")
        .select("spend_id,title,amount,submitted_at")
        .eq("workspace_id", workspace_id)
        .eq("status", "pending")
        .order("submitted_at", desc=False)
        .execute()
        .data
        or []
    )
    approved_last_30 = (
        sb.table("business_spends")
        .select("amount,vendor_id")
        .eq("workspace_id", workspace_id)
        .eq("status", "approved")
        .gte("approved_at", (datetime.now(timezone.utc) - timedelta(days=30)).isoformat())
        .execute()
        .data
        or []
    )

    signals: list[dict[str, Any]] = []

    # 1) Pending approvals
    if pending_spends:
        pending_total = sum((_d(r.get("amount")) for r in pending_spends), Decimal("0"))
        sev = "HIGH" if len(pending_spends) >= 5 else "MEDIUM"
        signals.append(
            {
                "workspace_id": workspace_id,
                "signal_type": "PENDING_APPROVALS",
                "severity": sev,
                "title": f"{len(pending_spends)} spend{'s' if len(pending_spends) > 1 else ''} waiting approval",
                "message": f"{pending_total} is blocking operations",
                "action_type": "OPEN_APPROVALS",
                "action_target_type": "APPROVAL_CENTER",
                "action_target_id": None,
                "resolved": False,
            }
        )

    # 2) Workspace budget risk (approved + pending)
    budget = summary.get("total_budget")
    approved_spend = _d(summary.get("total_spent"))
    pending_spend = _d(summary.get("pending_amount"))
    if budget is not None and budget > 0:
        ratio = (approved_spend + pending_spend) / budget
        if ratio >= Decimal("0.95"):
            signals.append(
                {
                    "workspace_id": workspace_id,
                    "signal_type": "WORKSPACE_BUDGET_RISK",
                    "severity": "HIGH",
                    "title": "Workspace budget near limit",
                    "message": "Approved + pending spends are above 95% of budget",
                    "action_type": "OPEN_CONTROL_SUMMARY",
                    "action_target_type": "WORKSPACE",
                    "action_target_id": workspace_id,
                    "resolved": False,
                }
            )
        elif ratio >= Decimal("0.80"):
            signals.append(
                {
                    "workspace_id": workspace_id,
                    "signal_type": "WORKSPACE_BUDGET_RISK",
                    "severity": "MEDIUM",
                    "title": "Workspace budget approaching limit",
                    "message": "Approved + pending spends crossed 80% of budget",
                    "action_type": "OPEN_CONTROL_SUMMARY",
                    "action_target_type": "WORKSPACE",
                    "action_target_id": workspace_id,
                    "resolved": False,
                }
            )

    # 3) Unit overspend/near-limit risk
    for row in units_perf:
        ratio = float(row.get("utilization_ratio") or 0.0)
        if ratio >= 1.0:
            signals.append(
                {
                    "workspace_id": workspace_id,
                    "unit_id": row["key"],
                    "signal_type": "UNIT_OVERSPEND",
                    "severity": "HIGH",
                    "title": f"{row['label']} exceeded budget",
                    "message": "Unit approved spend is over the configured budget limit",
                    "action_type": "OPEN_UNIT",
                    "action_target_type": "UNIT",
                    "action_target_id": row["key"],
                    "resolved": False,
                }
            )
        elif ratio >= 0.8:
            signals.append(
                {
                    "workspace_id": workspace_id,
                    "unit_id": row["key"],
                    "signal_type": "UNIT_BUDGET_WARNING",
                    "severity": "MEDIUM",
                    "title": f"{row['label']} nearing budget cap",
                    "message": f"Utilization is at {round(ratio * 100)}%",
                    "action_type": "OPEN_UNIT",
                    "action_target_type": "UNIT",
                    "action_target_id": row["key"],
                    "resolved": False,
                }
            )

    # 4) Cost center drift
    for row in cc_breakdown:
        ratio = float(row.get("utilization_ratio") or 0.0)
        if ratio >= 0.85:
            signals.append(
                {
                    "workspace_id": workspace_id,
                    "signal_type": "COST_CENTER_DRIFT",
                    "severity": "HIGH" if ratio >= 1.0 else "MEDIUM",
                    "title": f"{row['label']} is nearing limit" if ratio < 1.0 else f"{row['label']} exceeded limit",
                    "message": f"Cost center utilization is at {round(ratio * 100)}%",
                    "action_type": "OPEN_COST_CENTER",
                    "action_target_type": "COST_CENTER",
                    "action_target_id": row["key"],
                    "resolved": False,
                }
            )

    # 5) Missing configuration
    has_approver = any(str(m.get("role") or "") in {"admin", "approver"} for m in members)
    if not has_approver:
        signals.append(
            {
                "workspace_id": workspace_id,
                "signal_type": "MISSING_APPROVER",
                "severity": "MEDIUM",
                "title": "No approver assigned",
                "message": "Assign an approver/admin role to keep approval flow healthy",
                "action_type": "OPEN_TEAM",
                "action_target_type": "TEAM",
                "action_target_id": None,
                "resolved": False,
            }
        )
    if any(u.get("budget_limit") in {None, 0, "0"} for u in units):
        signals.append(
            {
                "workspace_id": workspace_id,
                "signal_type": "UNIT_BUDGET_MISSING",
                "severity": "LOW",
                "title": "One or more units have no budget limit",
                "message": "Set unit budgets to improve risk signals",
                "action_type": "OPEN_UNITS",
                "action_target_type": "UNIT",
                "action_target_id": None,
                "resolved": False,
            }
        )
    if not cost_centers:
        signals.append(
            {
                "workspace_id": workspace_id,
                "signal_type": "NO_COST_CENTERS",
                "severity": "LOW",
                "title": "No cost centers configured",
                "message": "Create cost centers for better operational visibility",
                "action_type": "OPEN_COST_CENTERS",
                "action_target_type": "COST_CENTER",
                "action_target_id": None,
                "resolved": False,
            }
        )

    # 6) Vendor concentration (last 30 days)
    total_approved = sum((_d(r.get("amount")) for r in approved_last_30), Decimal("0"))
    if total_approved > 0:
        by_vendor: dict[str, Decimal] = {}
        for r in approved_last_30:
            vid = str(r.get("vendor_id") or "")
            if not vid:
                continue
            by_vendor[vid] = by_vendor.get(vid, Decimal("0")) + _d(r.get("amount"))
        if by_vendor:
            top_vendor_id, top_vendor_amt = max(by_vendor.items(), key=lambda kv: kv[1])
            share = top_vendor_amt / total_approved
            if share >= Decimal("0.7"):
                signals.append(
                    {
                        "workspace_id": workspace_id,
                        "signal_type": "VENDOR_CONCENTRATION",
                        "severity": "MEDIUM",
                        "title": "Vendor concentration is high",
                        "message": "Single vendor accounts for >=70% of recent approved spend",
                        "action_type": "OPEN_VENDOR",
                        "action_target_type": "VENDOR",
                        "action_target_id": top_vendor_id,
                        "resolved": False,
                    }
                )

    if persist:
        # V1 approach: overwrite live unresolved signals from deterministic rules.
        sb.table("business_signals").delete().eq("workspace_id", workspace_id).eq("resolved", False).execute()
        if signals:
            rows = [_signal_row_for_db_insert(s) for s in signals]
            sb.table("business_signals").insert(rows).execute()
        raw = (
            sb.table("business_signals")
            .select("*")
            .eq("workspace_id", workspace_id)
            .order("created_at", desc=True)
            .execute()
            .data
            or []
        )
        return [_normalize_signal_from_db(r) for r in raw]
    return signals


def refresh_business_signals(sb: Client, workspace_id: str) -> list[dict[str, Any]]:
    return generate_business_signals(sb, None, workspace_id, persist=True)


def list_signals(sb: Client, user_id: str, workspace_id: str) -> list[dict[str, Any]]:
    _fetch_member(sb, user_id, workspace_id)
    return generate_business_signals(sb, user_id, workspace_id, persist=True)


def generate_business_recommendations(
    sb: Client, user_id: str, workspace_id: str
) -> list[dict[str, Any]]:
    _fetch_member(sb, user_id, workspace_id)
    signals = generate_business_signals(sb, user_id, workspace_id, persist=True)
    units = sb.table("business_units").select("*").eq("workspace_id", workspace_id).execute().data or []
    cost_centers = (
        sb.table("business_cost_centers").select("*").eq("workspace_id", workspace_id).execute().data or []
    )
    vendors = sb.table("business_vendors").select("*").eq("workspace_id", workspace_id).execute().data or []
    members = sb.table("business_members").select("*").eq("workspace_id", workspace_id).execute().data or []
    pending = (
        sb.table("business_spends")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("status", "pending")
        .order("submitted_at", desc=False)
        .execute()
        .data
        or []
    )
    rejected_recent = (
        sb.table("business_spends")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("status", "rejected")
        .gte("approved_at", (datetime.now(timezone.utc) - timedelta(days=14)).isoformat())
        .order("approved_at", desc=True)
        .limit(5)
        .execute()
        .data
        or []
    )

    out: list[dict[str, Any]] = []
    if pending:
        p0 = pending[0]
        out.append(
            {
                "workspace_id": workspace_id,
                "recommendation_type": "APPROVE_PENDING_SPEND",
                "priority": 1,
                "title": f"Approve {_d(p0.get('amount'))} to unblock operations",
                "message": f"Submitted for {str(p0.get('title') or 'spend')}",
                "action_type": "OPEN_SPEND",
                "action_target_type": "SPEND",
                "action_target_id": str(p0.get("spend_id") or ""),
            }
        )
    if not units:
        out.append(
            {
                "workspace_id": workspace_id,
                "recommendation_type": "ADD_FIRST_UNIT",
                "priority": 1,
                "title": "Add your first unit",
                "message": "Stores/factories unlock unit-level controls and signals",
                "action_type": "OPEN_SETUP",
                "action_target_type": "UNIT",
                "action_target_id": None,
            }
        )
    if not cost_centers:
        out.append(
            {
                "workspace_id": workspace_id,
                "recommendation_type": "ADD_FIRST_COST_CENTER",
                "priority": 2,
                "title": "Create your first cost center",
                "message": "Cost centers improve accountability and budget drift detection",
                "action_type": "OPEN_SETUP",
                "action_target_type": "COST_CENTER",
                "action_target_id": None,
            }
        )
    if not vendors:
        out.append(
            {
                "workspace_id": workspace_id,
                "recommendation_type": "ADD_VENDOR",
                "priority": 3,
                "title": "Add a vendor to speed future purchases",
                "message": "Vendor tagging improves concentration and trend analysis",
                "action_type": "OPEN_SETUP",
                "action_target_type": "VENDOR",
                "action_target_id": None,
            }
        )
    if any(u.get("budget_limit") in {None, 0, "0"} for u in units):
        out.append(
            {
                "workspace_id": workspace_id,
                "recommendation_type": "SET_UNIT_BUDGET",
                "priority": 2,
                "title": "Set budget for units without limits",
                "message": "Budget caps are required for reliable risk signals",
                "action_type": "OPEN_UNIT",
                "action_target_type": "UNIT",
                "action_target_id": None,
            }
        )
    has_manager = any(str(m.get("role") or "") in {"manager", "approver", "admin"} for m in members)
    if not has_manager:
        out.append(
            {
                "workspace_id": workspace_id,
                "recommendation_type": "ASSIGN_MANAGER",
                "priority": 3,
                "title": "Assign manager/approver for faster routing",
                "message": "Approval bottlenecks reduce operational throughput",
                "action_type": "OPEN_TEAM",
                "action_target_type": "TEAM",
                "action_target_id": None,
            }
        )
    if rejected_recent:
        r0 = rejected_recent[0]
        out.append(
            {
                "workspace_id": workspace_id,
                "recommendation_type": "FOLLOW_UP_REJECTED_SPEND",
                "priority": 4,
                "title": "Review rejected spend follow-up",
                "message": f"Latest rejected: {str(r0.get('title') or 'Spend')}",
                "action_type": "OPEN_SPEND",
                "action_target_type": "SPEND",
                "action_target_id": str(r0.get("spend_id") or ""),
            }
        )

    # Signal-driven recommendation: take top HIGH/MEDIUM signal.
    by_sev = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    if signals:
        top_signal = sorted(signals, key=lambda s: by_sev.get(_severity_label(str(s.get("severity") or "")), 3))[0]
        out.append(
            {
                "workspace_id": workspace_id,
                "recommendation_type": "RESPOND_TO_SIGNAL",
                "priority": 2,
                "title": str(top_signal.get("title") or "Review high-priority signal"),
                "message": str(top_signal.get("message") or ""),
                "action_type": str(top_signal.get("action_type") or "OPEN_SIGNALS"),
                "action_target_type": str(top_signal.get("action_target_type") or "WORKSPACE"),
                "action_target_id": str(top_signal.get("action_target_id") or "") or None,
            }
        )

    out = sorted(out, key=lambda r: int(r.get("priority") or 99))[:5]
    # Persist for traceability; safe overwrite for deterministic V1.
    sb.table("business_recommendations").delete().eq("workspace_id", workspace_id).execute()
    if out:
        sb.table("business_recommendations").insert(out).execute()
    return (
        sb.table("business_recommendations")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("priority", desc=False)
        .order("created_at", desc=False)
        .limit(5)
        .execute()
        .data
        or []
    )


def compute_today_status(sb: Client, user_id: str, workspace_id: str) -> dict[str, Any]:
    _fetch_member(sb, user_id, workspace_id)
    day_start, day_end = _today_range_utc()

    spends_today = (
        sb.table("business_spends")
        .select("spend_id,amount,status,title")
        .eq("workspace_id", workspace_id)
        .gte("submitted_at", day_start)
        .lt("submitted_at", day_end)
        .execute()
        .data
        or []
    )
    approvals_today = (
        sb.table("business_spends")
        .select("spend_id")
        .eq("workspace_id", workspace_id)
        .in_("status", ["approved", "rejected"])
        .gte("approved_at", day_start)
        .lt("approved_at", day_end)
        .execute()
        .data
        or []
    )
    spend_today_amount = sum((_d(r.get("amount")) for r in spends_today), Decimal("0"))
    pending_count = (
        sb.table("business_spends")
        .select("spend_id", count="exact")
        .eq("workspace_id", workspace_id)
        .eq("status", "pending")
        .execute()
        .count
        or 0
    )
    top_cards = []
    if pending_count > 0:
        pending_total = (
            sb.table("business_spends")
            .select("amount")
            .eq("workspace_id", workspace_id)
            .eq("status", "pending")
            .execute()
            .data
            or []
        )
        pending_amt = sum((_d(r.get("amount")) for r in pending_total), Decimal("0"))
        top_cards.append(
            {
                "signal_type": "PENDING_APPROVALS",
                "severity": "HIGH" if pending_count >= 5 else "MEDIUM",
                "title": f"{pending_count} approval{'s' if pending_count > 1 else ''} waiting",
                "message": f"{pending_amt} is blocking operations",
                "action_type": "OPEN_APPROVALS",
                "action_target_type": "APPROVAL_CENTER",
                "action_target_id": None,
            }
        )
    if spend_today_amount > 0:
        top_cards.append(
            {
                "signal_type": "TODAY_SPEND",
                "severity": "LOW",
                "title": f"{spend_today_amount} spent today",
                "message": f"{len(spends_today)} spend request{'s' if len(spends_today) > 1 else ''} submitted",
                "action_type": "OPEN_SPENDS",
                "action_target_type": "SPEND_REGISTER",
                "action_target_id": None,
            }
        )
    units_perf = compute_unit_performance_response(sb, user_id, workspace_id).get("rows", [])
    risky = sorted(units_perf, key=lambda r: float(r.get("utilization_ratio") or 0.0), reverse=True)
    if risky and float(risky[0].get("utilization_ratio") or 0.0) >= 0.65:
        pct = round(float(risky[0].get("utilization_ratio") or 0) * 100)
        top_cards.append(
            {
                "signal_type": "UNIT_RISK",
                "severity": "HIGH" if pct >= 90 else "MEDIUM",
                "title": f"{risky[0]['label']} used {pct}% of budget",
                "message": "Monitor approvals and spend pacing",
                "action_type": "OPEN_UNIT",
                "action_target_type": "UNIT",
                "action_target_id": risky[0]["key"],
            }
        )
    if not top_cards:
        top_cards.append(
            {
                "signal_type": "CALM",
                "severity": "LOW",
                "title": "No urgent risks - control is stable",
                "message": "Use this window to review growth spend quality",
                "action_type": "OPEN_SUMMARY",
                "action_target_type": "WORKSPACE",
                "action_target_id": workspace_id,
            }
        )

    daily_status = "busy" if pending_count > 0 else ("active" if spend_today_amount > 0 else "calm")
    daily_status_label = (
        "Approvals need attention"
        if daily_status == "busy"
        else ("Operations active today" if daily_status == "active" else "Control stable")
    )
    return {
        "top_cards": top_cards[:3],
        "spend_today_amount": spend_today_amount,
        "spends_submitted_today": len(spends_today),
        "approvals_handled_today": len(approvals_today),
        "daily_status": daily_status,
        "daily_status_label": daily_status_label,
    }


def compute_business_insights(sb: Client, user_id: str, workspace_id: str) -> dict[str, Any]:
    _fetch_member(sb, user_id, workspace_id)
    week_start, week_end = _day_range_utc(7, 0)
    prev_week_start, prev_week_end = _day_range_utc(14, 7)
    month_start, month_end = _day_range_utc(30, 0)

    week_spends = (
        sb.table("business_spends")
        .select("amount,unit_id,vendor_id,status")
        .eq("workspace_id", workspace_id)
        .gte("submitted_at", week_start)
        .lt("submitted_at", week_end)
        .execute()
        .data
        or []
    )
    prev_week_spends = (
        sb.table("business_spends")
        .select("amount")
        .eq("workspace_id", workspace_id)
        .gte("submitted_at", prev_week_start)
        .lt("submitted_at", prev_week_end)
        .execute()
        .data
        or []
    )
    month_spends = (
        sb.table("business_spends")
        .select("amount,status")
        .eq("workspace_id", workspace_id)
        .gte("submitted_at", month_start)
        .lt("submitted_at", month_end)
        .execute()
        .data
        or []
    )
    control = compute_control_summary(sb, user_id, workspace_id)
    today = compute_today_status(sb, user_id, workspace_id)

    week_total = sum((_d(r.get("amount")) for r in week_spends), Decimal("0"))
    prev_week_total = sum((_d(r.get("amount")) for r in prev_week_spends), Decimal("0"))
    trend_pct: float | None = None
    trend_label = "Weekly spend stable"
    if prev_week_total > 0:
        trend_pct = float(((week_total - prev_week_total) / prev_week_total) * Decimal("100"))
        if trend_pct >= 10:
            trend_label = f"Weekly spend increased {round(trend_pct)}%"
        elif trend_pct <= -10:
            trend_label = f"Weekly spend decreased {abs(round(trend_pct))}%"

    units_map = {
        str(u["unit_id"]): str(u.get("name") or "Unit")
        for u in (
            sb.table("business_units").select("unit_id,name").eq("workspace_id", workspace_id).execute().data or []
        )
    }
    vendors_map = {
        str(v["vendor_id"]): str(v.get("name") or "Vendor")
        for v in (
            sb.table("business_vendors")
            .select("vendor_id,name")
            .eq("workspace_id", workspace_id)
            .execute()
            .data
            or []
        )
    }
    by_unit: dict[str, Decimal] = {}
    by_vendor: dict[str, Decimal] = {}
    for r in week_spends:
        amt = _d(r.get("amount"))
        uid = str(r.get("unit_id") or "")
        vid = str(r.get("vendor_id") or "")
        if uid:
            by_unit[uid] = by_unit.get(uid, Decimal("0")) + amt
        if vid:
            by_vendor[vid] = by_vendor.get(vid, Decimal("0")) + amt

    top_unit_label = None
    if by_unit:
        top_unit_id = max(by_unit.items(), key=lambda kv: kv[1])[0]
        top_unit_label = units_map.get(top_unit_id, "Unit")
    top_vendor_label = None
    top_vendor_share_pct = None
    if by_vendor and week_total > 0:
        top_vendor_id, top_vendor_amt = max(by_vendor.items(), key=lambda kv: kv[1])
        top_vendor_label = vendors_map.get(top_vendor_id, "Vendor")
        top_vendor_share_pct = float((top_vendor_amt / week_total) * Decimal("100"))

    monthly_approved = sum(
        (_d(r.get("amount")) for r in month_spends if str(r.get("status") or "") == "approved"), Decimal("0")
    )
    budget = control.get("total_budget")
    monthly_budget_usage_pct = _pct(monthly_approved, _d(budget)) if budget is not None else None
    monthly_approvals_count = (
        sb.table("business_spends")
        .select("spend_id", count="exact")
        .eq("workspace_id", workspace_id)
        .in_("status", ["approved", "rejected"])
        .gte("approved_at", month_start)
        .lt("approved_at", month_end)
        .execute()
        .count
        or 0
    )
    chips: list[str] = []
    if top_unit_label:
        chips.append(f"{top_unit_label} is top unit this week")
    if top_vendor_label and top_vendor_share_pct is not None:
        chips.append(f"{top_vendor_label} accounts for {round(top_vendor_share_pct)}% of weekly spend")
    chips.append(trend_label)
    chips.append(f"{today['spend_today_amount']} spent today")

    return {
        "trend_weekly_pct": trend_pct,
        "trend_weekly_label": trend_label,
        "spend_today_amount": today["spend_today_amount"],
        "top_unit_week_label": top_unit_label,
        "top_vendor_week_label": top_vendor_label,
        "top_vendor_week_share_pct": top_vendor_share_pct,
        "monthly_budget_usage_pct": monthly_budget_usage_pct,
        "monthly_approvals_count": monthly_approvals_count,
        "chips": chips[:6],
    }


def upsert_daily_intelligence_snapshots(sb: Client, workspace_id: str) -> None:
    """
    Optional V1.5 cache path.
    Writes daily control/unit/cost-center snapshots.
    Keep real-time endpoints live; snapshots are for trend/history acceleration.
    """
    summary = compute_workspace_summary(sb, workspace_id)
    pending_count = (
        sb.table("business_spends")
        .select("spend_id", count="exact")
        .eq("workspace_id", workspace_id)
        .eq("status", "pending")
        .execute()
        .count
        or 0
    )
    score = compute_control_score(sb, workspace_id)
    date_key = _iso_day(datetime.now(timezone.utc).date())
    sb.table("business_control_snapshots").upsert(
        {
            "workspace_id": workspace_id,
            "date_key": date_key,
            "total_budget": _f(summary.get("total_budget")),
            "approved_spend": _f(summary.get("total_spent")),
            "pending_spend": _f(summary.get("pending_amount")),
            "remaining_budget": _f(summary.get("remaining")),
            "approvals_count": pending_count,
            "control_score": score.get("control_score"),
        },
        on_conflict="workspace_id,date_key",
    ).execute()

    units_perf = compute_unit_performance_response(sb, None, workspace_id).get("rows", [])
    for row in units_perf:
        sb.table("business_unit_snapshots").upsert(
            {
                "workspace_id": workspace_id,
                "unit_id": row["key"],
                "date_key": date_key,
                "budget_limit": _f(row.get("budget_limit")),
                "approved_spend": _f(row.get("amount")),
                "pending_spend": _f(row.get("pending_amount")),
                "utilization_pct": row.get("utilization_pct"),
                "performance_state": row.get("performance_state"),
            },
            on_conflict="workspace_id,unit_id,date_key",
        ).execute()

    ccs = sb.table("business_cost_centers").select("*").eq("workspace_id", workspace_id).execute().data or []
    spends = (
        sb.table("business_spends")
        .select("cost_center_id,amount,status")
        .eq("workspace_id", workspace_id)
        .execute()
        .data
        or []
    )
    by_cc_approved: dict[str, Decimal] = {}
    by_cc_pending: dict[str, Decimal] = {}
    for s in spends:
        cid = str(s.get("cost_center_id") or "")
        if not cid:
            continue
        amt = _d(s.get("amount"))
        st = str(s.get("status") or "")
        if st == "approved":
            by_cc_approved[cid] = by_cc_approved.get(cid, Decimal("0")) + amt
        elif st == "pending":
            by_cc_pending[cid] = by_cc_pending.get(cid, Decimal("0")) + amt
    for cc in ccs:
        cid = str(cc["cost_center_id"])
        approved_amt = by_cc_approved.get(cid, Decimal("0"))
        pending_amt = by_cc_pending.get(cid, Decimal("0"))
        lim = _d(cc["budget_limit"]) if cc.get("budget_limit") is not None else None
        util_pct = _pct(approved_amt, lim) if lim and lim > 0 else None
        sb.table("business_cost_center_snapshots").upsert(
            {
                "workspace_id": workspace_id,
                "cost_center_id": cid,
                "date_key": date_key,
                "budget_limit": _f(lim),
                "approved_spend": _f(approved_amt),
                "pending_spend": _f(pending_amt),
                "utilization_pct": util_pct,
            },
            on_conflict="workspace_id,cost_center_id,date_key",
        ).execute()


def dashboard(sb: Client, user_id: str, workspace_id: str) -> dict[str, Any]:
    _fetch_member(sb, user_id, workspace_id)
    summary = compute_workspace_summary(sb, workspace_id)
    pending = (
        sb.table("business_spends")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("status", "pending")
        .order("submitted_at", desc=True)
        .limit(25)
        .execute()
        .data
        or []
    )
    approved = (
        sb.table("business_spends")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("status", "approved")
        .order("approved_at", desc=True)
        .limit(25)
        .execute()
        .data
        or []
    )
    activity = (
        sb.table("business_activity")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
        .data
        or []
    )
    signals = refresh_business_signals(sb, workspace_id)
    return {
        "summary": summary,
        "pending_approvals": pending,
        "approved_spends": approved,
        "cost_center_breakdown": _cost_center_breakdown(sb, workspace_id),
        "unit_breakdown": compute_unit_performance(sb, workspace_id),
        "signals": signals,
        "activity": activity,
    }

