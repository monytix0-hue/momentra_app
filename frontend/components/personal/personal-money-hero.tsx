"use client";

const cardCls =
  "relative overflow-hidden rounded-m-hero border border-surface-300 bg-surface-100 shadow-[inset_0_1px_0_0_rgba(201,168,76,0.06)]";

export function PersonalMoneyHero({
  moneyLeftLabel,
  story,
  spendPct,
  expectedSoFar,
  actualSoFar,
  showPaceCompare,
  formatInr,
  incomeBased,
  incomeLabel,
  spentLabel,
}: {
  moneyLeftLabel: string;
  story: string;
  spendPct: number;
  expectedSoFar: number | null;
  actualSoFar: number | null;
  showPaceCompare: boolean;
  formatInr: (n: number) => string;
  incomeBased?: boolean;
  incomeLabel?: string;
  spentLabel?: string;
}) {
  return (
    <section className={`${cardCls} p-m-6 md:p-m-8`}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-65"
        style={{
          background: "linear-gradient(90deg, transparent, var(--ctx-accent), transparent)",
        }}
      />
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/35">
        {incomeBased ? "Money left after expenses" : "Money left"}
      </p>
      <p className="mt-m-3 text-[36px] font-bold leading-none tracking-[-0.8px] text-ctx-accent">
        {moneyLeftLabel}
      </p>
      {incomeBased && incomeLabel && spentLabel ? (
        <p className="mt-m-2 text-[12px] text-ink/50">
          <span className="text-ctx-accent/80">{incomeLabel}</span> income · <span>{spentLabel}</span> spent
        </p>
      ) : null}
      <p className="mt-m-3 max-w-xl text-[14px] leading-relaxed text-ink/65">{story}</p>

      <div className="mt-m-6">
        <div className="mb-1.5 flex justify-between text-[10px] uppercase tracking-wider text-ink/35">
          <span>{incomeBased ? "Spent of income" : "Budget used this period"}</span>
          <span className="tabular-nums text-ink">{spendPct}%</span>
        </div>
        <div
          className="h-[6px] overflow-hidden rounded-m-cta"
          style={{ backgroundColor: "rgba(108, 78, 242, 0.2)" }}
        >
          <div
            className="h-full rounded-m-cta transition-[width] duration-medium ease-standard"
            style={{
              width: `${spendPct}%`,
              background: "linear-gradient(90deg, var(--ctx-accent), var(--ctx-accent-end))",
            }}
          />
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
