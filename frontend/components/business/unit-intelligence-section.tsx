"use client";

import type { BusinessDashboard, BusinessUnit } from "@/lib/api/business";
import { bizMoney, bizNum } from "@/lib/business/format";
import { UnitPerformanceSection } from "@/components/business/unit-performance-section";

export function UnitIntelligenceSection({
  unitBreakdown,
  units,
  currency,
}: {
  unitBreakdown: BusinessDashboard["unit_breakdown"];
  units: BusinessUnit[];
  currency: string;
}) {
  const sorted = [...unitBreakdown].sort((a, b) => bizNum(b.amount) - bizNum(a.amount));
  const highest = sorted[0];
  const atRisk = [...unitBreakdown].sort((a, b) => (b.utilization_ratio ?? 0) - (a.utilization_ratio ?? 0))[0];
  const calm = [...unitBreakdown].filter((u) => (u.utilization_ratio ?? 0) < 0.7)[0];

  return (
    <section className="space-y-m-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-m-chip border border-surface-300/70 bg-surface-100/85 p-m-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-ink-4">Highest spend</p>
          <p className="mt-1 text-[13px] font-semibold text-ink">{highest ? highest.label : "No units"}</p>
          <p className="text-[12px] text-ink-3">{highest ? bizMoney(bizNum(highest.amount), currency) : "Add a unit"}</p>
        </div>
        <div className="rounded-m-chip border border-[color-mix(in_srgb,var(--u-med)_45%,transparent)] bg-[color-mix(in_srgb,var(--u-med)_12%,transparent)] p-m-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-ink-4">Closest to cap</p>
          <p className="mt-1 text-[13px] font-semibold text-ink">{atRisk ? atRisk.label : "No units"}</p>
          <p className="text-[12px] text-ink-3">{atRisk?.utilization_ratio != null ? `${Math.round(atRisk.utilization_ratio * 100)}% used` : "No limit set"}</p>
        </div>
        <div className="rounded-m-chip border border-urgency-clear-value/35 bg-urgency-clear-value/[0.08] p-m-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-ink-4">Top performing</p>
          <p className="mt-1 text-[13px] font-semibold text-ink">{calm ? calm.label : "No calm unit yet"}</p>
          <p className="text-[12px] text-ink-3">{calm ? "On track" : "Add budget caps"}</p>
        </div>
      </div>
      <UnitPerformanceSection unitBreakdown={unitBreakdown} units={units} currency={currency} />
    </section>
  );
}
