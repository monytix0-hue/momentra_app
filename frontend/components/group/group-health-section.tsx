import Link from "next/link";
import type { ActiveGroupConsoleRow } from "@/lib/group/group-home-console";
import { formatInr, humanizeGroupType } from "@/lib/group/group-home-console";
import { ConsoleCard, ConsoleSectionTitle } from "@/components/group/group-console-shared";
import { GroupCycleStatusBadge, CycleInfoRow } from "@/components/group/group-cycle-badge";

function num(v: string | number | null | undefined): number {
  if (v == null || v === "") return NaN;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : NaN;
}

function healthStyles(tier: ActiveGroupConsoleRow["health"]) {
  if (tier === "needs_attention")
    return {
      badge: "border-urgency-high/45 text-urgency-high bg-urgency-high/[0.07]",
      label: "Needs attention",
      bar: "from-urgency-high/80 to-urgency-high/20",
    };
  if (tier === "slightly_behind")
    return {
      badge: "border-urgency-medium/45 text-urgency-medium bg-urgency-medium/[0.08]",
      label: "Slightly behind",
      bar: "from-urgency-medium/80 to-urgency-medium/20",
    };
  return {
    badge: "border-urgency-clear-value/40 text-urgency-clear-value bg-urgency-clear-value/[0.07]",
    label: "On track",
    bar: "from-emerald-400/70 to-ctx-accent/25",
  };
}

function HealthPulseBar({ tier, progress }: { tier: ActiveGroupConsoleRow["health"]; progress: number }) {
  const { bar } = healthStyles(tier);
  const w = Math.round(Math.min(100, Math.max(8, progress)));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg2">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${bar} transition-[width] duration-700 ease-out`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

function ActiveGroupCardV3({ row }: { row: ActiveGroupConsoleRow }) {
  const { group: g, pendingCount, health, story, openInGroup } = row;
  const target = num(g.target_amount);
  const hasTarget = Number.isFinite(target) && target > 0;
  const { badge, label } = healthStyles(health);
  const durationLabel =
    g.duration_type === "one_time" || g.duration_type === "one-time" ? "One-time" : "Ongoing";

  const progress =
    health === "on_track" ? 92 : health === "slightly_behind" ? 58 : 36;

  const fundingLabel =
    g.funding_model === "pooled"
      ? "Pooled"
      : g.funding_model === "split"
        ? "Split"
        : g.funding_model === "hybrid"
          ? "Hybrid"
          : g.funding_model.replace(/_/g, " ");

  return (
    <Link
      href={`/group/${g.group_id}`}
      className="group/card block rounded-m-hero border border-surface-300 bg-surface-100 p-m-5 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_14%,transparent)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-ctx-accent/40 hover:shadow-[0_0_32px_-14px_color-mix(in_srgb,var(--ctx-accent)_50%,transparent)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-m-2">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-ctx-text">{g.title}</p>
          <p className="mt-1 text-[11px] text-ink-3">
            <span className="capitalize text-ctx-accent/85">{humanizeGroupType(g)}</span>
            <span className="text-ink-4"> · </span>
            <span>{fundingLabel}</span>
            <span className="text-ink-4"> · </span>
            <span>{durationLabel}</span>
          </p>
        </div>
        <span className={`shrink-0 rounded-m-chip border px-m-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${badge}`}>
          {label}
        </span>
      </div>

      <div className="mt-m-3 flex flex-wrap gap-m-2">
        <GroupCycleStatusBadge group={g} />
        <span className="rounded-m-chip border border-surface-300 bg-bg2 px-m-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-3">
          {pendingCount > 0 ? `${pendingCount} pending` : "No open commitments"}
        </span>
      </div>

      {hasTarget ? (
        <p className="mt-m-3 text-[12px] tabular-nums text-ink-2">
          Pool target <span className="font-semibold text-ctx-text">{formatInr(target)}</span>
          {openInGroup > 0 ? (
            <>
              <span className="text-ink-4"> · </span>
              <span className="text-status-pending-fg">{formatInr(openInGroup)} open</span>
            </>
          ) : null}
        </p>
      ) : openInGroup > 0 ? (
        <p className="mt-m-3 text-[12px] text-ink-2">
          <span className="font-semibold text-status-pending-fg">{formatInr(openInGroup)}</span> open in this group
        </p>
      ) : null}

      <div className="mt-m-4">
        <HealthPulseBar tier={health} progress={progress} />
      </div>

      <p className="mt-m-3 text-[12px] leading-relaxed text-ink-3">{story}</p>

      <div className="mt-m-4 space-y-m-2">
        <CycleInfoRow label="Cadence" detail={durationLabel} />
        {g.cycle_type && g.cycle_type !== "none" ? (
          <CycleInfoRow label="Cycle" detail={g.cycle_type.replace(/_/g, " ")} />
        ) : null}
      </div>
    </Link>
  );
}

export function GroupHealthSection({ rows }: { rows: ActiveGroupConsoleRow[] }) {
  return (
    <section className="min-w-0">
      <ConsoleSectionTitle
        eyebrow="Groups"
        title="Active groups & health"
        subtitle="See where momentum is strong and where a little coordination goes a long way."
      />
      {!rows.length ? (
        <ConsoleCard className="p-m-6">
          <p className="text-[14px] text-ink-3">
            No active groups yet — create your first trip, rent circle, or family pool to see health signals here.
          </p>
        </ConsoleCard>
      ) : (
        <div className="grid gap-m-3 sm:grid-cols-2">
          {rows.map((r) => (
            <ActiveGroupCardV3 key={r.group.group_id} row={r} />
          ))}
        </div>
      )}
    </section>
  );
}
