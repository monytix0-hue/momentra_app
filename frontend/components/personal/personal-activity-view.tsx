"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchTransactions, type PersonalTransaction } from "@/lib/api/personal";

export function PersonalActivityView() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    try {
      const t = await fetchTransactions(token, { limit: 200 });
      setTransactions(t);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // Group by date
  const sections = useMemo(() => {
    const grouped: Record<string, PersonalTransaction[]> = {};
    for (const t of transactions) {
      const day = t.transaction_date.slice(0, 10);
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(t);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([day, txns]) => ({ day, txns }));
  }, [transactions]);

  function formatDay(iso: string) {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  }

  function inr(amount: number | string) {
    const v = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${Math.round(v).toLocaleString("en-IN")}`;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[22px] font-bold text-ink">Personal · Activity</h1>
      <p className="mt-m-3 text-[12px] text-ink-3">
        Ledger grouped by book date.
      </p>

      {busy ? (
        <div className="mt-m-8 flex justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
        </div>
      ) : sections.length === 0 ? (
        <div className="mt-m-8 rounded-m-card border border-dashed border-surface-300 bg-bg2/50 py-m-10 text-center">
          <p className="text-[13px] text-ink-4">
            No transactions loaded. Add income or expense from the + button.
          </p>
        </div>
      ) : (
        <div className="mt-m-6 space-y-m-6">
          {sections.map(({ day, txns }) => (
            <div key={day}>
              <p className="mb-m-3 text-[13px] font-medium text-ink-3">{formatDay(day)}</p>
              <ul className="divide-y divide-rule rounded-m-card border border-surface-300 bg-bg2/60">
                {txns.map((t) => {
                  const catLine = [t.category, t.subcategory].filter(Boolean).join(" › ");
                  const title = t.merchant || catLine || "Transaction";
                  return (
                    <li
                      key={t.transaction_id}
                      className="flex items-center justify-between gap-m-3 px-m-4 py-m-3 transition-colors hover:bg-surface-200/20"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">{title}</p>
                        {catLine && t.merchant && (
                          <p className="text-[10px] text-ink-3 truncate">{catLine}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[14px] font-semibold tabular-nums text-ink">
                        {inr(t.amount)}
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
