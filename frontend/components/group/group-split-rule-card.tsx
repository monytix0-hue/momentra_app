"use client";

import type { GroupMomentDetail } from "@/lib/api/group";

function appliesToPooled(fm: string): boolean {
  return fm === "pooled" || fm === "hybrid";
}

function appliesToExpenses(fm: string): boolean {
  return fm === "split_expenses" || fm === "hybrid";
}

export function GroupSplitRuleCard({ detail }: { detail: GroupMomentDetail }) {
  const rule = detail.split_rule_type.replace(/_/g, " ");
  const pooled = appliesToPooled(detail.funding_model);
  const exp = appliesToExpenses(detail.funding_model);

  let scope = "";
  if (pooled && exp) scope = "Applies to pooled contributions and shared expenses.";
  else if (pooled) scope = "Shapes how each person’s contribution to the pool is calculated.";
  else if (exp) scope = "Used when splitting shared expenses across the group.";
  else scope = "Defines how amounts are shared when you add expenses.";

  return (
    <div className="rounded-m-hero border border-surface-300 bg-bg2/40 p-m-5">
      <div className="flex flex-wrap items-start justify-between gap-m-3">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ctx-accent">Split rule</p>
          <p className="mt-2 text-[17px] font-semibold capitalize text-ctx-text">{rule}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{scope}</p>
          <p className="mt-m-3 text-[12px] text-ink-4">
            Funding mode: <span className="font-medium capitalize text-ink-2">{detail.funding_model.replace(/_/g, " ")}</span>
          </p>
        </div>
        <p className="shrink-0 rounded-m-chip border border-ctx-accent/30 bg-ctx-accent/10 px-m-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ctx-accent">
          Live rule
        </p>
      </div>
      <p className="mt-m-4 text-[11px] leading-relaxed text-ink-4">
        Change how the group splits by updating group settings when your admin allows it — keep this aligned with how you actually collect money.
      </p>
    </div>
  );
}
