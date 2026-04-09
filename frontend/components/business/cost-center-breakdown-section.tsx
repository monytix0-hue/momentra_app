"use client";

import type { BusinessDashboard } from "@/lib/api/business";
import { bizMoney, bizNum } from "@/lib/business/format";

export function CostCenterBreakdownSection({
  rows,
  currency,
}: {
  rows: BusinessDashboard["cost_center_breakdown"];
  currency: string;
}) {
  if (!rows.length) {
    return (
      <section id="business-section-cost-centers" className="scroll-mt-24 rounded-m-card border border-dashed border-surface-300/80 p-m-6 text-center">
        <p className="text-[14px] text-ink-3">Create cost centers to see envelope utilization.</p>
      </section>
    );
  }

  return (
    <section
      id="business-section-cost-centers"
      className="scroll-mt-24 rounded-m-card border border-surface-300/80 bg-surface-100/90 p-m-4"
    >
      <div className="mb-m-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ctx-accent">Cost center breakdown</p>
        <h2 className="mt-1 text-[18px] font-semibold text-ink">Budget lanes</h2>
        <p className="mt-1 text-[13px] text-ink-3">Approved spend against each center’s limit.</p>
      </div>
      <ul className="space-y-m-4">
        {rows.map((row) => {
          const spent = bizNum(row.amount);
          const lim = row.budget_limit != null ? bizNum(row.budget_limit) : null;
          const ratio = row.utilization_ratio;
          const pct =
            ratio != null
              ? Math.min(100, ratio * 100)
              : lim && lim > 0
                ? Math.min(100, (spent / lim) * 100)
                : 0;
          const warn = ratio != null && ratio >= 0.85;
          const over = ratio != null && ratio >= 1;

          return (
            <li key={row.key} className="rounded-m-chip border border-surface-300/70 bg-bg2/85 p-m-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[14px] font-semibold text-ink">{row.label}</span>
                <span className="text-[12px] tabular-nums text-ink-3">
                  <span className="font-medium text-ink">{bizMoney(spent, currency)}</span>
                  {lim != null && lim > 0 ? (
                    <>
                      {" "}
                      <span className="text-ink-4">/</span> {bizMoney(lim, currency)}
                    </>
                  ) : (
                    <span className="text-ink-4"> · no limit set</span>
                  )}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-300/50">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    over
                      ? "bg-urgency-high"
                      : warn
                        ? "bg-[var(--u-med)]"
                        : "bg-[color-mix(in_srgb,var(--ctx-accent)_80%,var(--brand)_20%)]"
                  }`}
                  style={{ width: `${lim && lim > 0 ? pct : spent > 0 ? 12 : 0}%` }}
                />
              </div>
              {over ? (
                <p className="mt-2 text-[11px] font-medium text-urgency-high-t">Over allocated limit</p>
              ) : warn ? (
                <p className="mt-2 text-[11px] font-medium text-[var(--u-med-t)]">
                  Nearing limit; stage decisions carefully.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
