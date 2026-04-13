"use client";

import type { GroupExpenseSnapshotItem } from "@/lib/group/types";
import { labelGroupExpenseCategory } from "@/lib/group/expense-categories";
import { formatInr } from "@/lib/group/selectors";
import { groupEmptyPanel, groupSectionTitle } from "@/lib/group/group-ui";

function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(d);
}

export function GroupExpensesSnapshot({
  items,
  totalCount,
  onViewAll,
}: {
  items: GroupExpenseSnapshotItem[];
  totalCount: number;
  onViewAll: () => void;
}) {
  return (
    <section aria-labelledby="expenses-snapshot-heading">
      <div className="mb-m-4 flex flex-wrap items-end justify-between gap-m-2 sm:gap-m-3">
        <div>
          <h2 id="expenses-snapshot-heading" className={groupSectionTitle}>
            Recent expenses
          </h2>
          <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-ink-3">
            Log of shared bills (who paid and how it was split) — not the same as pool contributions above.
          </p>
        </div>
        {totalCount > items.length ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[12px] font-semibold text-ctx-accent underline-offset-4 transition-colors duration-fast hover:text-ctx-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctx-accent"
          >
            View all ({totalCount})
          </button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className={groupEmptyPanel}>
          <div
            className="mx-auto mb-m-4 flex h-14 w-14 items-center justify-center rounded-full border border-surface-300/80 bg-bg2/80 text-lg text-ink-4"
            aria-hidden
          >
            —
          </div>
          <p className="text-[15px] font-medium text-ink">No expenses yet</p>
          <p className="mx-auto mt-m-2 max-w-xs text-[14px] leading-relaxed text-ink-3">
            Add one with <span className="font-medium text-ink-2">Add expense</span> below when you split a bill.
          </p>
        </div>
      ) : (
        <ul className="space-y-m-2">
          {items.map((e) => {
            const cat = labelGroupExpenseCategory(e.category);
            const catLine = [cat, e.subcategory?.trim() || null].filter(Boolean).join(" › ");
            return (
            <li key={e.expenseId}>
              <div className="flex items-center gap-m-3 rounded-m-card border border-surface-300/85 bg-bg2/35 px-m-4 py-m-3 transition-[border-color,box-shadow,transform] duration-fast ease-standard hover:border-ctx-accent/25 hover:shadow-[0_8px_28px_-20px_rgba(0,0,0,0.45)] active:scale-[0.998]">
                <span className="text-xl leading-none" aria-hidden>
                  {e.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{e.title}</p>
                  <p className="text-[12px] text-ink-3">
                    Paid by {e.paidByName} · {formatDay(e.expenseDate)}
                    {catLine ? (
                      <>
                        {" "}
                        · <span className="text-ink-2">{catLine}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums text-[15px] font-semibold text-ink">{formatInr(e.amount)}</span>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
