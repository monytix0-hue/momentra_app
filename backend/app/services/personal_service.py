from __future__ import annotations

import calendar
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from postgrest.exceptions import APIError

from app.postgrest_rows import as_dict_rows
from supabase import Client


def _f(x: Any) -> float:
    return float(x) if x is not None else 0.0


def _safe_date(value: Any) -> date | None:
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        try:
            return date.fromisoformat(s[:10])
        except ValueError:
            return None
    return None


def _is_active_on(row: dict[str, Any], today: date) -> bool:
    if str(row.get("status") or "").strip().lower() not in {"", "active"}:
        return False
    start_d = _safe_date(row.get("start_date"))
    end_d = _safe_date(row.get("end_date"))
    if start_d is not None and today < start_d:
        return False
    if end_d is not None and today > end_d:
        return False
    return True


def recompute_cycle_spent(sb: Client, cycle_id: str) -> Decimal:
    r = sb.table("personal_transactions").select("amount").eq("cycle_id", cycle_id).execute()
    rows = as_dict_rows(r.data)
    total = sum(_f(row["amount"]) for row in rows)
    sb.table("personal_cycles").update({"spent_amount": total}).eq("cycle_id", cycle_id).execute()
    return Decimal(str(total))


def recompute_budget_spent_for_cycle(sb: Client, cycle_id: str) -> None:
    tx = (
        sb.table("personal_transactions")
        .select("amount", "category", "category_id", "subcategory_id")
        .eq("cycle_id", cycle_id)
        .execute()
    )
    tx_rows = as_dict_rows(tx.data)
    budgets = sb.table("personal_budgets").select("*").eq("cycle_id", cycle_id).execute()
    for b in as_dict_rows(budgets.data):
        sub_id = b.get("subcategory_id")
        cat_id = b.get("category_id")
        cat_str = (b.get("category") or "").strip()
        total = 0.0
        for t in tx_rows:
            amt = _f(t.get("amount"))
            if sub_id:
                if t.get("subcategory_id") is not None and str(t["subcategory_id"]) == str(sub_id):
                    total += amt
            elif cat_id:
                tid = t.get("category_id")
                if tid is not None and str(tid) == str(cat_id):
                    total += amt
                elif tid is None and cat_str and (t.get("category") or "").strip() == cat_str:
                    total += amt
            elif cat_str:
                if (t.get("category") or "").strip() == cat_str:
                    total += amt
        sb.table("personal_budgets").update({"spent_amount": total}).eq("budget_id", b["budget_id"]).execute()


def spend_breakdown_aggregate(
    sb: Client,
    user_id: str,
    *,
    cycle_id: str | None = None,
    start: date | None = None,
    end: date | None = None,
) -> tuple[list[dict[str, Any]], float]:
    """Group transaction amounts by category (id when present, else label)."""
    try:
        q = (
            sb.table("personal_transactions")
            .select("amount,category,category_id")
            .eq("user_id", user_id)
        )
        if cycle_id:
            q = q.eq("cycle_id", cycle_id)
        if start is not None and end is not None:
            q = q.gte("transaction_date", str(start)).lte("transaction_date", str(end))
        rows = as_dict_rows(q.execute().data)
    except APIError:
        return [], 0.0
    buckets: dict[str, dict[str, Any]] = {}
    total = 0.0
    for t in rows:
        amt = _f(t.get("amount"))
        total += amt
        cid = t.get("category_id")
        raw_lbl = (t.get("category") or "").strip() or "Uncategorized"
        key = str(cid) if cid is not None else f"lbl:{raw_lbl}"
        if key not in buckets:
            buckets[key] = {
                "label": raw_lbl,
                "category_id": str(cid) if cid is not None else None,
                "amount": 0.0,
            }
        buckets[key]["amount"] += amt
    ordered = sorted(buckets.values(), key=lambda x: x["amount"], reverse=True)
    return ordered, total


def calculate_money_left(allocated: Decimal, spent: Decimal) -> Decimal:
    return allocated - spent


def predict_burn_rate(
    transactions: list[dict[str, Any]],
    window_days: int = 30,
) -> tuple[Decimal, Decimal]:
    """Returns (avg_daily_spend, total_in_window)."""
    if not transactions or window_days <= 0:
        return Decimal("0"), Decimal("0")
    total = sum(_f(t.get("amount")) for t in transactions)
    avg = total / window_days
    return Decimal(str(round(avg, 2))), Decimal(str(round(total, 2)))


