"use client";

import type { CreateGroupUiKind } from "@/lib/group/types";

const options: { id: CreateGroupUiKind; title: string; description: string; icon: string }[] = [
  {
    id: "trip",
    title: "Trip",
    description: "Weekends away, holidays, road trips — one shared pot or split costs.",
    icon: "✈",
  },
  {
    id: "household",
    title: "Household",
    description: "Rent, utilities, groceries with roommates or family — ongoing rhythm.",
    icon: "🏠",
  },
  {
    id: "event",
    title: "Event",
    description: "Celebrations, gifts, parties — short-lived and easy to settle.",
    icon: "🎉",
  },
  {
    id: "other",
    title: "Other",
    description: "Anything else — you choose how money flows on the next step.",
    icon: "✦",
  },
];

export function GroupTypeSelector({
  value,
  onChange,
}: {
  value: CreateGroupUiKind;
  onChange: (v: CreateGroupUiKind) => void;
}) {
  return (
    <div className="grid gap-m-3 sm:grid-cols-2">
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex gap-m-3 rounded-m-hero border p-m-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-fast ease-standard hover:shadow-[0_8px_28px_-22px_rgba(0,0,0,0.4)] active:scale-[0.995] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctx-accent ${
              selected
                ? "border-ctx-accent bg-ctx-accent/[0.08] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_22%,transparent)]"
                : "border-surface-300/90 bg-bg2/80 hover:border-ctx-accent/32"
            }`}
          >
            <span className="text-2xl leading-none" aria-hidden>
              {o.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-ink">{o.title}</span>
              <span className="mt-1 block text-[12px] leading-relaxed text-ink-3">{o.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
