import type { GroupSummaryBlock } from "@/lib/api/group";

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

export function GroupSummaryCard({ summary, title }: { summary: GroupSummaryBlock; title?: string }) {
  const collected = num(summary.collected_amount);
  const target = summary.target_amount != null ? num(summary.target_amount) : null;

  return (
    <div className="relative overflow-hidden rounded-m-hero border border-ctx-border/55 bg-ctx-surface px-m-5 py-m-5 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_22%,transparent)]">
      {title ? (
        <p className="mb-m-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-ctx-accent">{title}</p>
      ) : null}
      <div className="grid gap-m-4 sm:grid-cols-2 sm:gap-m-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctx-text/75">Collected</p>
          <p className="mt-1 font-serif text-2xl font-semibold tabular-nums text-ctx-text">{money(collected)}</p>
          {target != null ? (
            <p className="mt-2 text-[13px] text-ctx-text/85">
              of {money(target)} moment budget
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2.5 text-[13px] leading-snug">
          <div className="flex justify-between gap-3">
            <span className="text-ctx-text/72">Pending commitments</span>
            <span className="shrink-0 font-semibold tabular-nums text-status-pending-fg">{summary.pending_commitment_count}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ctx-text/72">Overdue</span>
            <span className="shrink-0 font-semibold tabular-nums text-status-overdue-fg">{summary.overdue_commitment_count}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ctx-text/72">Open expense splits</span>
            <span className="shrink-0 font-semibold tabular-nums text-ctx-text">{money(num(summary.open_share_debt))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
