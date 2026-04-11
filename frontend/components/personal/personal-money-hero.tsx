"use client";

const cardCls =
  "relative overflow-hidden rounded-m-hero border border-surface-300 bg-surface-100 shadow-[inset_0_1px_0_0_rgba(201,168,76,0.06)]";

export function PersonalMoneyHero({
  planRemainingLabel,
  story,
  planUsedPct,
  spendingLabel,
  spendingTargetLabel,
  spendingHint,
  savingsContributedLabel,
  savingsTargetLabel,
  savingsHint,
  expectedSoFar,
  actualSoFar,
  showPaceCompare = false,
  formatInr,
}: {
  planRemainingLabel: string;
  story: string;
  planUsedPct: number;
  spendingLabel: string;
  spendingTargetLabel: string;
  spendingHint: string;
  savingsContributedLabel: string;
  savingsTargetLabel: string;
  savingsHint: string;
  expectedSoFar: number | null;
  actualSoFar: number | null;
  showPaceCompare?: boolean;
  formatInr: (n: number) => string;
}) {
  return (
    <section className={`${cardCls} p-m-6 md:p-m-8`}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-65"
        style={{
          background: "linear-gradient(90deg, transparent, var(--ctx-accent), transparent)",
        }}
      />
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/35">Plan remaining</p>
      <p className="mt-m-3 text-[36px] font-bold leading-none tracking-[-0.8px] text-ctx-accent">
        {planRemainingLabel}
      </p>
      <p className="mt-m-3 max-w-xl text-[14px] leading-relaxed text-ink/65">{story}</p>

      <div className="mt-m-6">
        <div className="mb-1.5 flex justify-between text-[10px] uppercase tracking-wider text-ink/35">
          <span>Plan used</span>
          <span className="tabular-nums text-ink">{planUsedPct}%</span>
        </div>
        <div
          className="h-[6px] overflow-hidden rounded-m-cta"
          style={{ backgroundColor: "rgba(108, 78, 242, 0.2)" }}
        >
          <div
            className="h-full rounded-m-cta transition-[width] duration-medium ease-standard"
            style={{
              width: `${planUsedPct}%`,
              background: "linear-gradient(90deg, var(--ctx-accent), var(--ctx-accent-end))",
            }}
          />
        </div>
      </div>

      <div className="mt-m-5 grid gap-m-3 md:grid-cols-2">
        <div className="rounded-m-card border border-ctx-border/40 bg-ctx-hero/45 p-m-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/45">Spending</p>
          <p className="mt-1 text-[13px] tabular-nums text-ink">
            {spendingLabel} / {spendingTargetLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-ink/45">→ {spendingHint}</p>
        </div>
        <div className="rounded-m-card border border-ctx-border/40 bg-ctx-hero/45 p-m-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/45">Savings</p>
          <p className="mt-1 text-[13px] tabular-nums text-ink">
            {savingsContributedLabel} / {savingsTargetLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-ink/45">→ {savingsHint}</p>
        </div>
      </div>

      {showPaceCompare && expectedSoFar != null && actualSoFar != null ? (
        <p className="mt-m-4 text-[12px] leading-relaxed text-ink/65">
          <span className="text-ink/65">Smooth pace so far: </span>
          <span className="tabular-nums text-ink">{formatInr(expectedSoFar)}</span>
          <span className="text-ink/65"> expected vs </span>
          <span className="tabular-nums text-ink">{formatInr(actualSoFar)}</span>
          <span className="text-ink/65"> actual.</span>
        </p>
      ) : null}
    </section>
  );
}
