"use client";

import type { GroupHome } from "@/lib/api/group";
import { formatDisplayDate } from "@/lib/format/display-date";

export function GroupRecentMovementPreview({
  items,
  limit = 5,
  onViewAll,
}: {
  items: GroupHome["recent_activity"];
  limit?: number;
  onViewAll?: () => void;
}) {
  const slice = items.slice(0, limit);

  return (
    <div className="rounded-m-hero border border-surface-300 bg-surface-100/80 p-m-5">
      <div className="flex flex-wrap items-center justify-between gap-m-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ctx-accent">Recent movement</p>
        {onViewAll ? (
          <button
            type="button"
            className="text-[10px] font-semibold uppercase tracking-wider text-ctx-accent underline decoration-ctx-accent/30 underline-offset-2 hover:decoration-ctx-accent"
            onClick={onViewAll}
          >
            Full timeline
          </button>
        ) : null}
      </div>
      {!slice.length ? (
        <p className="mt-m-3 text-[13px] text-ink-3">No movement yet — expenses and payments will show up here.</p>
      ) : (
        <ul className="mt-m-4 space-y-m-3">
          {slice.map((a) => (
            <li key={a.activity_id} className="flex gap-m-3 text-[13px]">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ctx-accent/80 shadow-[0_0_10px_-2px_var(--ctx-accent)]"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="leading-snug text-ink">{a.message}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-4">
                  {a.event_type.replace(/_/g, " ")}
                  {a.created_at ? ` · ${formatDisplayDate(a.created_at)}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
