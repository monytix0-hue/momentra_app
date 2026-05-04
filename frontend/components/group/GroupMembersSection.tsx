"use client";

import type { GroupMemberCardModel } from "@/lib/group/types";
import { GroupMemberCard } from "@/components/group/GroupMemberCard";
import { groupSectionTitle } from "@/lib/group/group-ui";

export function GroupMembersSection({
  members,
  onMemberAction,
  summaryError,
}: {
  members: GroupMemberCardModel[];
  onMemberAction: (member: GroupMemberCardModel, kind: GroupMemberCardModel["suggestedAction"]) => void;
  /** Non-fatal: detail still loads; pool vs expense totals may be client-derived only */
  summaryError?: string | null;
}) {
  return (
    <section id="group-people" className="scroll-mt-24" aria-labelledby="group-members-heading">
      <div className="mb-m-4 md:mb-m-5">
        <h2 id="group-members-heading" className={groupSectionTitle}>
          People & money status
        </h2>
        <p className="mt-m-2 max-w-xl text-[14px] leading-relaxed text-ink-3">
          Pool plan and contributions are separate from who paid shared bills — both are shown on each card.
        </p>
        {summaryError ? (
          <p
            className="mt-m-3 max-w-xl rounded-m-card border border-urgency-medium/35 bg-bg2 px-m-3 py-m-2 text-[13px] text-urgency-medium"
            role="status"
          >
            {summaryError} (showing pooled numbers from commitments; shared-bill totals are estimated from expenses on this device.)
          </p>
        ) : null}
      </div>
      <div className="grid gap-m-4 sm:grid-cols-1 lg:grid-cols-2">
        {members.length === 0 ? (
          <p className="text-[14px] text-ink-3">No active members yet.</p>
        ) : (
          members.map((m) => <GroupMemberCard key={m.participantId} member={m} onAction={onMemberAction} />)
        )}
      </div>
    </section>
  );
}
