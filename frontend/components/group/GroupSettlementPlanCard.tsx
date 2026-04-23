"use client";

import type { GroupSettlementPlan } from "@/lib/api/group";
import { formatInr } from "@/lib/group/selectors";

function num(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export function GroupSettlementPlanCard({
  plan,
  activeCycleId,
  error,
}: {
  plan: GroupSettlementPlan | null;
  activeCycleId?: string | null;
  error?: string | null;
}) {
  if (error) {
    return (
      <div
        className="rounded-m-card border border-urgency-medium/35 bg-bg2 px-m-4 py-m-3 text-[13px] text-urgency-medium"
        role="status"
      >
        {error}
      </div>
    );
  }
  if (!plan) return null;

  return (
    <div
      id="group-settlement-plan"
      className="rounded-m-card border border-ctx-accent/25 bg-ctx-accent/[0.06] p-m-4 scroll-mt-24"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/35">Shared expenses — who pays whom</p>
      <p className="mt-m-2 text-[13px] leading-relaxed text-ink-2">{plan.summary_line}</p>
      <p className="mt-m-2 text-[12px] leading-relaxed text-ink-3">
        Net balance is from expense splits (who fronted bills vs who still owes their share). The list below is a minimal set
        of transfers that clears those balances — record payments outside the app, then log them here if your group tracks
        settlements.
        {activeCycleId ? (
          <span className="text-ink-4"> Scoped to the active cycle.</span>
        ) : (
          <span className="text-ink-4"> All shared expenses in this group.</span>
        )}
      </p>
      <div className="mt-m-4 grid gap-m-3 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">Net (shared bills)</p>
          <ul className="mt-m-2 space-y-1.5 text-[12px] text-ink">
            {plan.balances.map((b) => {
              const nb = num(b.net_balance);
              const cls = nb >= 0 ? "text-status-ok-fg" : "text-urgency-high";
              return (
                <li key={b.participant_id} className="flex justify-between gap-2">
                  <span className="font-medium text-ink/90">{b.display_name}</span>
                  <span className={`tabular-nums font-semibold ${cls}`}>
                    {nb >= 0 ? "+" : ""}
                    {formatInr(nb, { maximumFractionDigits: 2 })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">Suggested transfers</p>
          {plan.instructions.length === 0 ? (
            <p className="mt-m-2 text-[12px] text-ink-3">No payments needed — balances net to zero.</p>
          ) : (
            <ol className="mt-m-2 list-decimal space-y-2 pl-m-4 text-[12px] text-ink">
              {plan.instructions.map((ins, idx) => (
                <li key={`${ins.from_participant_id}-${ins.to_participant_id}-${idx}`}>
                  <span className="font-medium">{ins.from_display_name}</span>
                  <span className="text-ink-3"> pays </span>
                  <span className="font-medium">{ins.to_display_name}</span>
                  <span className="tabular-nums text-ink/90"> {formatInr(num(ins.amount))}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
