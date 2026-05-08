"use client";

import type { PersonalTransaction } from "@/lib/api/personal";
import type { TodaySnapshot } from "@/lib/personal/personal-dashboard-insights";

const cardCls =
  "relative overflow-hidden rounded-m-card border border-surface-300 bg-bg2/90 shadow-[inset_0_1px_0_0_rgba(201,168,76,0.04)]";

function lastTxnTitle(t: PersonalTransaction): string {
  const cat = [t.category, t.subcategory].filter(Boolean).join(" › ");
  return t.merchant || cat || "Transaction";
}

export function PersonalTodaySnapshot({
  snapshot,
  formatInr,
}: {
  snapshot: TodaySnapshot;
  formatInr: (n: number) => string;
}) {
  return (
    <section className={`${cardCls} p-m-5 md:p-m-6`}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ink/35">Today</p>
      <div className="mt-m-4 grid gap-m-4 sm:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink/35">Spent today</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-ink">{formatInr(snapshot.spent)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-ink/35">Top category</p>
          <p className="mt-1 truncate text-[15px] font-semibold text-ink/65">
            {snapshot.topCategory ?? "—"}
          </p>
          {snapshot.topCategory ? (
            <p className="mt-0.5 text-[11px] tabular-nums text-ink">{formatInr(snapshot.topCategoryAmount)}</p>
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-ink/35">Last logged</p>
          {snapshot.lastTransaction ? (
            <>
              <p className="mt-1 truncate text-[14px] font-medium text-ink/65">
                {lastTxnTitle(snapshot.lastTransaction)}
              </p>
              <p className="mt-0.5 text-[11px] text-ink/65">
                {snapshot.lastTransaction.transaction_date.slice(0, 10)} ·{" "}
                <span className="tabular-nums text-ink">{formatInr(snapshot.lastTransaction.amount)}</span>
              </p>
            </>
          ) : (
            <p className="mt-1 text-[13px] text-ink/65">Nothing yet — add a spend.</p>
          )}
        </div>
      </div>
    </section>
  );
}
