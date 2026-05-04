"use client";

import { useMemo } from "react";
import type { BusinessDashboard } from "@/lib/api/business";
import { bizMoney, bizNum } from "@/lib/business/format";

export function BusinessControlSummaryV3({
  summary,
  pendingCount,
  pendingAmount,
  unitsActive,
  currency,
}: {
  summary: BusinessDashboard["summary"];
  pendingCount: number;
  pendingAmount: number;
  unitsActive: number;
  currency: string;
}) {
  const model = useMemo(() => {
    const budget = bizNum(summary.total_budget);
    const approved = bizNum(summary.total_spent);
    const pending = pendingAmount;
    const remaining = summary.remaining != null ? bizNum(summary.remaining) : Math.max(0, budget - approved);
    const pressure = budget > 0 ? Math.min(100, Math.round(((approved + pending) / budget) * 100)) : 0;
    const score = Math.max(0, Math.min(100, 100 - Math.round(pressure * 0.6) - Math.min(20, pendingCount * 4)));

    if (pendingCount > 0) {
      return {
        hero: `${pendingCount} approval${pendingCount > 1 ? "s" : ""} waiting`,
        sub: "Operational spend is blocked by approvals.",
        heroSub: bizMoney(pending, currency),
        score,
        secondary: [
          { k: "Budget", v: bizMoney(budget, currency) },
          { k: "Approved", v: bizMoney(approved, currency) },
          { k: "In approvals", v: bizMoney(pending, currency) },
          { k: "Units active", v: String(unitsActive) },
        ],
      };
    }

    return {
      hero: `${bizMoney(Math.max(0, remaining), currency)} remaining`,
      sub: remaining > 0 ? "Spend is stable this week." : "Budget envelope is fully deployed.",
      heroSub: "Control runway",
      score,
      secondary: [
        { k: "Budget", v: bizMoney(budget, currency) },
        { k: "Approved", v: bizMoney(approved, currency) },
        { k: "In approvals", v: bizMoney(pending, currency) },
        { k: "Units active", v: String(unitsActive) },
      ],
    };
  }, [summary, pendingCount, pendingAmount, unitsActive, currency]);

  return (
    <section className="rounded-m-card border bg-[color:var(--b-surf)] p-[18px]" style={{ borderColor: "color-mix(in srgb, var(--b-acc) 20%, transparent)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/35">Control summary</p>
      <div className="mt-m-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[clamp(1.35rem,3.2vw,2.1rem)] font-semibold leading-tight text-ink">{model.hero}</h2>
          <p className="mt-1 text-[13px] text-ink-2">{model.sub}</p>
        </div>
        <div className="rounded-m-chip border px-m-3 py-2 text-right" style={{ borderColor: "color-mix(in srgb, var(--b-acc) 20%, transparent)", background: "var(--b-cover)" }}>
          <p className="text-[10px] uppercase tracking-[0.1em] text-ink-4">Control score</p>
          <p className="text-[20px] font-semibold text-ctx-accent">{model.score}/100</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">{model.heroSub}</p>
      <div className="mt-m-4 grid gap-3 border-t border-surface-300/60 pt-m-4 sm:grid-cols-4">
        {model.secondary.map((s) => (
          <div key={s.k} className="rounded-m-chip p-3" style={{ background: "var(--b-cover)" }}>
            <p className="text-[10px] uppercase tracking-[0.12em] text-ink/35">{s.k}</p>
            <p className="mt-1 text-[18px] font-semibold text-[color:var(--b-text)]">{s.v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
