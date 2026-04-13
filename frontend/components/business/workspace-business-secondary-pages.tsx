"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  approveBusinessSpend,
  fetchBusinessDashboard,
  fetchBusinessVendors,
  fetchBusinessWorkspace,
  fetchBusinessWorkspaces,
  rejectBusinessSpend,
  type BusinessDashboard,
  type BusinessVendor,
  type BusinessWorkspace,
} from "@/lib/api/business";
import { bizMoney, bizNum } from "@/lib/business/format";
import { WorkspaceBusinessPageHeader } from "@/components/business/workspace-business-page-header";

const card = "rounded-m-card border border-surface-300/80 bg-surface-100/95 p-m-4 shadow-sm";

function useWorkspaceShell(workspaceId: string) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<BusinessWorkspace[]>([]);
  const [workspace, setWorkspace] = useState<BusinessWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const loadShell = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      const [ws, w] = await Promise.all([
        fetchBusinessWorkspaces(token, true),
        fetchBusinessWorkspace(token, workspaceId),
      ]);
      setWorkspaces(ws);
      setWorkspace(w);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }, [user, workspaceId]);

  return { user, authLoading, router, workspaces, workspace, loading, err, loadShell };
}

export function WorkspaceBusinessPayablesPage({ workspaceId }: { workspaceId: string }) {
  const { user, authLoading, router, workspaces, workspace, loading, err, loadShell } = useWorkspaceShell(workspaceId);
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [vendors, setVendors] = useState<BusinessVendor[]>([]);
  const [busy, setBusy] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const [d, v] = await Promise.all([
      fetchBusinessDashboard(token, workspaceId),
      fetchBusinessVendors(token, workspaceId),
    ]);
    setDashboard(d);
    setVendors(v);
  }, [user, workspaceId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/workspaces/${workspaceId}/business/payables`)}`);
      return;
    }
    const t = window.setTimeout(() => {
      void Promise.all([loadShell(), load()]);
    }, 0);
    return () => window.clearTimeout(t);
  }, [authLoading, user, loadShell, load, router, workspaceId]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
      </div>
    );
  }

  if (err || !workspace) {
    return (
      <div className={card}>
        <p className="text-[14px] text-urgency-high">{err ?? "Workspace not found"}</p>
        <Link href="/workspaces" className="mt-m-3 inline-block text-ctx-accent">
          Back to workspaces
        </Link>
      </div>
    );
  }

  const vmap = new Map(vendors.map((x) => [x.vendor_id, x.name]));
  const pending = dashboard?.pending_approvals ?? [];

  return (
    <div className="space-y-m-5">
      <WorkspaceBusinessPageHeader
        workspaceId={workspaceId}
        workspaceTitle={workspace.title}
        workspaces={workspaces}
        subtitle="Approve or reject supplier payments waiting in queue."
        onQuickAdd={() => router.push(`/workspaces/${workspaceId}/business`)}
      />
      <section className={card}>
        <h1 className="text-[18px] font-semibold text-ink">To pay</h1>
        <p className="mt-1 text-[13px] text-ink-3">These spends need your approval before money is treated as final.</p>
        <ul className="mt-m-4 space-y-m-3">
          {pending.length === 0 ? (
            <li className="rounded-m-chip border border-dashed border-surface-300 bg-bg2/60 px-m-3 py-m-4 text-[13px] text-ink-3">
              No supplier payments due in this workspace.
            </li>
          ) : (
            pending.map((s) => (
              <li
                key={s.spend_id}
                className="flex flex-col gap-m-2 rounded-m-chip border border-surface-300/90 bg-bg2/70 p-m-3 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="text-[15px] font-semibold text-ink">{s.title}</p>
                  <p className="text-[12px] text-ink-3">
                    {s.vendor_id ? vmap.get(s.vendor_id) ?? "Vendor" : "No vendor"} · {s.spend_type}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[16px] font-semibold tabular-nums">{bizMoney(bizNum(s.amount), workspace.currency)}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (!user) return;
                      setBusy(true);
                      try {
                        const token = await user.getIdToken();
                        await approveBusinessSpend(token, s.spend_id);
                        await load();
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="min-h-[40px] rounded-m-chip bg-emerald-700/90 px-m-3 text-[12px] font-semibold text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectId(s.spend_id)}
                    className="min-h-[40px] rounded-m-chip border border-surface-300 px-m-3 text-[12px] font-medium"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      {rejectId ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-m-4">
          <div className="w-full max-w-md rounded-m-card border border-surface-300 bg-bg p-m-4">
            <p className="text-[15px] font-semibold">Reject spend?</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-m-3 min-h-[96px] w-full rounded-m-chip border border-surface-300 bg-surface-100 px-m-3 py-m-2 text-[13px]"
              placeholder="Reason"
            />
            <div className="mt-m-3 flex justify-end gap-2">
              <button type="button" onClick={() => setRejectId(null)} className="rounded-m-chip px-m-3 py-2 text-[13px]">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !rejectReason.trim()}
                onClick={async () => {
                  if (!user || !rejectId) return;
                  setBusy(true);
                  try {
                    const token = await user.getIdToken();
                    await rejectBusinessSpend(token, rejectId, rejectReason.trim());
                    setRejectId(null);
                    setRejectReason("");
                    await load();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="rounded-m-chip bg-urgency-high px-m-3 py-2 text-[13px] font-semibold text-white"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function WorkspaceBusinessReceivablesPage({ workspaceId }: { workspaceId: string }) {
  const { user, authLoading, router, workspaces, workspace, loading, err, loadShell } = useWorkspaceShell(workspaceId);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/workspaces/${workspaceId}/business/receivables`)}`);
      return;
    }
    void loadShell();
  }, [authLoading, user, loadShell, router, workspaceId]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
      </div>
    );
  }

  if (err || !workspace) {
    return (
      <div className={card}>
        <p className="text-urgency-high">{err}</p>
        <Link href="/workspaces" className="mt-m-2 inline-block text-ctx-accent">
          Workspaces
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-m-5">
      <WorkspaceBusinessPageHeader
        workspaceId={workspaceId}
        workspaceTitle={workspace.title}
        workspaces={workspaces}
        subtitle="Money customers owe you — connect billing to populate this list."
        onQuickAdd={() => router.push(`/workspaces/${workspaceId}/business`)}
      />
      <section className={card}>
        <h1 className="text-[18px] font-semibold text-ink">To collect</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          Customer receivables are not stored in Momentra yet. When your billing or UPI feed connects, dues will appear
          here with reminders.
        </p>
        <p className="mt-m-4 text-[13px] text-ink-3">
          For now, use reminders outside the app and keep notes in your shop diary until collections ship here.
        </p>
      </section>
    </div>
  );
}

export function WorkspaceBusinessTransactionsPage({ workspaceId }: { workspaceId: string }) {
  const { user, authLoading, router, workspaces, workspace, loading, err, loadShell } = useWorkspaceShell(workspaceId);
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [vendors, setVendors] = useState<BusinessVendor[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const [d, v] = await Promise.all([
      fetchBusinessDashboard(token, workspaceId),
      fetchBusinessVendors(token, workspaceId),
    ]);
    setDashboard(d);
    setVendors(v);
  }, [user, workspaceId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/workspaces/${workspaceId}/business/transactions`)}`);
      return;
    }
    const t = window.setTimeout(() => {
      void Promise.all([loadShell(), load()]);
    }, 0);
    return () => window.clearTimeout(t);
  }, [authLoading, user, loadShell, load, router, workspaceId]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
      </div>
    );
  }

  if (err || !workspace) {
    return (
      <div className={card}>
        <p className="text-urgency-high">{err}</p>
      </div>
    );
  }

  const vmap = new Map(vendors.map((x) => [x.vendor_id, x.name]));
  const rows = [...(dashboard?.pending_approvals ?? []), ...(dashboard?.approved_spends ?? [])].sort((a, b) => {
    const ta = new Date(a.submitted_at ?? a.created_at ?? 0).getTime();
    const tb = new Date(b.submitted_at ?? b.created_at ?? 0).getTime();
    return tb - ta;
  });

  return (
    <div className="space-y-m-5">
      <WorkspaceBusinessPageHeader
        workspaceId={workspaceId}
        workspaceTitle={workspace.title}
        workspaces={workspaces}
        subtitle="Sales and expenses recorded for this workspace."
        onQuickAdd={() => router.push(`/workspaces/${workspaceId}/business`)}
      />
      <section className={card}>
        <h1 className="text-[18px] font-semibold text-ink">Transactions</h1>
        <p className="mt-1 text-[13px] text-ink-3">Spend requests and approvals for this workspace.</p>
        <ul className="mt-m-4 divide-y divide-surface-300/60">
          {rows.length === 0 ? (
            <li className="py-m-4 text-[13px] text-ink-3">No transactions yet in this workspace.</li>
          ) : (
            rows.map((s) => (
              <li key={s.spend_id} className="flex items-start justify-between gap-m-3 py-m-3">
                <div>
                  <p className="font-medium text-ink">{s.title}</p>
                  <p className="text-[12px] text-ink-3">
                    {s.status} · {s.vendor_id ? vmap.get(s.vendor_id) ?? "Vendor" : "—"}
                  </p>
                </div>
                <span className="shrink-0 text-[14px] font-semibold tabular-nums">{bizMoney(bizNum(s.amount), workspace.currency)}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

export function WorkspaceBusinessInventoryPage({ workspaceId }: { workspaceId: string }) {
  const { user, authLoading, router, workspaces, workspace, loading, err, loadShell } = useWorkspaceShell(workspaceId);
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    setDashboard(await fetchBusinessDashboard(token, workspaceId));
  }, [user, workspaceId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/workspaces/${workspaceId}/business/inventory`)}`);
      return;
    }
    const t = window.setTimeout(() => {
      void Promise.all([loadShell(), load()]);
    }, 0);
    return () => window.clearTimeout(t);
  }, [authLoading, user, loadShell, load, router, workspaceId]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
      </div>
    );
  }

  if (err || !workspace) {
    return (
      <div className={card}>
        <p className="text-urgency-high">{err}</p>
      </div>
    );
  }

  const units = dashboard?.unit_breakdown ?? [];

  return (
    <div className="space-y-m-5">
      <WorkspaceBusinessPageHeader
        workspaceId={workspaceId}
        workspaceTitle={workspace.title}
        workspaces={workspaces}
        subtitle="Stock and unit pressure — full inventory counts connect later."
        onQuickAdd={() => router.push(`/workspaces/${workspaceId}/business`)}
      />
      <section className={card}>
        <h1 className="text-[18px] font-semibold text-ink">Stock & units</h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Physical stock counts are not in Momentra yet. Below is unit budget usage — a stand-in for low headroom alerts.
        </p>
        <ul className="mt-m-4 space-y-m-2">
          {units.length === 0 ? (
            <li className="rounded-m-chip border border-dashed border-surface-300 bg-bg2/60 px-m-3 py-m-4 text-[13px] text-ink-3">
              No inventory items in this workspace yet.
            </li>
          ) : (
            units.map((u) => (
              <li key={u.key} className="flex items-center justify-between rounded-m-chip border border-surface-300/80 bg-bg2/70 px-m-3 py-m-2">
                <span className="text-[14px] font-medium text-ink">{u.label}</span>
                <span className="text-[13px] text-ink-3">
                  {u.utilization_ratio != null ? `${Math.round(u.utilization_ratio * 100)}% used` : "—"}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
