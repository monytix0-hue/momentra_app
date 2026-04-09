"use client";

import { useMemo } from "react";
import type { BusinessDashboard } from "@/lib/api/business";
import { bizMoney, bizNum } from "@/lib/business/format";

export function BusinessControlSummaryCard({
  summary,
  pendingCount,
  pendingAmount,
  currency,
}: {
  summary: BusinessDashboard["summary"];
  pendingCount: number;
  pendingAmount: number;
  currency: string;
}) {
  const { heroLabel, heroValue, subline, secondary } = useMemo(() => {
    const budget = bizNum(summary.total_budget);
    const spent = bizNum(summary.total_spent);
    const pending = pendingAmount;
    const remaining = summary.remaining != null ? bizNum(summary.remaining) : Math.max(0, budget - spent);

    if (pendingCount > 0 && pending >= remaining * 0.15) {
      return {
        heroLabel: "Awaiting approval",
        heroValue: bizMoney(pending, currency),
        subline:
          pendingCount === 1
            ? "One request needs a decision — approvals unlock spend."
            : `${pendingCount} requests need decisions — keep the pipeline moving.`,
        secondary: [
          { k: "Budget", v: bizMoney(budget, currency) },
          { k: "Approved spend", v: bizMoney(spent, currency) },
          { k: "Remaining", v: bizMoney(remaining, currency) },
        ],
      };
    }

    const calm =
      remaining > budget * 0.25
        ? "Spend is under control relative to budget."
        : remaining > 0
          ? "Headroom is tighter — watch unit and cost center pacing."
          : "At or past budget envelope — route decisions carefully.";

    return {
      heroLabel: "Left to deploy",
      heroValue: bizMoney(Math.max(0, remaining), currency),
      subline: calm,
      secondary: [
        { k: "Budget", v: bizMoney(budget, currency) },
        { k: "Approved", v: bizMoney(spent, currency) },
        { k: "In approvals", v: bizMoney(pending, currency) },
      ],
    };
  }, [summary, pendingCount, pendingAmount, currency]);

  return (
    <div className="relative overflow-hidden rounded-m-card border border-surface-300/90 bg-gradient-to-br from-surface-100 via-surface-100 to-[color-mix(in_srgb,var(--b-surf)_55%,var(--s100))] p-m-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_24px_48px_-32px_rgba(0,0,0,0.6)] transition-shadow duration-500 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_28px_56px_-28px_rgba(212,136,10,0.12)]">
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(212,136,10,0.22),transparent_65%)] blur-2xl"
        aria-hidden
      />
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ctx-accent">Control summary</p>
      <p className="mt-m-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-4">{heroLabel}</p>
      <p className="mt-1 font-mono text-[clamp(1.75rem,4vw,2.35rem)] font-semibold leading-none tracking-tight text-ink">
        {heroValue}
      </p>
      <p className="mt-m-2 max-w-xl text-[14px] leading-relaxed text-ink-2">{subline}</p>
      <div className="mt-m-4 grid grid-cols-3 gap-3 border-t border-surface-300/60 pt-m-4">
        {secondary.map((row) => (
          <div key={row.k} className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.12em] text-ink-4">{row.k}</p>
            <p className="mt-1 truncate text-[15px] font-semibold text-ink">{row.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
