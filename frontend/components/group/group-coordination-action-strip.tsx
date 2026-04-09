"use client";

const btn =
  "inline-flex min-h-[42px] flex-1 items-center justify-center rounded-m-cta border px-m-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-[border-color,background-color,transform] duration-200 sm:flex-initial sm:min-w-[140px]";

const btnPrimary =
  "inline-flex min-h-[42px] flex-1 items-center justify-center rounded-m-cta bg-gradient-to-br from-ctx-accent to-ctx-accent-end px-m-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white shadow-[0_0_20px_-10px_var(--ctx-accent)] transition-[opacity,transform] hover:opacity-95 active:scale-[0.99] sm:flex-initial sm:min-w-[160px]";

const btnGhost =
  "border-surface-300 bg-bg2 text-ink hover:border-ctx-accent/40 hover:bg-surface-100";

export function GroupCoordinationActionStrip({
  pendingPeople,
  overdueCount,
  openShareDebt,
  daysLeft,
  emphasizeRemind,
  onRemind,
  onMarkPayment,
  onRecordSpend,
}: {
  pendingPeople: number;
  overdueCount: number;
  openShareDebt: number;
  daysLeft: number | null;
  emphasizeRemind: boolean;
  onRemind: () => void;
  onMarkPayment: () => void;
  onRecordSpend: () => void;
}) {
  const urgency =
    overdueCount > 0 || pendingPeople > 0
      ? "There’s coordination work to do — nudge people or record what came in."
      : openShareDebt > 0.01
        ? "Expense shares still have open balances — settle when you can."
        : daysLeft != null && daysLeft <= 7 && daysLeft >= 0
          ? `Cycle wraps in ${daysLeft} day${daysLeft === 1 ? "" : "s"} — keep momentum.`
          : "You’re in good shape — add expenses as they happen.";

  return (
    <div className="rounded-m-hero border border-surface-300 bg-surface-100/90 p-m-5 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_14%,transparent)]">
      <div className="flex flex-wrap items-start justify-between gap-m-4">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ctx-accent">What needs action</p>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-2">{urgency}</p>
          <ul className="mt-m-3 flex flex-wrap gap-x-m-4 gap-y-1 text-[12px] text-ink-3">
            {pendingPeople > 0 ? (
              <li>
                <span className="font-semibold text-status-pending-fg">{pendingPeople}</span> pending contributor
                {pendingPeople === 1 ? "" : "s"}
              </li>
            ) : (
              <li>No open commitment balances</li>
            )}
            {overdueCount > 0 ? (
              <li>
                <span className="font-semibold text-status-overdue-fg">{overdueCount}</span> overdue
              </li>
            ) : null}
            {openShareDebt > 0.01 ? (
              <li>Open expense balance</li>
            ) : null}
          </ul>
        </div>
        <div className="flex w-full flex-col gap-m-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            className={`${btn} ${emphasizeRemind ? btnPrimary : `${btnGhost}`}`}
            onClick={onRemind}
          >
            Remind
          </button>
          <button type="button" className={`${btn} ${btnGhost}`} onClick={onMarkPayment}>
            Mark payment
          </button>
          <button
            type="button"
            className={`${btn} ${!emphasizeRemind ? btnPrimary : btnGhost}`}
            onClick={onRecordSpend}
          >
            Record spend
          </button>
        </div>
      </div>
    </div>
  );
}
