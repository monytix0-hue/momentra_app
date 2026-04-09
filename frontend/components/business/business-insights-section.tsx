"use client";

import { useMemo } from "react";
import type { BusinessDashboard, BusinessSpend, BusinessUnit, BusinessVendor } from "@/lib/api/business";
import { bizNum } from "@/lib/business/format";

export function BusinessInsightsSection({
  spends,
  unitBreakdown,
  costCenterBreakdown,
  units,
  vendors,
}: {
  spends: BusinessSpend[];
  unitBreakdown: BusinessDashboard["unit_breakdown"];
  costCenterBreakdown: BusinessDashboard["cost_center_breakdown"];
  units: BusinessUnit[];
  vendors: BusinessVendor[];
}) {
  const insights = useMemo(() => {
    const lines: { id: string; text: string }[] = [];
    const unitName = (id: string) => units.find((u) => u.unit_id === id)?.name ?? "A unit";
    const vendorName = (id: string) => vendors.find((v) => v.vendor_id === id)?.name ?? "Vendor";

    const approved = spends.filter((s) => s.status === "approved");

    const byUnit: Record<string, number> = {};
    for (const s of approved) {
      byUnit[s.unit_id] = (byUnit[s.unit_id] || 0) + bizNum(s.amount);
    }
    const topUnit = Object.entries(byUnit).sort((a, b) => b[1] - a[1])[0];
    if (topUnit && topUnit[1] > 0) {
      lines.push({
        id: "top-unit",
        text: `${unitName(topUnit[0])} is pacing highest on approved spend.`,
      });
    }

    const sortedCc = [...costCenterBreakdown].sort((a, b) => bizNum(b.amount) - bizNum(a.amount));
    if (sortedCc[0] && bizNum(sortedCc[0].amount) > 0) {
      lines.push({
        id: "top-cc",
        text: `${sortedCc[0].label} is your largest cost center by approved spend.`,
      });
    }

    const byType: Record<string, number> = {};
    for (const s of approved) {
      byType[s.spend_type] = (byType[s.spend_type] || 0) + bizNum(s.amount);
    }
    const types = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    if (types.length >= 2 && types[0][1] > types[1][1] * 1.15) {
      lines.push({
        id: "type-skew",
        text: `${types[0][0]} spend is dominating the mix — worth a quick pulse check.`,
      });
    }

    const byVendor: Record<string, number> = {};
    for (const s of approved) {
      if (!s.vendor_id) continue;
      byVendor[s.vendor_id] = (byVendor[s.vendor_id] || 0) + 1;
    }
    const topV = Object.entries(byVendor).sort((a, b) => b[1] - a[1])[0];
    if (topV && topV[1] >= 3) {
      lines.push({
        id: "vendor-repeat",
        text: `${vendorName(topV[0])} appears ${topV[1]}× this period — healthy rhythm or concentration?`,
      });
    }

    const withRatio = unitBreakdown.filter((u) => u.utilization_ratio != null && u.utilization_ratio >= 0.7);
    if (withRatio.length) {
      const u = [...withRatio].sort((a, b) => bizNum(b.utilization_ratio) - bizNum(a.utilization_ratio))[0];
      lines.push({
        id: "unit-tempo",
        text: `${u.label} is using budget fastest — keep signals visible.`,
      });
    }

    return lines.slice(0, 4);
  }, [spends, unitBreakdown, costCenterBreakdown, units, vendors]);

  if (!insights.length) return null;

  return (
    <section
      id="business-section-insights"
      className="scroll-mt-24 rounded-m-card border bg-[color:var(--b-surf)] p-[18px]"
      style={{ borderColor: "color-mix(in srgb, var(--b-acc) 20%, transparent)" }}
    >
      <div className="mb-m-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/35">Insights</p>
          <p className="mt-0.5 text-[13px] text-ink-3">Short reads — not another report.</p>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {insights.map((row, i) => (
          <li
            key={row.id}
            className="flex gap-m-3 rounded-m-chip border px-m-3 py-m-2.5 transition-colors duration-300 hover:border-ctx-accent/25"
            style={{
              background: "var(--b-cover)",
              borderColor: "color-mix(in srgb, var(--b-acc) 20%, transparent)",
              transitionDelay: `${i * 30}ms`,
            }}
          >
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--ctx-accent)_18%,transparent)] text-[13px]"
              aria-hidden
            >
              ✦
            </span>
            <p className="text-[13px] leading-snug text-ink-2">{row.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
