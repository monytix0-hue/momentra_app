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
  const [businessType, setBusinessType] = useState("company");
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

  const activeCount = items.filter((w) => (w.status || "").toLowerCase() === "active").length;

  return (
    <div className="space-y-m-6">
      <header className="rounded-m-hero border border-surface-300 bg-surface-100 p-m-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent">Business module</p>
        <h1 className="mt-1 text-[26px] font-semibold text-ink">Workspaces</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-ink-3">
          Structured operations for spends, approvals, and controls. Create a workspace, add stores and teammates, and
          run financial workflows with clear visibility.
        </p>
        <div className="mt-m-4 grid gap-m-2 sm:grid-cols-3">
          <div className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-m-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-ink-4">Total workspaces</p>
            <p className="mt-1 text-[18px] font-semibold text-ink">{items.length}</p>
          </div>
          <div className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-m-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-ink-4">Active</p>
            <p className="mt-1 text-[18px] font-semibold text-ink">{activeCount}</p>
          </div>
          <div className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-m-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-ink-4">Setup status</p>
            <p className="mt-1 text-[18px] font-semibold text-ctx-accent">{items.length ? "Ready" : "Create first"}</p>
          </div>
        </div>
      </header>

      <section className="grid gap-m-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-m-card border border-surface-300 bg-surface-100 p-m-4">
          <p className="mb-m-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent">Create workspace</p>
          <form
            className="grid gap-m-2 sm:grid-cols-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user || !title.trim()) return;
              const token = await user.getIdToken();
              const val = parseFloat(budget);
              const row = await createBusinessWorkspace(token, {
                title: title.trim(),
                business_type: businessType || "company",
                total_budget: Number.isFinite(val) && val > 0 ? val : null,
              });
              setTitle("");
              setBudget("");
              setBusinessType("company");
              await load();
              void router.push(`/business/${row.workspace_id}`);
            }}
          >
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Workspace title" />
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
              placeholder="Total budget"
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
            />
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="inline-flex min-h-[40px] items-center rounded-m-chip bg-ctx-accent px-m-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white"
              >
                Create workspace
              </button>
            </div>
          </form>
        </div>
        <div className="rounded-m-card border border-surface-300 bg-surface-100 p-m-4">
          <p className="mb-m-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent">Recommended flow</p>
          <ol className="space-y-m-2 text-[12px] text-ink-3">
            <li className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-m-2">
              1. Create workspace and set business type + budget.
            </li>
            <li className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-m-2">
              2. Add stores, cost centers, and vendors from Quick Setup.
            </li>
            <li className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-m-2">
              3. Invite team by email and enable approval flow.
            </li>
          </ol>
        </div>
      </section>

      {err ? (
        <p className="rounded-m-chip border border-urgency-high/40 bg-bg2 px-m-3 py-m-2 text-[12px] text-urgency-high">
          {err}
        </p>
      ) : null}

      <section className="rounded-m-card border border-surface-300 bg-surface-100 p-m-4">
        <p className="mb-m-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent">Your workspaces</p>
        {!items.length ? (
          <p className="text-[13px] text-ink-3">No workspace yet. Create one to start controlled spend operations.</p>
        ) : (
          <ul className="grid gap-m-2 sm:grid-cols-2">
            {items.map((w) => (
              <li key={w.workspace_id}>
                <Link
                  href={`/business/${w.workspace_id}`}
                  className="block rounded-m-card border border-surface-300 bg-bg2 p-m-3 transition-colors hover:border-ctx-border/50 hover:bg-surface-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-ink">{w.title}</span>
                    <span className="rounded-m-chip border border-surface-300 px-m-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-ink-4">
                      {w.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-ctx-text/80">{w.business_type}</p>
                  <p className="mt-2 text-[11px] text-ink-3">Open workspace dashboard</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

