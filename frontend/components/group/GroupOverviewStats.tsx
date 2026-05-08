"use client";

import type { GroupHubOverviewStat } from "@/lib/group/types";
import { groupStatTile } from "@/lib/group/group-ui";

export function GroupOverviewStats({ stats }: { stats: GroupHubOverviewStat[] }) {
  return (
    <div>
      <p className="mb-m-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/40">Overview</p>
      <div className="grid grid-cols-2 gap-m-2.5 lg:grid-cols-4 lg:gap-m-3">
        {stats.map((s) => (
          <div key={s.id} className={groupStatTile}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/38">{s.label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-ink md:mt-2 md:text-[1.65rem]">{s.value}</p>
            <p className="mt-1.5 text-[11px] leading-snug text-ink-4 md:mt-m-2">{s.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
