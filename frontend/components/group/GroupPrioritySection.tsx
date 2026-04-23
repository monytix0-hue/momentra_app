"use client";

import Link from "next/link";
import type { GroupHubPriorityItem } from "@/lib/group/types";
import { groupEyebrow } from "@/lib/group/group-ui";

const toneBorder: Record<GroupHubPriorityItem["tone"], string> = {
  urgent: "border-urgency-high/30 bg-urgency-high/[0.05] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--urgency-high-label)_12%,transparent)]",
  soon: "border-urgency-medium/28 bg-urgency-medium/[0.05] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--urgency-medium-label)_10%,transparent)]",
  calm: "border-surface-300/90 bg-bg2/60 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_6%,transparent)]",
};

const linkBase =
  "flex flex-col gap-0.5 rounded-m-hero border px-m-4 py-m-3 transition-[border-color,box-shadow,transform] duration-fast ease-standard hover:border-ctx-accent/35 hover:shadow-[0_10px_36px_-22px_rgba(0,0,0,0.45)] active:scale-[0.995] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctx-accent sm:flex-row sm:items-center sm:justify-between sm:gap-m-3 sm:py-m-3.5";

export function GroupPrioritySection({ items }: { items: GroupHubPriorityItem[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="hub-priority-heading">
      <h2 id="hub-priority-heading" className={`${groupEyebrow} mb-m-2`}>
        Worth a look
      </h2>
      <ul className="space-y-m-2">
        {items.map((p) => (
          <li key={p.id}>
            <Link href={p.href} className={`${linkBase} ${toneBorder[p.tone]}`}>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-snug text-ink">{p.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">{p.subtitle}</p>
              </div>
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-ctx-accent sm:pt-0">
                {p.ctaLabel} →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
