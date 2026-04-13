"use client";

import type { GroupMemberCardModel } from "@/lib/group/types";
import { GroupMemberCard } from "@/components/group/GroupMemberCard";
import { groupSectionTitle } from "@/lib/group/group-ui";

export function GroupMembersSection({
  members,
  onMemberAction,
}: {
  members: GroupMemberCardModel[];
  onMemberAction: (member: GroupMemberCardModel, kind: GroupMemberCardModel["suggestedAction"]) => void;
}) {
  return (
    <section id="group-people" className="scroll-mt-24" aria-labelledby="group-members-heading">
      <div className="mb-m-4 md:mb-m-5">
        <h2 id="group-members-heading" className={groupSectionTitle}>
          People & contributions
        </h2>
        <p className="mt-m-2 max-w-xl text-[14px] leading-relaxed text-ink-3">
          Planned, paid, and still open — same numbers for everyone.
        </p>
      </div>
      <div className="grid gap-m-4 sm:grid-cols-1 lg:grid-cols-2">
        {members.map((m) => (
          <GroupMemberCard key={m.participantId} member={m} onAction={onMemberAction} />
        ))}
      </div>
    </section>
  );
}
