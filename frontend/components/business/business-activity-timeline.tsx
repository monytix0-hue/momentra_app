"use client";

import type { BusinessActivity } from "@/lib/api/business";
import { formatBizDate } from "@/lib/business/format";

function iconForEvent(eventType: string): string {
  const e = eventType.toLowerCase();
  if (e.includes("approv")) return "✓";
  if (e.includes("reject")) return "✕";
  if (e.includes("submit") || e.includes("spend")) return "↗";
  if (e.includes("member") || e.includes("invite")) return "◆";
  if (e.includes("unit")) return "⌂";
  if (e.includes("vendor")) return "◇";
  if (e.includes("cost")) return "▦";
  if (e.includes("workspace")) return "◎";
  return "•";
}

function labelForEvent(eventType: string): string {
  const e = eventType.toLowerCase();
  if (e.includes("approv")) return "Approved";
  if (e.includes("reject")) return "Rejected";
  if (e.includes("submit")) return "Submitted";
  if (e.includes("member_invited")) return "Team";
  if (e.includes("unit")) return "Unit";
  if (e.includes("vendor")) return "Vendor";
  if (e.includes("cost")) return "Cost center";
  return eventType.replace(/_/g, " ");
}

export function BusinessActivityRow({ item }: { item: BusinessActivity }) {
  const icon = iconForEvent(item.event_type);
  const cat = labelForEvent(item.event_type);

  return (
    <li className="relative flex gap-m-3 pl-1">
      <div
        className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-300/80 bg-[color-mix(in_srgb,var(--ctx-accent)_14%,var(--s100))] text-[14px] text-ctx-accent shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1 rounded-m-chip border border-surface-300/60 bg-bg2/70 px-m-3 py-m-2 transition-colors duration-300 hover:border-ctx-accent/20">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-4">{cat}</span>
          <span className="text-ink-4">·</span>
          <time className="text-[10px] text-ink-4" dateTime={item.created_at ?? undefined}>
            {formatBizDate(item.created_at)}
          </time>
        </div>
        <p className="mt-1 text-[13px] leading-snug text-ink">{item.message}</p>
      </div>
    </li>
  );
}

export function BusinessActivityTimeline({ items }: { items: BusinessActivity[] }) {
  if (!items.length) {
    return (
      <p className="rounded-m-chip border border-surface-300/60 bg-bg2/40 px-m-4 py-m-6 text-center text-[13px] text-ink-3">
        Activity will stream here as the workspace moves.
      </p>
    );
  }

  return (
    <div className="relative">
      <div
        className="absolute bottom-4 left-5 top-4 w-px bg-gradient-to-b from-ctx-accent/40 via-surface-300/50 to-transparent"
        aria-hidden
      />
      <ul className="relative space-y-m-3">
        {items.map((a) => (
          <BusinessActivityRow key={a.activity_id} item={a} />
        ))}
      </ul>
    </div>
  );
}
