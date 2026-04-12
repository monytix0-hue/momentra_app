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
          Log each shared cost and split it across participants (who owes what for that bill). Paying into the pool is tracked
          separately as planned commitment and paid contribution on the People / Commitments tabs.
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
                <div className="mt-m-2 border-t border-rule pt-m-2">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-left text-[9px] uppercase tracking-wider text-ink/35">
                        <th className="pb-1 font-semibold">Member</th>
                        <th className="pb-1 text-right font-semibold">Paid</th>
                        <th className="pb-1 text-right font-semibold">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.shares.map((s) => {
                        const name = payerNames.get(s.participant_id) ?? s.participant_id;
                        const paid = s.participant_id === e.paid_by_participant_id
                          ? num(e.amount)
                          : 0;
                        return (
                          <tr key={s.share_id} className="text-ink-2">
                            <td className="max-w-[120px] truncate py-0.5 pr-2" title={name}>
                              {name}
                            </td>
                            <td className="py-0.5 text-right tabular-nums">
                              {paid > 0 ? (
                                <span className="text-ctx-accent">{money(paid)}</span>
                              ) : (
                                <span className="text-ink/35">—</span>
                              )}
                            </td>
                            <td className="py-0.5 text-right tabular-nums">
                              {money(num(s.owed_amount))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
