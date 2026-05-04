"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { createBusinessWorkspace, fetchBusinessWorkspaces, type BusinessWorkspace } from "@/lib/api/business";

const inputCls =
  "w-full rounded-m-chip border border-surface-300 bg-surface-100 px-m-3 py-2 text-[13px] text-ink";

const BUSINESS_TYPE_OPTIONS = [
  { value: "company", label: "Company" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "agency", label: "Agency" },
  { value: "startup", label: "Startup" },
  { value: "project", label: "Project" },
] as const;

export function BusinessHome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<BusinessWorkspace[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [businessType, setBusinessType] = useState("retail");
  const [budget, setBudget] = useState("");

  async function load() {
    if (!user) return;
    const token = await user.getIdToken();
    setErr(null);
    try {
      setItems(await fetchBusinessWorkspaces(token));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load workspaces");
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      void router.replace(`/login?next=${encodeURIComponent("/business")}`);
      return;
    }
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
      </div>
    );
  }

  const hasWorkspaces = items.length > 0;

  return (
    <div className="space-y-m-6">
      <header className="rounded-m-hero border border-surface-300 bg-surface-100 p-m-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent">Business</p>
        <h1 className="mt-1 text-[clamp(1.4rem,4vw,1.75rem)] font-semibold text-ink">
          {hasWorkspaces ? "Your shops & units" : "New business workspace"}
        </h1>
        <p className="mt-2 max-w-xl text-[14px] leading-snug text-ink-2">
          {hasWorkspaces
            ? "Daily cash, purchases, and bills live inside each workspace — open one below."
            : "Name your shop or unit. You’ll get the full day’s dashboard after this step."}
        </p>
      </header>

      {err ? (
        <p className="rounded-m-chip border border-urgency-high/40 bg-bg2 px-m-3 py-m-2 text-[12px] text-urgency-high">
          {err}
        </p>
      ) : null}

      {hasWorkspaces ? (
        <section className="rounded-m-card border border-surface-300 bg-surface-100 p-m-4">
          <div className="flex flex-wrap items-end justify-between gap-m-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">Go to dashboard</p>
              <p className="mt-1 text-[13px] text-ink-2">This page only lists workspaces — open one for today’s numbers.</p>
            </div>
            <Link
              href="/workspaces"
              className="text-[12px] font-semibold text-ctx-accent hover:underline"
            >
              All workspaces
            </Link>
          </div>
          <ul className="mt-m-4 grid gap-m-3 sm:grid-cols-2">
            {items.map((w) => (
              <li key={w.workspace_id}>
                <Link
                  href={`/workspaces/${w.workspace_id}/business`}
                  className="flex min-h-[56px] flex-col justify-center rounded-m-card border border-surface-300 bg-bg2 p-m-4 transition-colors hover:border-ctx-accent/45 hover:bg-surface-200"
                >
                  <span className="text-[15px] font-semibold text-ink">{w.title}</span>
                  <span className="mt-1 text-[11px] uppercase tracking-[0.08em] text-ink-3">{w.business_type}</span>
                  <span className="mt-2 text-[12px] font-semibold text-ctx-accent">Open dashboard →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-m-card border border-surface-300 bg-surface-100 p-m-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent">
          {hasWorkspaces ? "Add another workspace" : "Create workspace"}
        </p>
        <form
          className="mt-m-3 grid gap-m-2 sm:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user || !title.trim()) return;
            const token = await user.getIdToken();
            const val = parseFloat(budget);
            const row = await createBusinessWorkspace(token, {
              title: title.trim(),
              business_type: businessType || "retail",
              total_budget: Number.isFinite(val) && val > 0 ? val : null,
            });
            setTitle("");
            setBudget("");
            setBusinessType("retail");
            await load();
            void router.push(`/workspaces/${row.workspace_id}/business`);
          }}
        >
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Shop or unit name" />
          <select className={inputCls} value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
            {BUSINESS_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Monthly plan (optional)"
            inputMode="decimal"
            type="number"
            min="0"
            step="0.01"
          />
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center rounded-m-cta bg-ctx-accent px-m-4 text-[13px] font-semibold text-ctx-hero"
            >
              {hasWorkspaces ? "Create and open" : "Create and go to dashboard"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
