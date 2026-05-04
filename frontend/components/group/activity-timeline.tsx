import Link from "next/link";
import type { GroupHome } from "@/lib/api/group";
import { formatDisplayDate } from "@/lib/format/display-date";

export function ActivityTimeline({
  items,
  emptyLabel,
  showGroupLinks = false,
}: {
  items: GroupHome["recent_activity"];
  emptyLabel?: string;
  /** When true, show an “Open group” link for rows that include `group_id`. */
  showGroupLinks?: boolean;
}) {
  if (!items.length) {
    return (
      <p className="text-[14px] text-ink-2">
        {emptyLabel ?? "No recent activity."}
      </p>
    );
  }

  return (
    <ul className="space-y-m-3 border-l border-ctx-border/35 pl-m-4">
      {items.map((a) => (
        <li key={a.activity_id} className="relative text-[12px] text-ink-2">
          <span
            className="absolute -left-[1.125rem] top-1.5 h-2 w-2 rounded-full bg-ctx-accent/80"
            aria-hidden
          />
          <p className="text-ink">{a.message}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-3">
            {a.event_type}
            {a.created_at ? ` · ${formatDisplayDate(a.created_at)}` : ""}
          </p>
          {showGroupLinks && a.group_id ? (
            <p className="mt-m-2">
              <Link
                href={`/group/${a.group_id}`}
                className="text-[11px] font-semibold text-ctx-accent underline decoration-ctx-accent/35 underline-offset-2 transition-colors hover:decoration-ctx-accent"
              >
                Open group →
              </Link>
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
