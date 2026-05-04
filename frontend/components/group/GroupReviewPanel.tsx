"use client";

import { describeRhythmForReview } from "@/lib/group/api-adapters";
import type { CreateGroupParticipantDraft, CreateGroupUiKind, GroupFundingModel } from "@/lib/group/types";

const kindLabel: Record<CreateGroupUiKind, string> = {
  trip: "Trip",
  household: "Household",
  event: "Event",
  other: "Other",
};

const fundLabel: Record<GroupFundingModel, string> = {
  pooled: "Pooled",
  split_expenses: "Split expenses",
  hybrid: "Hybrid",
};

export function GroupReviewPanel({
  uiKind,
  fundingModel,
  title,
  description,
  targetAmount,
  dueDate,
  monthlyRhythm,
  participants,
}: {
  uiKind: CreateGroupUiKind;
  fundingModel: GroupFundingModel;
  title: string;
  description: string;
  targetAmount: string;
  dueDate: string;
  monthlyRhythm: boolean;
  participants: CreateGroupParticipantDraft[];
}) {
  const filled = participants.filter((p) => p.displayName.trim());
  return (
    <div className="space-y-m-4 rounded-m-hero border border-surface-300 bg-bg2/40 p-m-4">
      <dl className="divide-y divide-rule">
        <Row label="Kind" value={kindLabel[uiKind]} />
        <Row label="Money style" value={fundLabel[fundingModel]} />
        <Row label="Name" value={title.trim() || "Untitled"} />
        <Row label="Description" value={description.trim() || "—"} />
        <Row label="Target" value={targetAmount.trim() ? `₹${targetAmount.trim()}` : "—"} />
        <Row label="Check-in date" value={dueDate.trim() || "—"} />
        <Row label="Rhythm" value={describeRhythmForReview(uiKind, monthlyRhythm)} />
      </dl>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">People</p>
        {filled.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-3">Just you for now — invite others anytime after creation.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {filled.map((p) => (
              <li key={p.id} className="text-[13px] text-ink-2">
                <span className="font-medium text-ink">{p.displayName.trim()}</span>
                {p.email.trim() ? <span className="text-ink-4"> · {p.email.trim()}</span> : null}
                <span className="text-ink-4"> · {p.role}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="rounded-m-card border border-ctx-accent/20 bg-ctx-accent/[0.05] px-m-3 py-m-2 text-[12px] leading-relaxed text-ink-3">
        After you create, you’ll land in your group — add expenses, record contributions, and invite anyone who’s not here
        yet.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-m-2 sm:flex-row sm:justify-between sm:gap-m-4">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</dt>
      <dd className="text-[13px] text-ink sm:text-right">{value}</dd>
    </div>
  );
}
