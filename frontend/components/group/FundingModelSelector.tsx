"use client";

import type { GroupFundingModel } from "@/lib/group/types";

const options: { id: GroupFundingModel; title: string; description: string }[] = [
  {
    id: "pooled",
    title: "Pooled",
    description: "Everyone contributes into one shared pool — great for trips and shared targets.",
  },
  {
    id: "split_expenses",
    title: "Split expenses",
    description: "Log bills and settle who owes whom — ideal for roommates and shared living.",
  },
  {
    id: "hybrid",
    title: "Hybrid",
    description: "Combine a contribution pool with expense splits when you need both.",
  },
];

export function FundingModelSelector({
  value,
  onChange,
}: {
  value: GroupFundingModel;
  onChange: (v: GroupFundingModel) => void;
}) {
  return (
    <div className="flex flex-col gap-m-3">
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`rounded-m-hero border px-m-4 py-m-3 text-left transition-[border-color,background-color,transform] duration-fast ease-standard active:scale-[0.996] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctx-accent ${
              selected
                ? "border-ctx-accent bg-ctx-accent/[0.07] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_18%,transparent)]"
                : "border-surface-300/90 bg-bg2/70 hover:border-ctx-accent/28"
            }`}
          >
            <span className="block text-[15px] font-semibold text-ink">{o.title}</span>
            <span className="mt-1 block text-[13px] leading-relaxed text-ink-3">{o.description}</span>
          </button>
        );
      })}
    </div>
  );
}
