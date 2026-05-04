"use client";

import { useMemo } from "react";

export type MomentraContext = "personal" | "group" | "business" | "circle";

const CONTEXTS: { id: MomentraContext; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "group", label: "Group" },
  { id: "business", label: "Business" },
  { id: "circle", label: "Circle" },
];

const CONTEXT_STYLES: Record<MomentraContext, { accent: string; surface: string; text: string; tabBg: string }> = {
  personal: { accent: "var(--p-acc)", surface: "var(--p-surf)", text: "var(--p-text)", tabBg: "var(--p-tab)" },
  group: { accent: "var(--g-acc)", surface: "var(--g-surf)", text: "var(--g-text)", tabBg: "var(--g-tab)" },
  business: { accent: "var(--b-acc)", surface: "var(--b-surf)", text: "var(--b-text)", tabBg: "var(--b-tab)" },
  circle: { accent: "var(--c-acc)", surface: "var(--c-surf)", text: "var(--c-text)", tabBg: "var(--c-tab)" },
};

type ContextSwitcherProps = {
  selectedContext: MomentraContext;
  onSelect: (ctx: MomentraContext) => void;
};

export function ContextSwitcher({ selectedContext, onSelect }: ContextSwitcherProps) {
  return (
    <div
      className="overflow-x-auto px-m-6 pt-m-3 pb-0"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <div
        className="inline-flex gap-0 rounded-m-hero p-[4px]"
        style={{ background: "color-mix(in srgb, var(--s100) 97%, transparent)" }}
      >
        {CONTEXTS.map((ctx) => {
          const styles = CONTEXT_STYLES[ctx.id];
          const isSelected = selectedContext === ctx.id;
          return (
            <button
              key={ctx.id}
              type="button"
              onClick={() => onSelect(ctx.id)}
              className="flex items-center gap-[5px] whitespace-nowrap rounded-m-chip px-m-4 py-[7px] text-[11px] font-medium uppercase tracking-[0.04em] transition-all duration-fast"
              style={{
                color: isSelected ? styles.text : "color-mix(in srgb, var(--on-dark) 38%, transparent)",
                background: isSelected ? styles.surface : "color-mix(in srgb, var(--on-dark) 5%, var(--s100))",
              }}
            >
              <span
                className="h-[6px] w-[6px] rounded-full"
                style={{ background: styles.accent }}
              />
              {ctx.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
