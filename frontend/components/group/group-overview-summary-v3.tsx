import type { GroupHome } from "@/lib/api/group";
import { ConsoleSectionTitle } from "@/components/group/group-console-shared";
import {
  formatInr,
  groupsNeedingAttention,
  openBalanceFromCommitments,
  overviewSupportingLine,
  pendingByGroup,
  sumPooledTargets,
} from "@/lib/group/group-home-console";

export function GroupOverviewSummaryV3({ data }: { data: GroupHome }) {
  const totalTarget = sumPooledTargets(data.groups);
  const openSignals = data.top_signals.filter((s) => !s.resolved).length;
  const pendingMap = pendingByGroup(data.pending_commitments);
  const attention = groupsNeedingAttention(data, pendingMap);
  const openTotal = openBalanceFromCommitments(data.pending_commitments);
  const supporting = overviewSupportingLine(data, attention, openTotal);
  const hero =
    data.overdue_commitment_count > 0
      ? {
          label: "Overdue commitments",
          value: String(data.overdue_commitment_count),
          color: "text-urgency-high",
          cta: "Remind all",
        }
      : data.pending_commitment_count > 0
        ? { label: "Pending people", value: String(data.pending_commitment_count), color: "text-urgency-medium", cta: "See who owes" }
        : openSignals > 0
          ? { label: "Open signals", value: String(openSignals), color: "text-urgency-medium", cta: "Open signals" }
          : {
              label: "Pooled targets",
              value: totalTarget > 0 ? formatInr(totalTarget) : "—",
              color: "text-ctx-accent",
              cta: null,
            };

  return (
    <section className="min-w-0">
      <ConsoleSectionTitle
        eyebrow="At a glance"
        title="Your coordination snapshot"
        subtitle={supporting}
      />
      <div className="space-y-[10px]">
        <div className="rounded-m-card border border-surface-300 bg-surface-100 px-[18px] py-[18px] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_12%,transparent)]">
          <div className="flex items-center justify-between gap-m-3">
            <div>
              <p className="text-[12px] text-ink/45">{hero.label}</p>
              <p className={`mt-1 text-[36px] leading-none font-bold tracking-[-0.8px] tabular-nums ${hero.color}`}>
                {hero.value}
              </p>
            </div>
            {hero.cta ? (
              <button type="button" className="rounded-m-chip border border-ctx-border/60 px-m-3 py-2 text-[11px] font-semibold text-ctx-text">
                {hero.cta}
              </button>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[10px]">
          {[
            { label: "Active groups", value: String(data.active_group_count) },
            { label: "Pending people", value: String(data.pending_commitment_count) },
            { label: "Open signals", value: String(openSignals) },
            { label: "Pooled", value: totalTarget > 0 ? formatInr(totalTarget) : "—" },
          ].map((c) => (
            <div key={c.label} className="rounded-m-card border border-surface-300 bg-surface-100 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/35">{c.label}</p>
              <p className="mt-1 text-[15px] font-semibold tabular-nums text-ink">{c.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
