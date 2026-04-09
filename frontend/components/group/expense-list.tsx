import type { GroupExpense, GroupExpenseShare } from "@/lib/api/group";
import { formatDisplayDate } from "@/lib/format/display-date";

function num(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Infer from stored shares only (no persisted split_rule). */
function inferSplitKind(shares: GroupExpenseShare[]): "equal" | "custom" | null {
  if (shares.length < 2) return null;
  const amounts = shares.map((s) => num(s.owed_amount));
  if (amounts.some((a) => !Number.isFinite(a) || a <= 0)) return null;
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return max - min <= 0.02 ? "equal" : "custom";
}

const badgeCls =
  "rounded-m-chip border px-m-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]";

export function ExpenseList({
  expenses,
  payerNames,
  hideIntro = false,
}: {
  expenses: GroupExpense[];
  payerNames: Map<string, string>;
  hideIntro?: boolean;
}) {
  if (!expenses.length) {
    return <p className="text-[14px] text-ink-2">No expenses yet.</p>;
  }

  return (
    <div className="space-y-m-4">
      {!hideIntro ? (
        <p className="text-[12px] leading-relaxed text-ink-3">
          Log shared costs to split across the group. This is separate from paying your pool commitment.
        </p>
      ) : null}
      <ul className="space-y-m-2">
        {expenses.map((e) => {
          const splitKind = e.shares?.length ? inferSplitKind(e.shares) : null;
          return (
            <li
              key={e.expense_id}
              className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-m-2.5 text-[12px]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-ink">{e.title}</span>
                <span className="text-ctx-accent">{money(num(e.amount))}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-m-2 text-[12px] text-ink-3">
                <span>
                  Paid by {payerNames.get(e.paid_by_participant_id) ?? "member"} · {formatDisplayDate(e.expense_date)}
                </span>
                {splitKind === "equal" ? (
                  <span className={`${badgeCls} border-ctx-accent/35 bg-ctx-accent/10 text-ctx-accent`}>
                    Equal split
                  </span>
                ) : splitKind === "custom" ? (
                  <span className={`${badgeCls} border-surface-300 bg-surface-100 text-ink-3`}>Custom split</span>
                ) : null}
              </div>
              {e.shares?.length ? (
                <ul className="mt-m-2 space-y-1 border-t border-rule pt-m-2 text-[12px] text-ink-2">
                  {e.shares.map((s) => {
                    const name = payerNames.get(s.participant_id) ?? s.participant_id;
                    return (
                      <li key={s.share_id} className="flex justify-between gap-2">
                        <span className="min-w-0 truncate" title={name}>
                          {name}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          Share {money(num(s.owed_amount))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
