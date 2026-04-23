"use client";

import type { GroupInsight } from "@/lib/group/types";

const toneClass: Record<GroupInsight["tone"], string> = {
  warm: "border-ctx-accent/22 bg-ctx-accent/[0.07] text-ink-2",
  notice: "border-status-pending-fg/28 bg-status-pending-fg/[0.06] text-ink-2",
  neutral: "border-surface-300/90 bg-bg2/85 text-ink-3",
};

export function GroupHealthInsights({ insights }: { insights: GroupInsight[] }) {
  if (!insights.length) return null;
  return (
    <div className="mt-m-6 space-y-m-2 md:mt-m-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/35">At a glance</p>
      <ul className="flex flex-col gap-m-2 sm:flex-row sm:flex-wrap">
        {insights.map((i) => (
          <li
            key={i.id}
            className={`min-w-0 flex-1 rounded-m-card border px-m-3 py-m-2.5 text-[13px] leading-snug shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_5%,transparent)] sm:px-m-4 sm:py-m-3 ${toneClass[i.tone]}`}
          >
            {i.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
