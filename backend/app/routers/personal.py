from __future__ import annotations

import calendar
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from postgrest.exceptions import APIError

from app.core.supabase import get_supabase
from app.dependencies import get_current_user_id
from app.postgrest_rows import as_dict_row, as_dict_rows
from app.schemas.personal import (
    BudgetCreate,
    BudgetOut,
    CycleCreate,
    CycleOut,
    GoalCreate,
    GoalOut,
    MomentCreate,
    MomentOut,
    PersonalSummaryOut,
    SignalCreate,
    SignalOut,
    SpendBreakdownOut,
    SpendBreakdownRowOut,
    TransactionCategoryTreeOut,
    TransactionCreate,
    TransactionOut,
    TransactionSubcategoryRefOut,
    TransactionUpdate,
)
from app.services import personal_service

router = APIRouter(prefix="/personal", tags=["personal"])


def _sb():
    try:
        return get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e


def _exec(resp: Any) -> Any:
    """Narrow optional execute() results from client stubs."""
    if resp is None:
        raise HTTPException(status_code=502, detail="Empty database response")
    return resp


def _one(data: Any) -> dict[str, Any]:
    rows = as_dict_rows(data)
    if not rows:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Empty response")
    return rows[0]


def _month_date_bounds(year: int, month: int) -> tuple[date, date]:
    last = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last)


