"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchGroupHome, type GroupHome } from "@/lib/api/group";

// ── Helpers ────────────────────────────────────────────────────────────────

function inr(n: number | string) {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(v)) return "—";
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

function formatDay(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

// ── Main View ──────────────────────────────────────────────────────────────

export function GroupActivityView() {
  const { user, loading: authLoading } = useAuth();
  const [home, setHome] = useState<GroupHome | null>(null);
  const [busy, setBusy] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    setLoadError(null);
    setBusy(true);
    try {
      const h = await fetchGroupHome(token);
      setHome(h);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load group activity");
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void load();
    }
  }, [authLoading, user, load]);

  // Group recent activity by date
  const sections = useMemo(() => {
    if (!home?.recent_activity) return [];
    const grouped: Record<string, typeof home.recent_activity> = {};
    for (const act of home.recent_activity) {
      const day = (act.created_at ?? "").slice(0, 10);
      if (!day) continue;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(act);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([day, items]) => ({ day, items }));
  }, [home]);

  // Determine group title by group_id
  const groupTitles = useMemo(() => {
    if (!home) return {};
    const map: Record<string, string> = {};
    for (const g of home.groups) {
      map[g.group_id] = g.title;
    }
    return map;
  }, [home]);

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Title */}
      <h1 className="text-[22px] font-bold text-ink">Group · Activity</h1>

      {/* Subtitle hint */}
      <p className="mt-m-3 text-[12px] text-ink-3">
        Recent expenses and events across your groups.
      </p>

      {/* Error */}
      {loadError ? (
        <div className="mt-m-4 rounded-m-card border border-urgency-high/35 bg-[#1C0808]/50 px-m-4 py-m-3 text-[13px] text-urgency-high" role="alert">
          {loadError}
        </div>
      ) : null}

      {busy ? (
        <div className="mt-m-8 flex justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
        </div>
      ) : sections.length === 0 ? (
        <div className="mt-m-8 rounded-m-card border border-dashed border-surface-300 bg-bg2/50 py-m-10 text-center">
          <p className="text-[13px] text-ink-4">
            No activity yet. Log an expense or create a moment to see things here.
          </p>
        </div>
      ) : (
        <div className="mt-m-6 space-y-m-6">
          {sections.map(({ day, items }) => (
            <div key={day}>
              <p className="mb-m-3 text-[13px] font-medium text-ink-3">{formatDay(day)}</p>
              <ul className="divide-y divide-rule rounded-m-card border border-surface-300 bg-bg2/60">
                {items.map((act) => {
                  const groupName = groupTitles[act.group_id] ?? "Group";
                  return (
                    <li
                      key={act.activity_id}
                      className="flex items-center justify-between gap-m-3 px-m-4 py-m-3 transition-colors hover:bg-surface-200/20"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">
                          {act.message}
                        </p>
                        <p className="text-[10px] text-ink-3 truncate">{groupName}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-ctx-accent/20 bg-ctx-hero/30 px-m-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-ctx-text">
                        {act.event_type.replace(/_/g, " ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
