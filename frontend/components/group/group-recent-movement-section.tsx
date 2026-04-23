import Link from "next/link";
import type { GroupHome } from "@/lib/api/group";
import { ConsoleSectionTitle } from "@/components/group/group-console-shared";
import { formatDisplayDate } from "@/lib/format/display-date";
import { isActivityToday } from "@/lib/group/group-home-console";

function eventIcon(eventType: string): string {
  const t = eventType.toLowerCase();
  if (t.includes("remind")) return "◆";
  if (t.includes("pay") || t.includes("payment")) return "₹";
  if (t.includes("expense")) return "⏷";
  if (t.includes("commit")) return "✓";
  if (t.includes("member") || t.includes("join")) return "◎";
  return "·";
}

function humanMovementLine(a: GroupHome["recent_activity"][number]): string {
  const msg = (a.message || "").trim();
  if (msg && !msg.endsWith(".")) return `${msg}.`;
  return msg || "Something changed in your group.";
}

export function GroupMovementRow({ a }: { a: GroupHome["recent_activity"][number] }) {
  const icon = eventIcon(a.event_type);
  const today = isActivityToday(a.created_at);

  return (
    <li className="group/row flex gap-m-4 rounded-m-chip border border-transparent px-m-2 py-m-3 transition-[border-color,background-color] duration-200 hover:border-surface-300 hover:bg-bg2/40">
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ctx-accent/35 bg-ctx-accent/[0.12] text-[12px] text-ctx-accent shadow-[0_0_16px_-8px_var(--ctx-accent)]"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-ink">{humanMovementLine(a)}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-m-2 gap-y-1 text-[10px] uppercase tracking-wider text-ink-3">
          <span>{a.event_type.replace(/_/g, " ")}</span>
          {a.created_at ? <span>{formatDisplayDate(a.created_at)}</span> : null}
          {today ? (
            <span className="rounded-m-chip border border-ctx-accent/35 px-m-1.5 py-0.5 text-[9px] font-semibold text-ctx-accent">
              Today
            </span>
          ) : null}
        </p>
        {a.group_id ? (
          <Link
            href={`/group/${a.group_id}`}
            className="mt-m-2 inline-flex text-[11px] font-semibold text-ctx-accent underline decoration-ctx-accent/30 underline-offset-2 transition-colors group-hover/row:decoration-ctx-accent"
          >
            Open group →
          </Link>
        ) : null}
      </div>
    </li>
  );
}

export function GroupRecentMovementSection({ items }: { items: GroupHome["recent_activity"] }) {
  return (
    <section className="min-w-0">
      <ConsoleSectionTitle
        eyebrow="Motion"
        title="Recent movement"
        subtitle="Live coordination — expenses, payments, and reminders as they happen."
      />
      {!items.length ? (
        <div className="rounded-m-hero border border-dashed border-surface-300 bg-bg2/50 px-m-5 py-m-8 text-center">
          <p className="text-[14px] text-ink-3">No movement yet — things are quiet.</p>
          <p className="mt-2 text-[12px] text-ink-4">
            Post an expense or record a payment in any group to see the stream light up.
          </p>
        </div>
      ) : (
        <ul className="space-y-m-1">
          {items.map((a) => (
            <GroupMovementRow key={a.activity_id} a={a} />
          ))}
        </ul>
      )}
    </section>
  );
}
