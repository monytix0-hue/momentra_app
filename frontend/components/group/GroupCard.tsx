"use client";

import Link from "next/link";
import type { GroupHubCardModel } from "@/lib/group/types";
import { groupBtnAccentOutline, groupCardInteractive } from "@/lib/group/group-ui";

const healthPill: Record<GroupHubCardModel["health"], string> = {
  on_track: "border-urgency-clear-value/35 bg-urgency-clear-value/[0.1] text-urgency-clear-value",
  slightly_behind: "border-urgency-medium/38 bg-urgency-medium/[0.08] text-urgency-medium",
  at_risk: "border-urgency-high/38 bg-urgency-high/[0.09] text-urgency-high",
};

const badgeBase = "rounded-m-badge border border-surface-300/80 bg-bg2/90 px-2.5 py-1 text-[10px] font-medium text-ink-2";

export function GroupCard({ card }: { card: GroupHubCardModel }) {
  return (
    <article className={`group/card flex flex-col p-m-5 ${groupCardInteractive}`}>
      <div className="min-w-0">
        <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-ink transition-colors duration-fast group-hover/card:text-ctx-text">
          {card.title}
        </h3>
        <div className="mt-m-2 flex flex-wrap gap-2">
          <span className={badgeBase}>{card.groupTypeLabel}</span>
          <span className={badgeBase}>{card.fundingLabel}</span>
          <span className={`rounded-m-badge border px-2.5 py-1 text-[10px] font-semibold ${healthPill[card.health]}`}>
            {card.healthLabel}
          </span>
        </div>
      </div>
      <p className="mt-m-3 border-t border-rule/80 pt-m-3 text-[14px] leading-relaxed text-ink-2">{card.summaryLine}</p>
      <dl className="mt-m-3 grid grid-cols-2 gap-x-m-3 gap-y-m-2 text-[12px] sm:grid-cols-3">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink/32">Money</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-ink">{card.moneyLine}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink/32">Contributions</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {card.pendingPeopleCount === 0 ? "All caught up" : `${card.pendingPeopleCount} still open`}
          </dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink/32">Next due</dt>
          <dd className="mt-0.5 font-medium text-ink">{card.nextDueLabel ?? "—"}</dd>
        </div>
      </dl>
      <div className="mt-auto pt-m-4">
        <Link href={card.href} className={`${groupBtnAccentOutline} w-full`}>
          Open group
        </Link>
      </div>
    </article>
  );
}
