"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchGroupMoments, type GroupMomentSummary } from "@/lib/api/group";

// ── Helpers ────────────────────────────────────────────────────────────────

function inr(n: number | string) {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(v)) return "—";
  const suffix = v >= 1_00_00_000 ? "Cr" : v >= 1_00_000 ? "L" : "";
  const abs = Math.abs(v);
  const scaled = suffix === "Cr" ? abs / 1_00_00_000 : suffix === "L" ? abs / 1_00_000 : abs;
  const fmt = `₹${Math.round(scaled).toLocaleString("en-IN")}`;
  return suffix ? `${fmt}${suffix}` : fmt;
}

const statusStyles: Record<string, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  planning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  completed: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  archived: "border-neutral-500/30 bg-neutral-500/10 text-neutral-400",
};

// ── Main View ──────────────────────────────────────────────────────────────

export function GroupPlanView() {
  const { user, loading: authLoading } = useAuth();
  const [moments, setMoments] = useState<GroupMomentSummary[]>([]);
  const [busy, setBusy] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    setLoadError(null);
    setBusy(true);
    try {
      const m = await fetchGroupMoments(token);
      setMoments(m);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load group moments");
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void load();
    }
  }, [authLoading, user, load]);

  const sortedMoments = useMemo(() => {
    const order: Record<string, number> = { active: 0, planning: 1, completed: 2, archived: 3 };
    return [...moments].sort(
      (a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99) || a.title.localeCompare(b.title),
    );
  }, [moments]);

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
      <h1 className="text-[22px] font-bold text-ink">Group · Plan</h1>

      {/* Subtitle hint */}
      <p className="mt-m-3 text-[12px] text-ink-3">
        All your group moments — shared goals, trips, and recurring pools.
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
      ) : sortedMoments.length === 0 ? (
        <div className="mt-m-8 rounded-m-card border border-dashed border-surface-300 bg-bg2/50 py-m-10 text-center">
          <p className="text-[13px] text-ink-4">
            No group moments yet. Create one from Add or the + menu.
          </p>
        </div>
      ) : (
        <div className="mt-m-6 space-y-m-4">
          {sortedMoments.map((m) => (
            <div
              key={m.group_id}
              className="rounded-m-hero border border-ctx-border/30 bg-ctx-hero/40 p-m-5"
            >
              <div className="flex items-start justify-between gap-m-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-ink truncate">{m.title}</p>
                  <p className="mt-1 text-[11px] text-ink-3">
                    {m.group_type}
                    {m.duration_type ? ` · ${m.duration_type}` : ""}
                    {m.cycle_type ? ` · ${m.cycle_type}` : ""}
                  </p>
                </div>
                {m.target_amount && (
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-semibold tabular-nums text-ink">
                      {inr(m.target_amount)}
                    </p>
                    {m.end_date && (
                      <p className="text-[10px] text-ink-3">by {m.end_date}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Status badge + funding model */}
              <div className="mt-m-3 flex flex-wrap items-center gap-m-2">
                <span
                  className={`inline-block rounded-full border px-m-3 py-1 text-[10px] font-medium ${
                    statusStyles[m.status] ?? "border-surface-300 bg-bg2 text-ink-3"
                  }`}
                >
                  {m.status}
                </span>
                {m.funding_model && (
                  <span className="inline-block rounded-full border border-ctx-accent/30 bg-ctx-hero/80 px-m-3 py-1 text-[10px] font-medium text-ctx-text">
                    {m.funding_model}
                  </span>
                )}
                {m.split_rule_type && (
                  <span className="inline-block rounded-full border border-surface-300 bg-bg2 px-m-3 py-1 text-[10px] font-medium text-ink-3">
                    {m.split_rule_type.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              {/* Description if present */}
              {m.description && (
                <p className="mt-m-3 text-[12px] text-ink-3 line-clamp-2">{m.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
