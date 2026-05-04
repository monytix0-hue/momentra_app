"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchMoments, fetchPersonalSummary, type PersonalMoment, type PersonalSummary } from "@/lib/api/personal";

export function PersonalPlanView() {
  const { user } = useAuth();
  const [moments, setMoments] = useState<PersonalMoment[]>([]);
  const [summary, setSummary] = useState<PersonalSummary | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    try {
      const [m, s] = await Promise.all([
        fetchMoments(token),
        fetchPersonalSummary(token).catch(() => null),
      ]);
      setMoments(m);
      setSummary(s);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[22px] font-bold text-ink">Personal · Plan</h1>
      <p className="mt-m-3 text-[12px] text-ink-3">
        Moments, horizons, and targets you are steering toward.
      </p>

      {busy ? (
        <div className="mt-m-8 flex justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
        </div>
      ) : moments.length === 0 ? (
        <div className="mt-m-8 rounded-m-card border border-dashed border-surface-300 bg-bg2/50 py-m-10 text-center">
          <p className="text-[13px] text-ink-4">
            Create a personal moment from Add, or visit Today to see what loaded.
          </p>
        </div>
      ) : (
        <div className="mt-m-6 space-y-m-4">
          {moments.map((m) => (
            <div
              key={m.moment_id}
              className="rounded-m-hero border border-ctx-border/30 bg-ctx-hero/40 p-m-5"
            >
              <div className="flex items-start justify-between gap-m-3">
                <div>
                  <p className="text-[15px] font-semibold text-ink">{m.title}</p>
                  <p className="mt-1 text-[11px] text-ink-3">
                    {m.moment_type} · {m.duration_type}
                  </p>
                </div>
                {m.target_amount && (
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-semibold tabular-nums text-ink">
                      ₹{Number(m.target_amount).toLocaleString("en-IN")}
                    </p>
                    {m.end_date && (
                      <p className="text-[10px] text-ink-3">by {m.end_date}</p>
                    )}
                  </div>
                )}
              </div>
              {m.status && (
                <span className="mt-m-3 inline-block rounded-full border border-ctx-accent/30 bg-ctx-hero/80 px-m-3 py-1 text-[10px] font-medium text-ctx-text">
                  {m.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
