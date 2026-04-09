"use client";

import type { PaceInsight } from "@/lib/personal/personal-dashboard-insights";

const cardCls =
  "relative overflow-hidden rounded-m-card border border-surface-300 bg-surface-100 shadow-[inset_0_1px_0_0_rgba(201,168,76,0.06)]";

const statusCopy: Record<PaceInsight["status"], { label: string; sub: string; color: string }> = {
  on_track: {
    label: "On track",
    sub: "Actual spend is close to a smooth monthly line.",
    color: "text-urgency-clear",
  },
  over_pace: {
    label: "Over pace",
    sub: "You’re ahead of where a linear month would be.",
    color: "text-urgency-high",
  },
  under: {
    label: "Under-utilizing",
    sub: "Below the smooth line — room to plan or save.",
    color: "text-ink-3",
  },
};

export function PersonalSpendPaceCard({
  pace,
  periodLabel,
  formatInr,
}: {
  pace: PaceInsight;
  periodLabel: string;
  formatInr: (n: number) => string;
}) {
  const meta = statusCopy[pace.status];
  const diffAbs = formatInr(Math.abs(pace.diff));
  const diffPhrase =
    pace.diff > 0 ? `${diffAbs} above smooth pace` : pace.diff < 0 ? `${diffAbs} below smooth pace` : "On the line";

  return (
    <section className={`${cardCls} p-m-5 md:p-m-6`}>
      <div className="flex flex-wrap items-start justify-between gap-m-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/35">Spending pace</p>
          <p className="mt-1 text-[13px] text-ink/65">{periodLabel}</p>
        </div>
        <span className={`rounded-m-badge border border-ctx-border/40 px-m-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>
          {meta.label}
        </span>
      </div>
      <p className="mt-m-3 text-[12px] leading-relaxed text-ink/65">{meta.sub}</p>
      <dl className="mt-m-5 grid gap-m-3 sm:grid-cols-3">
        <div className="rounded-m-chip border border-ctx-border/30 bg-ctx-hero/40 p-m-3">
          <dt className="text-[9px] font-semibold uppercase tracking-wider text-ink/35">Expected by now</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-ink">{formatInr(pace.expectedSoFar)}</dd>
        </div>
        <div className="rounded-m-chip border border-ctx-border/30 bg-ctx-hero/40 p-m-3">
          <dt className="text-[9px] font-semibold uppercase tracking-wider text-ink/35">Actual</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-ink">{formatInr(pace.actualSoFar)}</dd>
        </div>
        <div className="rounded-m-chip border border-ctx-border/30 bg-ctx-hero/40 p-m-3">
          <dt className="text-[9px] font-semibold uppercase tracking-wider text-ink/35">Gap</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-ink/65">{diffPhrase}</dd>
        </div>
      </dl>
      <p className="mt-m-4 text-[11px] text-ink/65">
        Day {pace.dayOfMonth} of {pace.daysInMonth} — linear pace is a simple habit anchor, not a rule.
      </p>
    </section>
  );
}