def _fetch_transaction(sb: Any, user_id: str, transaction_id: UUID) -> dict[str, Any] | None:
    try:
        r = (
            sb.table("personal_transactions")
            .select("*")
            .eq("transaction_id", str(transaction_id))
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        return as_dict_row(r.data)
    except APIError:
        return None


def _patch_transaction_payload(body: TransactionUpdate) -> dict[str, Any]:
    raw = body.model_dump(exclude_unset=True)
    row: dict[str, Any] = {}
    if "amount" in raw:
        row["amount"] = float(raw["amount"])
    if "merchant" in raw:
        row["merchant"] = raw["merchant"]
    if "description" in raw:
        row["description"] = raw["description"]
    if "transaction_date" in raw and raw["transaction_date"] is not None:
        row["transaction_date"] = str(raw["transaction_date"])
    if "moment_id" in raw:
        row["moment_id"] = str(raw["moment_id"]) if raw["moment_id"] else None
    if "cycle_id" in raw:
        row["cycle_id"] = str(raw["cycle_id"]) if raw["cycle_id"] else None
    if "category" in raw:
        row["category"] = raw["category"]
    if "subcategory" in raw:
        row["subcategory"] = raw["subcategory"]
    if "category_id" in raw:
        row["category_id"] = str(raw["category_id"]) if raw["category_id"] else None
    if "subcategory_id" in raw:
        row["subcategory_id"] = str(raw["subcategory_id"]) if raw["subcategory_id"] else None
    return row


def _resolve_budget_labels(sb: Any, body: BudgetCreate) -> tuple[str, str | None, str | None, str | None]:
    cat_label = (body.category or "").strip() or None
    sub_label: str | None = None
    c_id: str | None = str(body.category_id) if body.category_id else None
    s_id: str | None = str(body.subcategory_id) if body.subcategory_id else None
    if body.subcategory_id is not None:
        sub = (
            sb.table("personal_transaction_subcategories")
            .select("category_id,label")
            .eq("subcategory_id", str(body.subcategory_id))
            .maybe_single()
            .execute()
        )
        sub_row = as_dict_row(sub.data)
        if sub_row is None:
            raise HTTPException(status_code=400, detail="Invalid subcategory_id")
        c_id = str(sub_row["category_id"])
        sub_label = str(sub_row["label"])
        cat = (
            sb.table("personal_transaction_categories")
            .select("label")
            .eq("category_id", c_id)
            .maybe_single()
            .execute()
        )
        cat_row = as_dict_row(cat.data)
        if cat_row is None:
            raise HTTPException(status_code=400, detail="Invalid category for subcategory")
        cat_label = str(cat_row["label"])
    elif body.category_id is not None:
        cat = (
            sb.table("personal_transaction_categories")
            .select("label")
            .eq("category_id", str(body.category_id))
            .maybe_single()
            .execute()
        )
        cat_row2 = as_dict_row(cat.data)
        if cat_row2 is None:
            raise HTTPException(status_code=400, detail="Invalid category_id")
        cat_label = str(cat_row2["label"])
    if not cat_label:
        raise HTTPException(status_code=400, detail="Could not resolve category label")
    return cat_label, sub_label, c_id, s_id


@router.post("/moments", response_model=MomentOut)
async def create_moment(
    body: MomentCreate,
    user_id: str = Depends(get_current_user_id),
) -> MomentOut:
    sb = _sb()
    row = {
        "user_id": user_id,
        "title": body.title,
        "moment_type": body.moment_type,
        "duration_type": body.duration_type,
        "target_amount": float(body.target_amount) if body.target_amount is not None else None,
        "start_date": str(body.start_date) if body.start_date else None,
        "end_date": str(body.end_date) if body.end_date else None,
        "status": body.status,
    }
    try:
        res = sb.table("personal_moments").insert(row).execute()
        return MomentOut.model_validate(_one(res.data))
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/moments", response_model=list[MomentOut])
async def list_moments(user_id: str = Depends(get_current_user_id)) -> list[MomentOut]:
    sb = _sb()
    try:
        res = sb.table("personal_moments").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return [MomentOut.model_validate(r) for r in as_dict_rows(res.data)]
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.delete("/moments/{moment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_moment(
    moment_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> Response:
    sb = _sb()
    existing = sb.table("personal_moments").select("moment_id").eq("moment_id", str(moment_id)).eq("user_id", user_id).maybe_single().execute()
    if existing is None or not existing.data:
        raise HTTPException(status_code=404, detail="Moment not found")
    try:
        sb.table("personal_moments").delete().eq("moment_id", str(moment_id)).eq("user_id", user_id).execute()
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/cycles", response_model=CycleOut)
async def create_cycle(
    body: CycleCreate,
    user_id: str = Depends(get_current_user_id),
) -> CycleOut:
    sb = _sb()
    try:
        m = _exec(
            sb.table("personal_moments")
            .select("moment_id")
            .eq("moment_id", str(body.moment_id))
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if m.data is None:
            raise HTTPException(status_code=404, detail="Moment not found")
    except HTTPException:
        raise
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    row = {
        "moment_id": str(body.moment_id),
        "label": body.label,
        "start_date": str(body.start_date),
        "end_date": str(body.end_date),
        "allocated_budget": float(body.allocated_budget),
        "spent_amount": 0,
    }
    try:
        res = sb.table("personal_cycles").insert(row).execute()
        return CycleOut.model_validate(_one(res.data))
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/cycles", response_model=list[CycleOut])
async def list_cycles(
    user_id: str = Depends(get_current_user_id),
    moment_id: UUID | None = Query(default=None),
) -> list[CycleOut]:
    sb = _sb()
    try:
        if moment_id:
            own = _exec(
                sb.table("personal_moments")
                .select("moment_id")
                .eq("moment_id", str(moment_id))
                .eq("user_id", user_id)
                .maybe_single()
                .execute()
            )
            if own.data is None:
                return []
            res = (
                sb.table("personal_cycles")
                .select("*")
                .eq("moment_id", str(moment_id))
                .order("start_date", desc=True)
                .execute()
            )
        else:
            moments = sb.table("personal_moments").select("moment_id").eq("user_id", user_id).execute()
            mids = [str(m["moment_id"]) for m in as_dict_rows(moments.data)]
            if not mids:
                return []
            res = sb.table("personal_cycles").select("*").in_("moment_id", mids).order("start_date", desc=True).execute()
        return [CycleOut.model_validate(r) for r in as_dict_rows(res.data)]
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/transactions", response_model=TransactionOut)
async def add_transaction(
    body: TransactionCreate,
    user_id: str = Depends(get_current_user_id),
) -> TransactionOut:
    sb = _sb()
    if body.moment_id:
        try:
            chk = _exec(
                sb.table("personal_moments")
                .select("moment_id")
                .eq("moment_id", str(body.moment_id))
                .eq("user_id", user_id)
                .maybe_single()
                .execute()
            )
            if chk.data is None:
                raise HTTPException(status_code=404, detail="Moment not found")
        except APIError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e

    if body.cycle_id:
        try:
            cyc = _exec(
                sb.table("personal_cycles")
                .select("cycle_id,moment_id")
                .eq("cycle_id", str(body.cycle_id))
                .maybe_single()
                .execute()
            )
            cyc_row = as_dict_row(cyc.data)
            if cyc_row is None:
                raise HTTPException(status_code=404, detail="Cycle not found")
            mid = str(cyc_row["moment_id"])
            own = _exec(
                sb.table("personal_moments")
                .select("moment_id")
                .eq("moment_id", mid)
                .eq("user_id", user_id)
                .maybe_single()
                .execute()
            )
            if own.data is None:
                raise HTTPException(status_code=404, detail="Cycle not found")
        except HTTPException:
            raise
        except APIError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e

    row: dict[str, Any] = {
        "user_id": user_id,
        "amount": float(body.amount),
        "merchant": body.merchant,
        "description": body.description,
        "transaction_date": str(body.transaction_date),
        "moment_id": str(body.moment_id) if body.moment_id else None,
        "cycle_id": str(body.cycle_id) if body.cycle_id else None,
    }
    if body.subcategory_id is not None:
        row["subcategory_id"] = str(body.subcategory_id)
    elif body.category_id is not None:
        row["category_id"] = str(body.category_id)
    if body.category is not None:
        row["category"] = body.category
    if body.subcategory is not None:
        row["subcategory"] = body.subcategory
    try:
        res = sb.table("personal_transactions").insert(row).execute()
        out = TransactionOut.model_validate(_one(res.data))
        if body.cycle_id:
            personal_service.recompute_cycle_spent(sb, str(body.cycle_id))
            personal_service.recompute_budget_spent_for_cycle(sb, str(body.cycle_id))
        return out
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/transactions", response_model=list[TransactionOut])
async def list_transactions(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(default=50, ge=1, le=500),
    cycle_id: UUID | None = None,
    month: str | None = Query(default=None, description="YYYY-MM"),
    category_id: UUID | None = None,
    merchant: str | None = Query(default=None, max_length=200),
) -> list[TransactionOut]:
    sb = _sb()
    try:
        q = sb.table("personal_transactions").select("*").eq("user_id", user_id)
        if cycle_id is not None:
            q = q.eq("cycle_id", str(cycle_id))
        if category_id is not None:
            q = q.eq("category_id", str(category_id))
        if merchant and merchant.strip():
            q = q.ilike("merchant", f"%{merchant.strip()}%")
        if month and month.strip():
            parts = month.strip().split("-")
            if len(parts) != 2:
                raise HTTPException(status_code=400, detail="month must be YYYY-MM")
            y, mo = int(parts[0]), int(parts[1])
            start, end = _month_date_bounds(y, mo)
            q = q.gte("transaction_date", str(start)).lte("transaction_date", str(end))
        res = q.order("transaction_date", desc=True).limit(limit).execute()
        return [TransactionOut.model_validate(r) for r in as_dict_rows(res.data)]
    except HTTPException:
        raise
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/spend-breakdown", response_model=SpendBreakdownOut)
async def spend_breakdown(
    user_id: str = Depends(get_current_user_id),
    cycle_id: UUID | None = None,
    month: str | None = Query(default=None, description="YYYY-MM; defaults to current month if no cycle_id"),
) -> SpendBreakdownOut:
    sb = _sb()
    start: date | None = None
    end: date | None = None
    if month and month.strip():
        parts = month.strip().split("-")
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="month must be YYYY-MM")
        y, mo = int(parts[0]), int(parts[1])
        start, end = _month_date_bounds(y, mo)
    elif cycle_id is None:
        today = date.today()
        start, end = _month_date_bounds(today.year, today.month)
    rows, total = personal_service.spend_breakdown_aggregate(
        sb,
        user_id,
        cycle_id=str(cycle_id) if cycle_id else None,
        start=start,
        end=end,
    )
    return SpendBreakdownOut(
        rows=[
            SpendBreakdownRowOut(
                label=r["label"],
                category_id=UUID(r["category_id"]) if r.get("category_id") else None,
                amount=Decimal(str(round(r["amount"], 2))),
            )
            for r in rows
        ],
        total=Decimal(str(round(total, 2))),
    )


@router.patch("/transactions/{transaction_id}", response_model=TransactionOut)
async def update_transaction(
    transaction_id: UUID,
    body: TransactionUpdate,
    user_id: str = Depends(get_current_user_id),
) -> TransactionOut:
    sb = _sb()
    existing = _fetch_transaction(sb, user_id, transaction_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    payload = _patch_transaction_payload(body)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    patch_fields = body.model_dump(exclude_unset=True)
    if patch_fields.get("moment_id"):
        chk = _exec(
            sb.table("personal_moments")
            .select("moment_id")
            .eq("moment_id", str(body.moment_id))
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if chk.data is None:
            raise HTTPException(status_code=404, detail="Moment not found")
    if patch_fields.get("cycle_id"):
        cyc = _exec(
            sb.table("personal_cycles")
            .select("cycle_id,moment_id")
            .eq("cycle_id", str(body.cycle_id))
            .maybe_single()
            .execute()
        )
        cyc_row = as_dict_row(cyc.data)
        if cyc_row is None:
            raise HTTPException(status_code=404, detail="Cycle not found")
        mid = str(cyc_row["moment_id"])
        own = _exec(
            sb.table("personal_moments")
            .select("moment_id")
            .eq("moment_id", mid)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if own.data is None:
            raise HTTPException(status_code=404, detail="Cycle not found")

    old_cycle = existing.get("cycle_id")
    try:
        res = _exec(
            sb.table("personal_transactions")
            .update(payload)
            .eq("transaction_id", str(transaction_id))
            .eq("user_id", user_id)
            .execute()
        )
        rows_up = as_dict_rows(res.data)
        row: dict[str, Any] | None = rows_up[0] if rows_up else None
        if row is None:
            r2 = _exec(
                sb.table("personal_transactions")
                .select("*")
                .eq("transaction_id", str(transaction_id))
                .eq("user_id", user_id)
                .maybe_single()
                .execute()
            )
            row = as_dict_row(r2.data)
        if row is None:
            raise HTTPException(status_code=500, detail="Update returned no row")
        out = TransactionOut.model_validate(row)
    except HTTPException:
        raise
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    new_cycle = str(out.cycle_id) if out.cycle_id else None
    oc = str(old_cycle) if old_cycle else None
    for cid in {x for x in (oc, new_cycle) if x}:
        personal_service.recompute_cycle_spent(sb, cid)
        personal_service.recompute_budget_spent_for_cycle(sb, cid)
    return out


@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> Response:
    sb = _sb()
    existing = _fetch_transaction(sb, user_id, transaction_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    old_cycle = existing.get("cycle_id")
    try:
        sb.table("personal_transactions").delete().eq("transaction_id", str(transaction_id)).eq(
            "user_id", user_id
        ).execute()
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    if old_cycle:
        cid = str(old_cycle)
        personal_service.recompute_cycle_spent(sb, cid)
        personal_service.recompute_budget_spent_for_cycle(sb, cid)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/transaction-categories", response_model=list[TransactionCategoryTreeOut])
async def list_transaction_categories(
    _user_id: str = Depends(get_current_user_id),
) -> list[TransactionCategoryTreeOut]:
    """Global spend taxonomy (seeded reference rows) for pickers."""
    sb = _sb()
    try:
        cats = _exec(
            sb.table("personal_transaction_categories")
            .select("category_id,slug,label,sort_order")
            .order("sort_order")
            .execute()
        )
        subs = _exec(
            sb.table("personal_transaction_subcategories")
            .select("subcategory_id,category_id,slug,label,sort_order")
            .order("sort_order")
            .execute()
        )
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    by_cat: dict[str, list[TransactionSubcategoryRefOut]] = {}
    for s in as_dict_rows(subs.data):
        cid = str(s["category_id"])
        by_cat.setdefault(cid, []).append(TransactionSubcategoryRefOut.model_validate(s))
    out: list[TransactionCategoryTreeOut] = []
    for c in as_dict_rows(cats.data):
        cid = str(c["category_id"])
        out.append(
            TransactionCategoryTreeOut(
                category_id=c["category_id"],
                slug=c["slug"],
                label=c["label"],
                sort_order=c["sort_order"],
                subcategories=by_cat.get(cid, []),
            )
        )
    return out


@router.post("/budgets", response_model=BudgetOut)
async def create_budget(
    body: BudgetCreate,
    user_id: str = Depends(get_current_user_id),
) -> BudgetOut:
    sb = _sb()
    try:
        cyc = _exec(
            sb.table("personal_cycles")
            .select("cycle_id,moment_id")
            .eq("cycle_id", str(body.cycle_id))
            .maybe_single()
            .execute()
        )
        cyc_br = as_dict_row(cyc.data)
        if cyc_br is None:
            raise HTTPException(status_code=404, detail="Cycle not found")
        mid = str(cyc_br["moment_id"])
        own = _exec(
            sb.table("personal_moments")
            .select("moment_id")
            .eq("moment_id", mid)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if own.data is None:
            raise HTTPException(status_code=404, detail="Cycle not found")
    except HTTPException:
        raise
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    try:
        cat_label, sub_label, c_id, s_id = _resolve_budget_labels(sb, body)
    except HTTPException:
        raise
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    row: dict[str, Any] = {
        "cycle_id": str(body.cycle_id),
        "category": cat_label,
        "allocated_amount": float(body.allocated_amount),
        "spent_amount": 0,
    }
    if sub_label:
        row["subcategory"] = sub_label
    if c_id:
        row["category_id"] = c_id
    if s_id:
        row["subcategory_id"] = s_id
    try:
        res = sb.table("personal_budgets").insert(row).execute()
        out = BudgetOut.model_validate(_one(res.data))
        personal_service.recompute_budget_spent_for_cycle(sb, str(body.cycle_id))
        return out
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/budgets", response_model=list[BudgetOut])
async def list_budgets(
    user_id: str = Depends(get_current_user_id),
    cycle_id: UUID = Query(...),
) -> list[BudgetOut]:
    sb = _sb()
    try:
        cyc = _exec(
            sb.table("personal_cycles")
            .select("cycle_id,moment_id")
            .eq("cycle_id", str(cycle_id))
            .maybe_single()
            .execute()
        )
        cyc_lb = as_dict_row(cyc.data)
        if cyc_lb is None:
            raise HTTPException(status_code=404, detail="Cycle not found")
        mid = str(cyc_lb["moment_id"])
        own = _exec(
            sb.table("personal_moments")
            .select("moment_id")
            .eq("moment_id", mid)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if own.data is None:
            raise HTTPException(status_code=404, detail="Cycle not found")
        res = _exec(sb.table("personal_budgets").select("*").eq("cycle_id", str(cycle_id)).execute())
        return [BudgetOut.model_validate(r) for r in as_dict_rows(res.data)]
    except HTTPException:
        raise
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/goals", response_model=GoalOut)
async def create_goal(
    body: GoalCreate,
    user_id: str = Depends(get_current_user_id),
) -> GoalOut:
    sb = _sb()
    row = {
        "user_id": user_id,
        "title": body.title,
        "target_amount": float(body.target_amount),
        "saved_amount": float(body.saved_amount),
        "target_date": str(body.target_date) if body.target_date else None,
    }
    try:
        res = sb.table("personal_goals").insert(row).execute()
        return GoalOut.model_validate(_one(res.data))
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/goals", response_model=list[GoalOut])
async def list_goals(user_id: str = Depends(get_current_user_id)) -> list[GoalOut]:
    sb = _sb()
    try:
        res = sb.table("personal_goals").select("*").eq("user_id", user_id).order("target_date").execute()
        return [GoalOut.model_validate(r) for r in as_dict_rows(res.data)]
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/signals", response_model=SignalOut)
async def create_signal(
    body: SignalCreate,
    user_id: str = Depends(get_current_user_id),
) -> SignalOut:
    sb = _sb()
    row = {
        "user_id": user_id,
        "signal_type": body.signal_type,
        "severity": body.severity,
        "message": body.message,
    }
    try:
        res = sb.table("personal_signals").insert(row).execute()
        return SignalOut.model_validate(_one(res.data))
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/signals", response_model=list[SignalOut])
async def list_signals(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[SignalOut]:
    sb = _sb()
    try:
        res = (
            sb.table("personal_signals")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return [SignalOut.model_validate(r) for r in as_dict_rows(res.data)]
    except APIError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/signals/evaluate")
async def evaluate_signals(user_id: str = Depends(get_current_user_id)) -> dict[str, int]:
    sb = _sb()
    insights = personal_service.generate_insights(user_id, sb)
    personal_service.persist_signals_from_insights(sb, user_id, insights)
    return {"insights": len(insights)}


@router.get("/summary", response_model=PersonalSummaryOut)
async def get_summary(user_id: str = Depends(get_current_user_id)) -> PersonalSummaryOut:
    sb = _sb()
    raw = personal_service.build_summary(sb, user_id)
    signals = [SignalOut.model_validate(s) for s in raw["recent_signals"]]
    return PersonalSummaryOut(
        money_left=raw["money_left"],
        lifestyle_budget=raw["lifestyle_budget"],
        savings_target=raw["savings_target"],
        planned_monthly_envelope=raw["planned_monthly_envelope"],
        plan_remaining=raw["plan_remaining"],
        potential_savings=raw["potential_savings"],
        total_allocated=raw["total_allocated"],
        total_spent_period=raw["total_spent_period"],
        total_income_period=raw["total_income_period"],
        period_label=raw["period_label"],
        insights=raw["insights"],
        top_category=raw["top_category"],
        recent_signals=signals,
    )
