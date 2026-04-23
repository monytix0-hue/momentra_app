import Link from "next/link";
import type { GroupHome } from "@/lib/api/group";
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

export function PendingCommitmentsPanel({ rows }: { rows: GroupHome["pending_commitments"] }) {
  if (!rows.length) {
    return (
      <p className="rounded-m-chip border border-dashed border-surface-300 bg-bg2 px-m-4 py-m-5 text-center text-[13px] text-ink-4">
        No pending commitments across your groups.
      </p>
    );
  }

  return (
    <ul className="space-y-m-2">
      {rows.map((r) => {
        const left = num(r.committed_amount) - num(r.paid_amount);
        return (
          <li key={r.commitment_id}>
            <Link
              href={`/group/${r.group_id}`}
              className="flex flex-col gap-1 rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-m-2.5 text-[12px] transition-colors hover:border-ctx-accent/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="font-medium text-ink">{r.display_name}</span>
                <span className="text-ink-4"> · </span>
                <span className="text-ink-3">{r.group_title || "Group"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-m-2 text-ink-2">
                <span className="text-status-pending-fg">{r.status}</span>
                <span>—</span>
                <span>
                  {money(left)} left · due {formatDisplayDate(r.due_date)}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
