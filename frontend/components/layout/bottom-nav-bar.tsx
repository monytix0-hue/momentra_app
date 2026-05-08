"use client";

import { useMemo } from "react";
import type { MomentraContext } from "./context-switcher";

export type MainTab = "today" | "plan" | "activity" | "people" | "me";

type TabDef = {
  id: MainTab;
  label: string;
  icon: string;
  /** Override icon for a specific context */
  iconFor?: Partial<Record<MomentraContext, string>>;
  /** Override label for a specific context */
  labelFor?: Partial<Record<MomentraContext, string>>;
};

const TABS: TabDef[] = [
  { id: "today", label: "Today", icon: "📅" },
  { id: "plan", label: "Plan", icon: "🎯" },
  { id: "activity", label: "Activity", icon: "📋" },
  { id: "people", label: "People", icon: "👥", labelFor: { personal: "Insights" }, iconFor: { personal: "📊" } },
  { id: "me", label: "Me", icon: "👤" },
];

const CONTEXT_NAV_STYLES: Record<MomentraContext, { accent: string; tabDim: string }> = {
  personal: { accent: "var(--p-acc)", tabDim: "var(--p-dim)" },
  group: { accent: "var(--g-acc)", tabDim: "var(--g-dim)" },
  business: { accent: "var(--b-acc)", tabDim: "var(--b-dim)" },
  circle: { accent: "var(--c-acc)", tabDim: "var(--c-dim)" },
};

type BottomNavBarProps = {
  selectedTab: MainTab;
  onSelect: (tab: MainTab) => void;
  context: MomentraContext;
};

export function BottomNavBar({ selectedTab, onSelect, context }: BottomNavBarProps) {
  const styles = CONTEXT_NAV_STYLES[context];

  return (
    <div className="px-m-6 pt-m-3 pb-m-3">
      <div
        className="flex items-center rounded-m-hero px-[4px] py-0"
        style={{
          background: "color-mix(in srgb, var(--s100) 94%, transparent)",
          border: "0.5px solid color-mix(in srgb, var(--s300) 50%, transparent)",
        }}
      >
        {TABS.map((tab) => {
          const isActive = selectedTab === tab.id;
          const displayIcon = tab.iconFor?.[context] ?? tab.icon;
          const displayLabel = tab.labelFor?.[context] ?? tab.label;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className="flex flex-1 flex-col items-center gap-[2px] py-[6px] transition-all duration-fast"
              style={{
                color: isActive ? styles.accent : styles.tabDim,
              }}
            >
              <span className="text-[15px] leading-none">{displayIcon}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] leading-tight">
                {displayLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
