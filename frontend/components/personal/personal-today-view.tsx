"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { createTransaction, fetchPersonalSummary, fetchTransactions, fetchWeeklyReport, type PersonalSummary, type PersonalTransaction } from "@/lib/api/personal";
import { computeTodaySnapshot, formatInr as formatInrInsight } from "@/lib/personal/personal-dashboard-insights";

function inr(n: number | string) {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(v)) return "—";
  return formatInrInsight(v);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const cardCls =
  "relative overflow-hidden rounded-m-hero border border-surface-300 bg-surface-100 shadow-[inset_0_1px_0_0_rgba(201,168,76,0.06)]";

const inputCls =
  "w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink placeholder:text-ink-4 transition-[border-color,box-shadow] duration-fast ease-standard focus:border-ctx-accent focus:outline-none focus:ring-1 focus:ring-ctx-accent/35";

export function PersonalTodayView() {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<PersonalSummary | null>(null);
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<string | null>(null);
  const [weeklyReportLabel, setWeeklyReportLabel] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Quick-add state
  const [quickAmount, setQuickAmount] = useState("");
  const [quickMerchant, setQuickMerchant] = useState("");
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    setLoadError(null);
    try {
      const [s, t] = await Promise.all([
        fetchPersonalSummary(token),
        fetchTransactions(token, { limit: 200, month: todayIso().slice(0, 7) }),
      ]);
      setSummary(s);
      setTransactions(t);

      // Fetch weekly report after summary
      try {
        const wr = await fetchWeeklyReport(token);
        setWeeklyReport(wr.report);
        setWeeklyReportLabel(wr.week_label);
      } catch {
        // weekly report is optional; silently ignore errors
        setWeeklyReport(null);
        setWeeklyReportLabel("");
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void refresh();
    }
  }, [authLoading, user, refresh]);

  // Today's transactions from the month list
  const todayTx = useMemo(() => {
    const today = todayIso();
    return transactions.filter((t) => t.transaction_date.startsWith(today));
  }, [transactions]);

  const todaySpend = useMemo(
    () => todayTx.reduce((sum, t) => (Number(t.amount) > 0 ? sum + Number(t.amount) : sum), 0),
    [todayTx],
  );

  const planRemaining = useMemo(
    () => (summary ? Number(summary.plan_remaining ?? summary.money_left ?? 0) : 0),
    [summary],
  );

  const totalSpent = useMemo(
    () => (summary ? Number(summary.total_spent_period) : 0),
    [summary],
  );

  const monthLabel = useMemo(
    () => (summary?.period_label ?? "This month"),
    [summary],
  );

  // Quick-add handler
  async function onQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const amt = parseFloat(quickAmount);
    if (Number.isNaN(amt) || amt <= 0) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      await createTransaction(token, {
        amount: amt,
        merchant: quickMerchant.trim() || null,
        transaction_date: todayIso(),
      });
      setQuickAmount("");
      setQuickMerchant("");
      setQuickFeedback(`Logged ${inr(amt)}`);
      await refresh();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not add");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!quickFeedback) return;
    const t = window.setTimeout(() => setQuickFeedback(null), 4000);
    return () => window.clearTimeout(t);
  }, [quickFeedback]);

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
      <h1 className="text-[22px] font-bold text-ink">Personal · Today</h1>

      {/* Error */}
      {loadError ? (
        <div className="mt-m-4 rounded-m-card border border-urgency-high/35 bg-[#1C0808]/50 px-m-4 py-m-3 text-[13px] text-urgency-high" role="alert">
          {loadError}
        </div>
      ) : null}

      {/* Feedback */}
      {quickFeedback ? (
        <div className="mt-m-4 rounded-m-card border border-ctx-accent/35 bg-ctx-hero/60 px-m-4 py-m-3 text-[14px] leading-snug text-ink/65" role="status">
          {quickFeedback}
        </div>
      ) : null}

      {/* KPI Row — matches iOS: 3 cells (Spend, Income, Net) */}
      <div className="mt-m-6 grid grid-cols-3 gap-m-3">
        <KpiCell title="Spend" value={inr(todaySpend)} />
        <KpiCell title="Income" value="₹0" />
        <KpiCell
          title="Net"
          value={inr(-todaySpend)}
          accent={todaySpend > 0 ? "var(--u-high)" : "var(--u-cta)"}
        />
      </div>

      {/* Action Row — matches iOS: 2 buttons */}
      <div className="mt-m-4 grid grid-cols-2 gap-m-3">
        <ActionButton label="New moment" icon="🎯" variant="primary" />
        <ActionButton label="Add txn" icon="+" variant="secondary" />
      </div>

      {/* Plan Remaining Card */}
      {summary && planRemaining > 0 && (
        <div className="mt-m-6 rounded-m-card border border-ctx-border/35 bg-ctx-hero/40 px-m-5 py-m-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">
                Plan Remaining
              </p>
              <p className="mt-1 text-[20px] font-bold tabular-nums text-ink">
                {inr(planRemaining)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-ink/35">{monthLabel}</p>
              <p className="text-[12px] text-ink-3">{inr(totalSpent)} used</p>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Spend Report Card */}
      {weeklyReport ? (
        <div className={`${cardCls} mt-m-6 p-m-5 md:p-m-6`}>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink/35">
            Weekly report
          </p>
          <p className="mt-m-3 text-[13px] leading-relaxed text-ink-2 whitespace-pre-line">
            {weeklyReport}
          </p>
          {weeklyReportLabel ? (
            <p className="mt-m-3 text-[10px] text-ink/35">
              {weeklyReportLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Quick Add Form */}
      <div className={`${cardCls} mt-m-6 p-m-5 md:p-m-6`}>
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink/35">
          Quick add
        </p>
        <form onSubmit={(e) => void onQuickAdd(e)} className="mt-m-4 grid grid-cols-1 gap-m-3 sm:grid-cols-4">
          <input
            type="number"
            step="1"
            min="1"
            placeholder="Amount"
            value={quickAmount}
            onChange={(e) => setQuickAmount(e.target.value)}
            className={`${inputCls} sm:col-span-1`}
            required
            autoFocus
          />
          <input
            placeholder="What for? (optional)"
            value={quickMerchant}
            onChange={(e) => setQuickMerchant(e.target.value)}
            className={`${inputCls} sm:col-span-2`}
          />
          <button
            type="submit"
            disabled={busy || !quickAmount}
            className="min-h-[44px] touch-manipulation rounded-[14px] bg-gradient-to-br from-ctx-accent to-ctx-accent-end py-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_0_24px_-8px_var(--ctx-accent)] transition-[opacity,transform] duration-fast hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
          >
            {busy ? "…" : "Log"}
          </button>
        </form>
      </div>

      {/* Today's Ledger — matches iOS section label + list */}
      <div className="mt-m-8">
        <p className="mb-m-4 text-[13px] font-medium text-ink">
          Today&rsquo;s ledger
        </p>

        {todayTx.length === 0 ? (
          <div className="rounded-m-card border border-dashed border-surface-300 bg-bg2/50 py-m-10 text-center">
            <p className="text-[13px] text-ink-4">
              No transactions dated today. Use the quick add form above to log income or expense.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-rule">
            {todayTx.map((t) => {
              const catLine = [t.category, t.subcategory].filter(Boolean).join(" › ");
              const title = t.merchant || catLine || "Transaction";
              return (
                <li
                  key={t.transaction_id}
                  className="flex items-center justify-between gap-m-4 py-m-4 transition-colors duration-fast first:pt-0 hover:bg-surface-200/20"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">{title}</p>
                    {catLine && t.merchant && (
                      <p className="mt-0.5 text-[11px] text-ink-3 truncate">{catLine}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">
                    {inr(t.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer hint — matches iOS */}
      <p className="mt-m-6 text-[11px] text-ink-4">
        Goals and moments live on{' '}
        <span className="font-semibold text-ink/65">Plan</span>.
        Use <span className="font-semibold text-ink/65">+ Add</span> for income or expenses.
      </p>
    </div>
  );
}

// ── KPI Cell ─────────────────────────────────────────────────────────────

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

// ── Action Button ─────────────────────────────────────────────────────────

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
