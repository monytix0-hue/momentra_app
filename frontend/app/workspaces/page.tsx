"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchBusinessWorkspaces, type BusinessWorkspace } from "@/lib/api/business";

export default function WorkspacesIndexPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<BusinessWorkspace[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await user.getIdToken();
        const rows = await fetchBusinessWorkspaces(token, true);
        if (!cancelled) setWorkspaces(rows);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not load workspaces");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || user) return;
    router.replace(`/login?next=${encodeURIComponent("/workspaces")}`);
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-bg">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-lg px-m-4 py-m-10">
        <h1 className="text-[22px] font-semibold text-ink">Workspaces</h1>
        <p className="mt-2 text-[14px] text-ink-2">Pick where you want to work today.</p>
        {err ? (
          <p className="mt-m-4 rounded-m-chip border border-urgency-high/35 bg-bg2 px-m-3 py-m-2 text-[13px] text-urgency-high">{err}</p>
        ) : null}
        <ul className="mt-m-6 space-y-m-3">
          {workspaces === null ? (
            <li className="h-16 animate-pulse rounded-m-card bg-surface-200/80" />
          ) : workspaces.length === 0 ? (
            <li className="rounded-m-card border border-dashed border-surface-300 bg-surface-100/80 p-m-4 text-[14px] text-ink-2">
              No workspace yet. Create one from the home screen, then come back here.
            </li>
          ) : (
            workspaces.map((w) => (
              <li key={w.workspace_id}>
                <Link
                  href={`/workspaces/${w.workspace_id}/business`}
                  className="block rounded-m-card border border-surface-300/90 bg-surface-100 p-m-4 transition hover:border-ctx-accent/40"
                >
                  <p className="text-[16px] font-semibold text-ink">{w.title}</p>
                  <p className="mt-1 text-[12px] text-ink-3">{w.business_type}</p>
                  <p className="mt-2 text-[12px] font-medium text-ctx-accent">Open business panel →</p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
