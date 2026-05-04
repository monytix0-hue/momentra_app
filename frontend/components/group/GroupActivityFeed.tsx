"use client";

import type { GroupActivityFeedItem } from "@/lib/group/types";
import { groupEmptyPanel, groupSectionTitle } from "@/lib/group/group-ui";

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function GroupActivityFeed({ items }: { items: GroupActivityFeedItem[] }) {
  return (
    <section aria-labelledby="activity-feed-heading">
      <h2 id="activity-feed-heading" className={`${groupSectionTitle} mb-m-4`}>
        Activity
      </h2>
      {items.length === 0 ? (
        <div className={groupEmptyPanel}>
          <p className="text-[15px] font-medium text-ink">Quiet for now</p>
          <p className="mx-auto mt-m-2 max-w-sm text-[14px] leading-relaxed text-ink-3">
            Contributions and new expenses will appear here in order — a simple timeline for the whole group.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-0 border-l border-rule/80 pl-m-5">
          {items.map((a) => (
            <li key={a.activityId} className="pb-m-5 last:pb-0">
              <div className="relative -left-[25px] mb-1.5 mt-0.5 h-2.5 w-2.5 rounded-full border-2 border-ctx-accent bg-bg shadow-[0_0_0_4px_var(--bg)]" />
              <p className="text-[14px] leading-relaxed text-ink-2">{a.message}</p>
              <p className="mt-1.5 text-[11px] font-medium text-ink-4">{formatTime(a.createdAt)}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