def generate_insights(
    user_id: str,
    sb: Client,
    *,
    today: date | None = None,
) -> list[str]:
    today = today or date.today()
    insights: list[str] = []
    start_m = date(today.year, today.month, 1)
    if today.month == 12:
        end_m = date(today.year + 1, 1, 1) - timedelta(days=1)
    else:
        end_m = date(today.year, today.month + 1, 1) - timedelta(days=1)

    try:
        tx_res = (
            sb.table("personal_transactions")
            .select("amount,category,transaction_date")
            .eq("user_id", user_id)
            .gte("transaction_date", str(start_m))
            .lte("transaction_date", str(end_m))
            .execute()
        )
        month_tx = as_dict_rows(tx_res.data)
    except APIError:
        return ["Unable to load transactions for insights."]

    month_spent = sum(_f(t.get("amount")) for t in month_tx)
    if month_tx:
        by_cat: dict[str, float] = {}
        for t in month_tx:
            c = (t.get("category") or "uncategorized").strip() or "uncategorized"
            by_cat[c] = by_cat.get(c, 0) + _f(t.get("amount"))
        top = max(by_cat, key=lambda k: by_cat[k])
        insights.append(f"Highest category this month: {top} (~₹{by_cat[top]:,.0f}).")

    win_start = today - timedelta(days=30)
    try:
        win_res = (
            sb.table("personal_transactions")
            .select("amount,transaction_date")
            .eq("user_id", user_id)
            .gte("transaction_date", str(win_start))
            .lte("transaction_date", str(today))
            .execute()
        )
        window_tx = as_dict_rows(win_res.data)
    except APIError:
        window_tx = []

    avg_daily, win_total = predict_burn_rate(window_tx, 30)
    if avg_daily > 0:
        last_day = calendar.monthrange(today.year, today.month)[1]
        days_left = max(0, last_day - today.day)
        projected = avg_daily * Decimal(days_left)
        insights.append(
            f"At your ~30-day pace (~₹{avg_daily:,.0f}/day), you might spend about "
            f"₹{projected:,.0f} more before month-end."
        )
    if month_spent > 0 and win_total > 0:
        prev_start = win_start - timedelta(days=30)
        prev_res = (
            sb.table("personal_transactions")
            .select("amount")
            .eq("user_id", user_id)
            .gte("transaction_date", str(prev_start))
            .lt("transaction_date", str(win_start))
            .execute()
        )
        prev_total = sum(_f(t.get("amount")) for t in as_dict_rows(prev_res.data))
        if prev_total > 0:
            wt = float(win_total)
            delta_pct = ((wt - prev_total) / prev_total) * 100
            if delta_pct > 5:
                insights.append(f"You're spending about {delta_pct:.0f}% more than the prior 30 days.")
            elif delta_pct < -5:
                insights.append(f"You're spending about {abs(delta_pct):.0f}% less than the prior 30 days.")

    try:
        moments = sb.table("personal_moments").select("moment_id").eq("user_id", user_id).execute()
        mids = [str(m["moment_id"]) for m in as_dict_rows(moments.data)]
        if mids:
            cyc = (
                sb.table("personal_cycles")
                .select("cycle_id,allocated_budget,spent_amount,label,start_date,end_date")
                .in_("moment_id", mids)
                .lte("start_date", str(today))
                .gte("end_date", str(today))
                .execute()
            )
            for c in as_dict_rows(cyc.data):
                alloc = _f(c.get("allocated_budget"))
                spent = _f(c.get("spent_amount"))
                if alloc > 0 and spent / alloc >= 0.85:
                    insights.append(
                        f"Close to budget limit on cycle “{c.get('label')}” "
                        f"({spent / alloc * 100:.0f}% used)."
                    )
            active_cycle_ids = [str(x["cycle_id"]) for x in as_dict_rows(cyc.data) if x.get("cycle_id")]
            for cid in active_cycle_ids:
                try:
                    bud = (
                        sb.table("personal_budgets")
                        .select("category", "allocated_amount", "spent_amount")
                        .eq("cycle_id", cid)
                        .execute()
                    )
                    for b in as_dict_rows(bud.data):
                        ba = _f(b.get("allocated_amount"))
                        bs = _f(b.get("spent_amount"))
                        if ba > 0 and bs / ba >= 0.85:
                            label = (b.get("category") or "Category").strip() or "Category"
                            insights.append(
                                f"Category budget “{label}” is about {bs / ba * 100:.0f}% used this cycle."
                            )
                except APIError:
                    pass
    except APIError:
        pass

    if not insights:
        insights.append("Add a few transactions to unlock spending insights.")
    return insights


