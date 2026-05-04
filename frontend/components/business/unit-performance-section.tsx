"use client";

import type { BusinessDashboard, BusinessUnit } from "@/lib/api/business";
import { bizMoney, bizNum } from "@/lib/business/format";

type Health = "strong" | "watch" | "hot";

function healthFromRatio(r: number | null): Health {
  if (r == null) return "strong";
  if (r >= 1) return "hot";
  if (r >= 0.85) return "watch";
  return "strong";
}

function healthLabel(h: Health): string {
  if (h === "strong") return "On track";
  if (h === "watch") return "Watch";
  return "Over";
}

const healthUi: Record<
  Health,
  { bar: string; pill: string; glow: string }
> = {
  strong: {
    bar: "bg-urgency-clear-value",
    pill: "border-urgency-clear-value/40 bg-urgency-clear-value/12 text-urgency-clear-value",
    glow: "shadow-[0_0_24px_-8px_rgba(16,185,129,0.35)]",
  },
  watch: {
    bar: "bg-[var(--u-med)]",
    pill: "border-[color-mix(in_srgb,var(--u-med)_45%,transparent)] bg-[color-mix(in_srgb,var(--u-med)_14%,transparent)] text-[var(--u-med-t)]",
    glow: "shadow-[0_0_24px_-8px_rgba(245,158,11,0.35)]",
  },
  hot: {
    bar: "bg-urgency-high",
    pill: "border-urgency-high/45 bg-urgency-high/12 text-urgency-high-t",
    glow: "shadow-[0_0_24px_-8px_rgba(226,75,74,0.4)]",
  },
};

export function UnitPerformanceSection({
  unitBreakdown,
  units,
  currency,
}: {
  unitBreakdown: BusinessDashboard["unit_breakdown"];
  units: BusinessUnit[];
  currency: string;
}) {
  const typeById = Object.fromEntries(units.map((u) => [u.unit_id, u.unit_type]));

  if (!unitBreakdown.length) {
    return (
      <section id="business-section-units" className="scroll-mt-24 rounded-m-card border border-dashed border-surface-300/80 p-m-6 text-center">
        <p className="text-[14px] text-ink-3">Add a store or branch to unlock unit-level control.</p>
      </section>
    );
  }

  return (
    <section
      id="business-section-units"
      className="scroll-mt-24 rounded-m-card border border-surface-300/80 bg-surface-100/90 p-m-4"
    >
      <div className="mb-m-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ctx-accent">Unit performance</p>
        <h2 className="mt-1 text-[18px] font-semibold text-ink">Where spend is landing</h2>
        <p className="mt-1 text-[13px] text-ink-3">
          Approved spend vs unit envelopes — multi-location control at a glance.
        </p>
      </div>
      <div className="space-y-m-3">
        {unitBreakdown.map((row) => {
          const spent = bizNum(row.amount);
          const lim = row.budget_limit != null ? bizNum(row.budget_limit) : null;
          const ratio = row.utilization_ratio;
          const pct = ratio != null ? Math.min(100, ratio * 100) : lim && lim > 0 ? Math.min(100, (spent / lim) * 100) : 0;
          const h = healthFromRatio(ratio);
          const ui = healthUi[h];
          const ut = typeById[row.key] ?? "unit";

          return (
            <div
              key={row.key}
              className={`rounded-m-card border border-surface-300/70 bg-bg2/90 p-m-4 transition-all duration-300 hover:border-ctx-accent/20 ${ui.glow}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-ink">{row.label}</p>
                  <p className="mt-0.5 text-[12px] capitalize text-ink-3">{ut}</p>
                </div>
                <span
                  className={`inline-flex rounded-m-chip border px-m-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${ui.pill}`}
                >
                  {healthLabel(h)}
                </span>
              </div>
              <div className="mt-m-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]">
                <span className="font-semibold tabular-nums text-ink">{bizMoney(spent, currency)}</span>
                <span className="text-ink-4">/</span>
                <span className="tabular-nums text-ink-2">
                  {lim != null && lim > 0 ? bizMoney(lim, currency) : "No cap"}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-300/60">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${ui.bar}`}
                  style={{ width: `${lim && lim > 0 ? pct : Math.min(spent > 0 ? 8 : 0, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
