"use client";

import type { GroupDetailViewModel } from "@/lib/group/types";
import { formatInr } from "@/lib/group/selectors";
import { GroupHealthInsights } from "@/components/group/GroupHealthInsights";
import { groupHeroSurface, groupStatTile } from "@/lib/group/group-ui";

function humanizeType(gt: string): string {
  const t = gt.replace(/_/g, " ").trim();
  if (!t) return "Group";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function fundingHint(fm: GroupDetailViewModel["fundingModel"]): string {
  if (fm === "pooled") return "Shared pool";
  if (fm === "split_expenses") return "Split bills";
  return "Pool + splits";
}

const healthStyles: Record<GroupDetailViewModel["health"], string> = {
  on_track: "border-urgency-clear-value/35 bg-urgency-clear-value/[0.11] text-urgency-clear-value",
  slightly_behind: "border-urgency-medium/40 bg-urgency-medium/[0.09] text-urgency-medium",
  at_risk: "border-urgency-high/40 bg-urgency-high/[0.1] text-urgency-high",
};

export function GroupSummaryHero({ vm }: { vm: GroupDetailViewModel }) {
  const pct = vm.poolProgressPct;
  const burn = vm.spendRatioPct;

  return (
    <section
      className={`${groupHeroSurface} p-m-5 md:p-m-8`}
      aria-labelledby="group-detail-title"
    >
      <div
        className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full opacity-[0.12]"
        style={{ background: "radial-gradient(circle, var(--ctx-accent), transparent 68%)" }}
      />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ctx-accent">Your group</p>
        <h1 id="group-detail-title" className="mt-m-2 text-2xl font-bold leading-tight tracking-tight text-ink md:mt-m-3 md:text-[1.85rem]">
          {vm.title}
        </h1>
        <div className="mt-m-3 flex flex-wrap items-center gap-2 md:mt-m-4">
          <span className="rounded-m-chip border border-ctx-border/45 bg-bg2/85 px-m-3 py-1.5 text-[11px] font-medium capitalize text-ink-2">
            {humanizeType(vm.groupType)}
          </span>
          <span className="rounded-m-chip border border-surface-300/85 bg-bg2/55 px-m-3 py-1.5 text-[11px] text-ink-3">
            {fundingHint(vm.fundingModel)}
          </span>
          <span className={`rounded-m-chip border px-m-3 py-1.5 text-[11px] font-semibold ${healthStyles[vm.health]}`}>
            {vm.healthLabel}
          </span>
        </div>

        <div className="mt-m-6 grid grid-cols-2 gap-m-2.5 sm:grid-cols-3 sm:gap-m-3 lg:grid-cols-4 md:mt-m-8">
          <Metric label="Collected" value={formatInr(vm.collectedAmount)} />
          <Metric
            label="Target"
            value={vm.targetAmount != null ? formatInr(vm.targetAmount) : "—"}
            hint={vm.fundingModel === "pooled" ? "Pool goal" : "Guide"}
          />
          <Metric label="Shared spend" value={formatInr(vm.totalSpent)} hint="From expenses" />
          <Metric
            label={vm.fundingModel === "split_expenses" ? "Open balance" : "Remaining to pool"}
            value={
              vm.fundingModel === "split_expenses"
                ? formatInr(vm.openShareDebt)
                : vm.shortfallToPool != null
                  ? formatInr(vm.shortfallToPool)
                  : "—"
            }
          />
          <Metric
            label="Next due"
            value={vm.nextDueSummary ?? "—"}
            hint={vm.nextDueDate ? vm.nextDueDate : undefined}
          />
          <Metric
            label="Waiting on"
            value={vm.pendingPeopleCount === 0 ? "No one" : `${vm.pendingPeopleCount} people`}
          />
        </div>

        {pct != null ? (
          <div className="mt-m-6 md:mt-m-8">
            <div className="mb-2 flex justify-between text-[12px] text-ink-3">
              <span className="font-medium text-ink-2">Collection progress</span>
              <span className="tabular-nums font-semibold text-ink">{pct}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-bg2 ring-1 ring-surface-300/40"
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-ctx-accent to-ctx-accent-end transition-[width] duration-500 ease-standard"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        ) : null}

        {burn != null && vm.targetAmount != null ? (
          <div className="mt-m-5">
            <div className="mb-2 flex justify-between text-[12px] text-ink-3">
              <span className="font-medium text-ink-2">Spend vs target</span>
              <span className="tabular-nums font-semibold text-ink">{burn}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg2/90 ring-1 ring-surface-300/35">
              <div
                className="h-full rounded-full bg-surface-400/90 transition-[width] duration-500 ease-standard"
                style={{ width: `${Math.min(100, burn)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-ink-4">Share of the target already reflected in expenses.</p>
          </div>
        ) : null}

        <GroupHealthInsights insights={vm.insights} />
      </div>
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={groupStatTile}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/36">{label}</p>
      <p className="mt-1.5 text-[15px] font-semibold tabular-nums tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-ink-4">{hint}</p> : null}
    </div>
  );
}
