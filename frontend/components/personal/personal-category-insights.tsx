"use client";

import type { SpendBreakdown } from "@/lib/api/personal";
import { categoryRiskLine } from "@/lib/personal/personal-dashboard-insights";

const cardCls =
  "relative overflow-hidden rounded-m-hero border border-surface-300 bg-surface-100 shadow-[inset_0_1px_0_0_rgba(201,168,76,0.06)]";

function n(v: string | number): number {
  const x = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(x) ? x : 0;
}

export function PersonalCategoryInsights({
  breakdown,
  formatInr,
}: {
  breakdown: SpendBreakdown;
  formatInr: (n: number) => string;
}) {
  const tot = n(breakdown.total) || 1;
  const rows = breakdown.rows;
  const risk = categoryRiskLine(breakdown);
  const top = rows[0];
  const second = rows[1];
  const topPct = top ? Math.round((n(top.amount) / tot) * 100) : 0;
  const secondPct = second ? Math.round((n(second.amount) / tot) * 100) : 0;
  const trend =
    second && top
      ? topPct > secondPct + 15
        ? `${top.label} is pulling away from other categories.`
        : `Spend is spread — ${top.label} leads but not by a huge margin.`
      : null;

  return (
    <section className={`${cardCls} p-m-6 md:p-m-8`}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ink/35">Category insights</p>
      <p className="mt-m-2 max-w-2xl text-[13px] leading-relaxed text-ink/65">
        Why it matters: where money goes shapes what you can flex tomorrow.
      </p>
      {risk ? (
        <p className="mt-m-4 rounded-m-chip border border-surface-300/80 bg-ctx-hero/50 px-m-4 py-m-3 text-[13px] leading-snug text-ink/65">
          {risk}
        </p>
      ) : null}
      {trend ? <p className="mt-m-3 text-[12px] text-ink/65">{trend}</p> : null}
      <ul className="mt-m-6 space-y-m-4">
        {rows.map((r, i) => {
          const amt = n(r.amount);
          const pct = Math.min(100, Math.round((amt / tot) * 100));
          const isTop = i === 0;
          return (
            <li key={`${r.label}-${r.category_id ?? "x"}`}>
              <div className="mb-1 flex justify-between gap-m-3 text-[12px]">
                <span className={`min-w-0 truncate ${isTop ? "font-semibold text-ink/65" : "text-ink/65"}`}>
                  {r.label}
                  {isTop ? (
                    <span className="ml-2 text-[9px] font-semibold uppercase tracking-wider text-ink/35">
                      Top
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums text-ink">{formatInr(amt)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-m-cta bg-surface-300/80">
                <div
                  className="h-full rounded-m-cta bg-gradient-to-r from-surface-400/90 to-ink-4/50"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] tabular-nums text-ink/35">{pct}% of period spend</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