def persist_signals_from_insights(sb: Client, user_id: str, insights: list[str]) -> None:
    """Store high-signal rows for the UX trigger bar."""
    for msg in insights[:5]:
        if (
            "budget limit" in msg.lower()
            or "overspend" in msg.lower()
            or "category budget" in msg.lower()
        ):
            _insert_signal(sb, user_id, "budget_pressure", "high", msg)
        elif "% more" in msg:
            _insert_signal(sb, user_id, "spend_trend", "medium", msg)
        elif "% less" in msg or "saved" in msg.lower():
            _insert_signal(sb, user_id, "positive", "low", msg)


def _insert_signal(sb: Client, user_id: str, stype: str, severity: str, message: str) -> None:
    try:
        sb.table("personal_signals").insert(
            {"user_id": user_id, "signal_type": stype, "severity": severity, "message": message}
        ).execute()
    except APIError:
        pass


def build_summary(sb: Client, user_id: str) -> dict[str, Any]:
    today = date.today()
    start_m = date(today.year, today.month, 1)
    if today.month == 12:
        end_m = date(today.year + 1, 1, 1) - timedelta(days=1)
    else:
        end_m = date(today.year, today.month + 1, 1) - timedelta(days=1)

    total_allocated = Decimal("0")
    savings_target = Decimal("0")
    try:
        moments = (
            sb.table("personal_moments")
            .select("moment_id,moment_type,target_amount,status,start_date,end_date")
            .eq("user_id", user_id)
            .execute()
        )
        moment_rows = as_dict_rows(moments.data)
        mids = [str(m["moment_id"]) for m in moment_rows if m.get("moment_id")]
        for m in moment_rows:
            if str(m.get("moment_type") or "").strip().lower() != "budget":
                continue
            if not _is_active_on(m, today):
                continue
            savings_target += Decimal(str(_f(m.get("target_amount"))))
        if mids:
            cycles = (
                sb.table("personal_cycles")
                .select("allocated_budget,spent_amount")
                .in_("moment_id", mids)
                .lte("start_date", str(today))
                .gte("end_date", str(today))
                .execute()
            )
            for c in as_dict_rows(cycles.data):
                total_allocated += Decimal(str(_f(c.get("allocated_budget"))))
    except APIError:
        pass

    try:
        tx_m = (
            sb.table("personal_transactions")
            .select("amount,category")
            .eq("user_id", user_id)
            .gte("transaction_date", str(start_m))
            .lte("transaction_date", str(end_m))
            .execute()
        )
        month_rows = as_dict_rows(tx_m.data)
    except APIError:
        month_rows = []

    # Separate income from expenses — "Income" category (slug: income, label contains Income)
    income_rows = [t for t in month_rows if (t.get("category") or "").strip().lower() in ("income",)]
    expense_rows = [t for t in month_rows if (t.get("category") or "").strip().lower() not in ("income",)]

    total_income_period = Decimal(str(round(sum(_f(t.get("amount")) for t in income_rows), 2)))
    total_spent_period = Decimal(str(round(sum(_f(t.get("amount")) for t in expense_rows), 2)))

    # Financial Intent Model
    lifestyle_budget = total_allocated
    planned_envelope = lifestyle_budget + savings_target
    plan_remaining = planned_envelope - total_spent_period
    potential_savings = planned_envelope - total_spent_period
    # Compatibility field for older clients; mirrors plan_remaining now.
    money_left = plan_remaining

    top_category = None
    if expense_rows:
        by_cat: dict[str, float] = {}
        for t in expense_rows:
            c = (t.get("category") or "uncategorized").strip() or "uncategorized"
            by_cat[c] = by_cat.get(c, 0) + _f(t.get("amount"))
        top_category = max(by_cat, key=lambda k: by_cat[k])

    insights = generate_insights(user_id, sb, today=today)

    try:
        sig_res = (
            sb.table("personal_signals")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(8)
            .execute()
        )
        recent_signals = as_dict_rows(sig_res.data)
    except APIError:
        recent_signals = []

    return {
        "money_left": money_left,
        "lifestyle_budget": lifestyle_budget,
        "savings_target": savings_target,
        "planned_monthly_envelope": planned_envelope,
        "plan_remaining": plan_remaining,
        "potential_savings": potential_savings,
        "total_allocated": total_allocated,
        "total_spent_period": total_spent_period,
        "total_income_period": total_income_period,
        "period_label": f"{calendar.month_name[today.month]} {today.year}",
        "insights": insights,
        "top_category": top_category,
        "recent_signals": recent_signals,
    }
