"use client";

import type { GroupMemberCardModel } from "@/lib/group/types";
import { formatInr } from "@/lib/group/selectors";
import { groupCardInteractive, groupFocusRing } from "@/lib/group/group-ui";

const statusPill: Record<string, string> = {
  paid: "border-urgency-clear-value/35 bg-urgency-clear-value/[0.09] text-urgency-clear-value",
  pending: "border-status-pending-fg/32 bg-status-pending-fg/[0.07] text-status-pending-fg",
  paid_extra: "border-ctx-accent/32 bg-ctx-accent/[0.1] text-ctx-accent",
  overdue: "border-urgency-high/38 bg-urgency-high/[0.09] text-urgency-high",
  not_started: "border-surface-300/90 bg-bg2 text-ink-3",
  settle_up: "border-urgency-medium/32 bg-urgency-medium/[0.07] text-urgency-medium",
};

const btn =
  `inline-flex min-h-[40px] items-center justify-center rounded-m-chip border border-surface-300/90 bg-surface-100 px-m-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink transition-[border-color,background-color,transform] duration-fast ease-standard hover:border-ctx-accent/40 hover:bg-bg2 active:scale-[0.99] ${groupFocusRing}`;

const btnPrimary =
  `inline-flex min-h-[40px] items-center justify-center rounded-m-chip bg-gradient-to-br from-ctx-accent to-ctx-accent-end px-m-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white shadow-sm transition-[opacity,transform] duration-fast hover:opacity-95 active:scale-[0.99] ${groupFocusRing}`;

function actionLabel(kind: GroupMemberCardModel["suggestedAction"]): string {
  switch (kind) {
    case "remind":
      return "Send reminder";
    case "pay_now":
      return "Contribute";
    case "mark_paid":
      return "Record payment";
    case "settle":
      return "Settle up";
    case "view":
      return "View";
    default:
      return "";
  }
}

export function GroupMemberCard({
  member,
  onAction,
}: {
  member: GroupMemberCardModel;
  onAction: (member: GroupMemberCardModel, kind: GroupMemberCardModel["suggestedAction"]) => void;
}) {
  const pillClass = statusPill[member.lineStatus] ?? statusPill.pending;
  const showAction = member.suggestedAction !== "none";
  const primary = member.suggestedAction === "pay_now" || member.suggestedAction === "mark_paid";

  return (
    <article
      className={`p-m-5 ${groupCardInteractive}`}
      aria-labelledby={`member-${member.participantId}-name`}
    >
      <div className="flex items-start gap-m-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-surface-300/80 bg-bg2 text-[13px] font-semibold text-ink/75 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_8%,transparent)]"
          aria-hidden
        >
          {member.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`member-${member.participantId}-name`} className="truncate text-[16px] font-semibold text-ink">
              {member.displayName}
            </h3>
            {member.role === "admin" ? (
              <span className="rounded-m-badge border border-surface-300/80 bg-bg2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                Organizer
              </span>
            ) : null}
            <span className={`rounded-m-badge border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${pillClass}`}>
              {member.statusLabel}
            </span>
          </div>
          <div className="mt-m-3 grid grid-cols-2 gap-x-m-3 gap-y-m-2 text-[12px] sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-m-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink/32">Planned</p>
              <p className="mt-0.5 tabular-nums font-medium text-ink">{formatInr(member.planned)}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink/32">Contributed</p>
              <p className="mt-0.5 tabular-nums font-medium text-ink">{formatInr(member.paid)}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink/32">Shared bills paid</p>
              <p className="mt-0.5 tabular-nums font-medium text-ink">{formatInr(member.expensesPaid)}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink/32">Still open</p>
              <p className="mt-0.5 tabular-nums font-medium text-status-pending-fg">{formatInr(member.pending)}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink/32">Extra paid</p>
              <p className="mt-0.5 tabular-nums font-medium text-ctx-accent">{member.extra > 0 ? formatInr(member.extra) : "—"}</p>
            </div>
          </div>
          {member.owes > 0.01 ? (
            <p className="mt-m-2 text-[12px] text-ink-3">
              <span className="font-medium text-ink">{formatInr(member.owes)}</span> open on shared bills
            </p>
          ) : null}
          {member.dueDate && member.pending > 0.01 ? (
            <p className="mt-1 text-[11px] text-ink-4">Due {member.dueDate}</p>
          ) : null}
        </div>
      </div>
      {showAction ? (
        <div className="mt-m-3 flex justify-end border-t border-rule/80 pt-m-3">
          <button type="button" className={primary ? btnPrimary : btn} onClick={() => onAction(member, member.suggestedAction)}>
            {actionLabel(member.suggestedAction)}
          </button>
        </div>
      ) : null}
    </article>
  );
}
