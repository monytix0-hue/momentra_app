"use client";

import Link from "next/link";
import { useState } from "react";
import type { NudgeParticipantRow } from "@/lib/group/group-home-console";
import { formatInr } from "@/lib/group/group-home-console";
import { ConsoleCard, ConsoleSectionTitle } from "@/components/group/group-console-shared";
import { formatDisplayDate } from "@/lib/format/display-date";

function PendingParticipantCard({
  row,
  onRemindPulse,
  flash,
}: {
  row: NudgeParticipantRow;
  onRemindPulse: (id: string) => void;
  flash: string | null;
}) {
  const dueLabel =
    row.overdueDays > 0
      ? `Overdue ${row.overdueDays} day${row.overdueDays === 1 ? "" : "s"}`
      : row.dueDate
        ? `Due ${formatDisplayDate(row.dueDate)}`
        : "No due date set";

  return (
    <ConsoleCard className="p-m-4 md:p-m-5">
      <div className="flex flex-col gap-m-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ctx-text">
            {row.displayName}
            <span className="font-normal text-ink-4"> — </span>
            <span className="text-[14px] font-medium text-ink-2">{row.groupTitle}</span>
          </p>
          <p className="mt-1 text-[13px] text-ink-3">
            <span className="tabular-nums font-semibold text-status-pending-fg">{formatInr(row.amountLeft)}</span>
            <span className="text-ink-4"> left · </span>
            <span className={row.overdueDays > 0 ? "font-medium text-status-overdue-fg" : ""}>{dueLabel}</span>
            {row.cycleHint ? (
              <>
                <span className="text-ink-4"> · </span>
                <span className="text-ink-4">{row.cycleHint}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-m-2">
          <Link
            href={`/group/${row.groupId}`}
            onClick={() => onRemindPulse(row.commitmentId)}
            className="inline-flex min-h-[40px] items-center justify-center rounded-m-cta border border-surface-300 bg-bg2 px-m-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink transition-[border-color,background-color] duration-200 hover:border-ctx-accent/50 hover:bg-surface-100"
          >
            {flash === row.commitmentId ? "Opening…" : "Remind"}
          </Link>
          <Link
            href={`/group/${row.groupId}`}
            className="inline-flex min-h-[40px] items-center justify-center rounded-m-cta border border-ctx-accent/45 bg-gradient-to-br from-ctx-accent/18 to-transparent px-m-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-ctx-accent transition-opacity hover:opacity-90"
          >
            Mark paid
          </Link>
          <Link
            href={`/group/${row.groupId}`}
            className="inline-flex min-h-[40px] items-center justify-center rounded-m-cta border border-surface-300 px-m-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3 transition-colors hover:border-ctx-accent/35 hover:text-ctx-text"
          >
            Open group
          </Link>
        </div>
      </div>
    </ConsoleCard>
  );
}

export function WhoNeedsANudgeSection({ rows }: { rows: NudgeParticipantRow[] }) {
  const [flashId, setFlashId] = useState<string | null>(null);

  const onRemindPulse = (id: string) => {
    setFlashId(id);
    window.setTimeout(() => setFlashId(null), 1400);
  };

  return (
    <section className="min-w-0">
      <ConsoleSectionTitle
        eyebrow="People"
        title="Who needs a nudge"
        subtitle="Coordination is social — see who’s still open and jump straight to their group."
      />
      {!rows.length ? (
        <ConsoleCard className="p-m-6">
          <p className="text-[14px] leading-relaxed text-ink-3">
            No pending nudges right now. When someone falls behind, they’ll float up here with quick actions.
          </p>
          <p className="mt-m-3 text-[12px] text-ink-4">
            Tip: use <span className="text-ink">Remind</span> as your cue to message them, then record payment in the
            group.
          </p>
        </ConsoleCard>
      ) : (
        <div className="space-y-m-3">
          {rows.slice(0, 8).map((r) => (
            <PendingParticipantCard key={r.commitmentId} row={r} onRemindPulse={onRemindPulse} flash={flashId} />
          ))}
        </div>
      )}
    </section>
  );
}
