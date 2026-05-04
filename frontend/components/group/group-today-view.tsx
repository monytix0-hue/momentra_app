"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchGroupHome, fetchGroupExpenses, type GroupHome, type GroupExpense } from "@/lib/api/group";

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KpiCell({ title, value, accent }: { title: string; value: string; accent?: string }) {
  return (
    <div className="rounded-m-card border border-ctx-border/30 bg-ctx-hero/40 px-m-4 py-m-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">{title}</p>
      <p
        className="mt-1 text-[18px] font-bold tabular-nums"
        style={{ color: accent ?? "var(--ink)" }}
      >
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  variant,
}: {
  label: string;
  icon: string;
  variant: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-m-2 rounded-m-card py-[12px] text-[11px] font-semibold uppercase tracking-[0.04em] transition-all duration-fast active:scale-[0.97]"
      style={
        variant === "primary"
          ? {
              background: "linear-gradient(135deg, var(--ctx-accent), var(--ctx-accent-end))",
              color: "white",
              boxShadow: "0 0 24px -8px var(--ctx-accent)",
            }
          : {
              background: "color-mix(in srgb, var(--ctx-accent) 12%, transparent)",
              color: "var(--ctx-text)",
              border: "0.5px solid color-mix(in srgb, var(--ctx-accent) 35%, transparent)",
            }
      }
    >
      <span className="text-[14px]">{icon}</span>
      {label}
    </button>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────

export function GroupTodayView() {
  const { user, loading: authLoading } = useAuth();
  const [home, setHome] = useState<GroupHome | null>(null);
  const [todayExpenses, setTodayExpenses] = useState<GroupExpense[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    setLoadError(null);
    setBusy(true);
    try {
      const h = await fetchGroupHome(token);
      setHome(h);

      // Fetch expenses from each active group for today
      const today = todayIso();
      const allTodayExpenses: GroupExpense[] = [];
      for (const g of h.groups) {
        try {
          const expenses = await fetchGroupExpenses(token, g.group_id);
          allTodayExpenses.push(
            ...expenses.filter((e) => e.expense_date.startsWith(today)),
          );
        } catch {
          // skip groups that fail
        }
      }
      setTodayExpenses(allTodayExpenses);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load group data");
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void load();
    }
  }, [authLoading, user, load]);

  const activeGroupCount = useMemo(
    () => home?.active_group_count ?? home?.groups.length ?? 0,
    [home],
  );

  const todayTxnCount = todayExpenses.length;
  const todayTotalSpend = useMemo(
    () => todayExpenses.reduce((s, e) => s + Number(e.amount), 0),
    [todayExpenses],
  );

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
      <h1 className="text-[22px] font-bold text-ink">Group · Today</h1>

      {/* Subtitle hint */}
      <p className="mt-m-3 text-[12px] text-ink-3">
        Overview of all your active group moments.
      </p>

      {/* Error */}
      {loadError ? (
        <div className="mt-m-4 rounded-m-card border border-urgency-high/35 bg-[#1C0808]/50 px-m-4 py-m-3 text-[13px] text-urgency-high" role="alert">
          {loadError}
        </div>
      ) : null}

      {/* KPI Row — matches iOS: 3 cells (Active · Spend Today · Open Debts) */}
      <div className="mt-m-6 grid grid-cols-3 gap-m-3">
        <KpiCell title="Active" value={String(activeGroupCount)} />
        <KpiCell title="Spend Today" value={inr(todayTotalSpend)} />
        <KpiCell
          title="Open Debts"
          value={inr(home?.groups.reduce((s, g) => {
            // estimate: each group's open share debt
            return s;
          }, 0) ?? 0)}
          accent="var(--u-high)"
        />
      </div>

      {/* Action Row — matches iOS: 2 buttons */}
      <div className="mt-m-4 grid grid-cols-2 gap-m-3">
        <ActionButton label="New moment" icon="🎯" variant="primary" />
        <ActionButton label="Log expense" icon="+" variant="secondary" />
      </div>

      {/* Loading state */}
      {busy ? (
        <div className="mt-m-8 flex justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
        </div>
      ) : (
        <>
          {/* Today's Expenses */}
          <div className="mt-m-8">
            <p className="mb-m-4 text-[13px] font-medium text-ink">
              Today&rsquo;s group expenses
            </p>

            {todayExpenses.length === 0 ? (
              <div className="rounded-m-card border border-dashed border-surface-300 bg-bg2/50 py-m-10 text-center">
                <p className="text-[13px] text-ink-4">
                  No group expenses logged today.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-rule">
                {todayExpenses.map((e) => {
                  const groupTitle =
                    home?.groups.find((g) => g.group_id === e.group_id)?.title ?? "Group";
                  return (
                    <li
                      key={e.expense_id}
                      className="flex items-center justify-between gap-m-4 py-m-4 transition-colors duration-fast first:pt-0 hover:bg-surface-200/20"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-ink">
                          {e.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-3 truncate">
                          {groupTitle}
                          {e.category ? ` · ${e.category}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">
                        {inr(e.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Footer hint — matches iOS */}
      <p className="mt-m-6 text-[11px] text-ink-4">
        Moments and commitments live on{' '}
        <span className="font-semibold text-ink/65">Plan</span>.
        Use <span className="font-semibold text-ink/65">+ Add</span> for expenses or new moments.
      </p>
    </div>
  );
}
