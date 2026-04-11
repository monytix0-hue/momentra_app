import Link from "next/link";
import type { GroupHome } from "@/lib/api/group";
import { ConsoleCard, ConsoleSectionTitle } from "@/components/group/group-console-shared";
import { formatInr } from "@/lib/group/group-home-console";
import { formatDisplayDate } from "@/lib/format/display-date";

function num(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export function PendingCommitmentsSectionV3({ rows }: { rows: GroupHome["pending_commitments"] }) {
  return (
    <section className="min-w-0">
      <ConsoleSectionTitle
        eyebrow="Commitments"
        title="Pending commitments"
        subtitle="Every line item is something you can close with a payment record or a quick nudge."
      />
      {(() => {
        const openRows = rows.filter((r) => num(r.committed_amount) - num(r.paid_amount) > 0);
        if (!openRows.length) {
          return (
            <ConsoleCard className="p-m-6">
              <p className="text-[14px] text-ink-3">
                No pending commitments across your groups. New cycles and invites will show obligations here.
              </p>
            </ConsoleCard>
          );
        }
        return (
          <div className="overflow-hidden rounded-m-hero border border-surface-300">
            <ul className="divide-y divide-surface-300">
              {openRows.map((r) => {
                const left = num(r.committed_amount) - num(r.paid_amount);
                return (
                  <li key={r.commitment_id} className="bg-surface-100/80 transition-colors hover:bg-surface-100">
                  <div className="flex flex-col gap-m-3 px-m-4 py-m-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{r.display_name}</p>
                      <p className="text-[12px] text-ink-3">{r.group_title}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-ink-4">
                        <span
                          className={
                            r.status === "overdue"
                              ? "text-status-overdue-fg"
                              : r.status === "pending"
                                ? "text-status-pending-fg"
                                : "text-ink-3"
                          }
                        >
                          {r.status}
                        </span>
                        <span className="text-ink-4"> · Due </span>
                        {formatDisplayDate(r.due_date)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-m-3 md:justify-end">
                      <div className="text-right text-[12px] tabular-nums">
                        <p className="text-ink-4">Planned / paid</p>
                        <p className="font-medium text-ctx-text">
                          {formatInr(num(r.committed_amount))} / {formatInr(num(r.paid_amount))}
                        </p>
                        <p className="text-status-pending-fg">{formatInr(left)} remaining</p>
                      </div>
                      <Link
                        href={`/group/${r.group_id}`}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-m-cta border border-ctx-accent/50 bg-gradient-to-br from-ctx-accent/16 to-transparent px-m-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-ctx-accent transition-opacity hover:opacity-90"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}
    </section>
  );
}
