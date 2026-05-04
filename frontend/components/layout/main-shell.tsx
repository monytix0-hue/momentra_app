"use client";

import { useState, useCallback } from "react";
import { ScreenChrome } from "./screen-chrome";
import { ContextSwitcher, type MomentraContext } from "./context-switcher";
import { BottomNavBar, type MainTab } from "./bottom-nav-bar";
import { FloatingAddButton } from "./floating-add-button";
import { PersonalTodayView } from "@/components/personal/personal-today-view";
import { GroupTodayView } from "@/components/group/group-today-view";
import { PersonalPlanView } from "@/components/personal/personal-plan-view";
import { GroupPlanView } from "@/components/group/group-plan-view";
import { PersonalActivityView } from "@/components/personal/personal-activity-view";
import { GroupActivityView } from "@/components/group/group-activity-view";
import { useAuth } from "@/contexts/auth-context";

export function MainShell() {
  const { user } = useAuth();
  const [selectedContext, setSelectedContext] = useState<MomentraContext>("personal");
  const [selectedTab, setSelectedTab] = useState<MainTab>("today");
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Update data-context on html element to switch CSS variables
  const handleContextChange = useCallback((ctx: MomentraContext) => {
    setSelectedContext(ctx);
    setSelectedTab("today");
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-context", ctx);
    }
  }, []);

  const handleTabChange = useCallback((tab: MainTab) => {
    setSelectedTab(tab);
  }, []);

  return (
    <ScreenChrome context={selectedContext}>
      {/* Context Switcher */}
      <ContextSwitcher selectedContext={selectedContext} onSelect={handleContextChange} />

      {/* Divider */}
      <div className="mx-m-6 h-[0.5px] bg-surface-300/45" />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-m-6 pt-m-6 pb-[80px]">
        <TabContentView
          context={selectedContext}
          tab={selectedTab}
        />
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        <BottomNavBar selectedTab={selectedTab} onSelect={handleTabChange} context={selectedContext} />
      </div>

      {/* FAB */}
      <FloatingAddButton context={selectedContext} onTap={() => setShowAddSheet(true)} />
    </ScreenChrome>
  );
}

// ── Tab Content Router ────────────────────────────────────────────────────

type TabContentViewProps = {
  context: MomentraContext;
  tab: MainTab;
};

function TabContentView({ context, tab }: TabContentViewProps) {
  switch (tab) {
    case "today":
      return <TodayRouter context={context} />;
    case "plan":
      return <PlanRouter context={context} />;
    case "activity":
      return <ActivityRouter context={context} />;
    case "people":
      return <PeopleRouter context={context} />;
    case "me":
      return <MeView context={context} />;
    default:
      return null;
  }
}

// ── Today Router ─────────────────────────────────────────────────────────

function TodayRouter({ context }: { context: MomentraContext }) {
  switch (context) {
    case "personal":
      return <PersonalTodayView />;
    case "group":
      return <GroupTodayView />;
    case "business":
      return <BusinessPlaceholder title="Business · Today" />;
    case "circle":
      return <CirclePlaceholder title="Circle · Today" />;
  }
}

// ── Plan Router ──────────────────────────────────────────────────────────

function PlanRouter({ context }: { context: MomentraContext }) {
  switch (context) {
    case "personal":
      return <PersonalPlanView />;
    case "group":
      return <GroupPlanView />;
    case "business":
      return <BusinessPlaceholder title="Business · Plan" />;
    case "circle":
      return <CirclePlaceholder title="Circle · Plan" />;
  }
}

// ── Activity Router ──────────────────────────────────────────────────────

function ActivityRouter({ context }: { context: MomentraContext }) {
  switch (context) {
    case "personal":
      return <PersonalActivityView />;
    case "group":
      return <GroupActivityView />;
    case "business":
      return <BusinessPlaceholder title="Business · Activity" />;
    case "circle":
      return <CirclePlaceholder title="Circle · Activity" />;
  }
}

// ── People Router ───────────────────────────────────────────────────────

function PeopleRouter({ context }: { context: MomentraContext }) {
  switch (context) {
    case "personal":
      return <PersonalInsightsView />;
    case "group":
      return <GroupPlaceholder title="Group · People" />;
    case "business":
      return <BusinessPlaceholder title="Business · People" />;
    case "circle":
      return <CirclePlaceholder title="Circle · People" />;
  }
}

// ── Me View ──────────────────────────────────────────────────────────────

function MeView({ context: _context }: { context: MomentraContext }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-[22px] font-bold text-ink">Me</h1>
      <p className="mt-m-3 text-[13px] text-ink-3">Profile, settings, and preferences.</p>
    </div>
  );
}

// ── Placeholders ─────────────────────────────────────────────────────────

function PersonalInsightsView() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-[22px] font-bold text-ink">Personal · Insights</h1>
      <p className="mt-m-3 text-[13px] text-ink-3">Spend by category breakdown coming soon.</p>
    </div>
  );
}

function GroupPlaceholder({ title }: { title: string }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-[22px] font-bold text-ink">{title}</h1>
      <p className="mt-m-3 text-[13px] text-ink-3">This view is coming soon.</p>
    </div>
  );
}

function BusinessPlaceholder({ title }: { title: string }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-[22px] font-bold text-ink">{title}</h1>
      <p className="mt-m-3 text-[13px] text-ink-3">This view is coming soon.</p>
    </div>
  );
}

function CirclePlaceholder({ title }: { title: string }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-[22px] font-bold text-ink">{title}</h1>
      <p className="mt-m-3 text-[13px] text-ink-3">This view is coming soon.</p>
    </div>
  );
}
