import type { GroupMomentSummary } from "@/lib/api/group";
import { cycleHintFromGroup } from "@/lib/group/group-home-console";

/** Compact cycle context for ongoing groups. */
export function GroupCycleStatusBadge({ group }: { group: GroupMomentSummary }) {
  const hint = cycleHintFromGroup(group);
  const ongoing = group.duration_type === "ongoing";
  if (!ongoing && !hint) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-m-chip border border-ctx-accent/25 bg-ctx-accent/[0.08] px-m-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ctx-accent/90">
      {ongoing ? "Ongoing" : "One-time"}
      {hint ? <span className="text-ink-4 normal-case">· {hint}</span> : null}
    </span>
  );
}

export function CycleInfoRow({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-m-3 rounded-m-chip border border-surface-300/80 bg-bg2/60 px-m-3 py-2 text-[12px]">
      <span className="text-ink-3">{label}</span>
      <span className="shrink-0 font-medium text-ink">{detail}</span>
    </div>
  );
}
