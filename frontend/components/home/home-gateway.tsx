"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchBusinessWorkspaces, type BusinessWorkspace } from "@/lib/api/business";
import { fetchGroupHome, type GroupHome } from "@/lib/api/group";
import { fetchPersonalSummary, type PersonalSummary } from "@/lib/api/personal";

type HomeState = {
  personal: PersonalSummary | null;
  group: GroupHome | null;
  business: BusinessWorkspace[] | null;
};

function toNum(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRecommendedHref(state: HomeState): string {
  const activeWorkspace =
    state.business?.find((w) => (w.status || "").toLowerCase() === "active") ??
    state.business?.[0] ??
    null;

  if (activeWorkspace) return `/workspaces/${activeWorkspace.workspace_id}/business`;
  if ((state.group?.active_group_count ?? 0) > 0) return "/group";
  return "/personal";
}

function getRecommendedReason(state: HomeState): string {
  const activeWorkspaceCount = (state.business ?? []).filter(
    (w) => (w.status || "").toLowerCase() === "active",
  ).length;
  if (activeWorkspaceCount > 0) return "You already have active business workspaces.";
  if ((state.group?.active_group_count ?? 0) > 0) return "You have active group coordination in progress.";
  return "Start from Personal to set up your baseline money flow.";
}

export function HomeGateway() {
  const { user, loading: authLoading } = useAuth();
  const [loadingState, setLoadingState] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, setState] = useState<HomeState>({
    personal: null,
    group: null,
    business: null,
  });

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    void (async () => {
      setLoadingState(true);
      setLoadError(null);
      try {
        const token = await user.getIdToken();
        const [personalRes, groupRes, businessRes] = await Promise.allSettled([
          fetchPersonalSummary(token),
          fetchGroupHome(token),
          fetchBusinessWorkspaces(token, true),
        ]);
        if (cancelled) return;
        setState({
          personal: personalRes.status === "fulfilled" ? personalRes.value : null,
          group: groupRes.status === "fulfilled" ? groupRes.value : null,
          business: businessRes.status === "fulfilled" ? businessRes.value : [],
        });

        const failures = [personalRes, groupRes, businessRes].filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          setLoadError("Some data could not be loaded. You can still open any module directly.");
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load your account snapshot.");
        }
      } finally {
        if (!cancelled) setLoadingState(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const recommendedHref = useMemo(() => getRecommendedHref(state), [state]);
  const recommendedReason = useMemo(() => getRecommendedReason(state), [state]);
  const activeGroupCount = state.group?.active_group_count ?? 0;
  const pendingCommitments = state.group?.pending_commitment_count ?? 0;
  const overdueCommitments = state.group?.overdue_commitment_count ?? 0;
  const activeBusinessCount = (state.business ?? []).filter(
    (w) => (w.status || "").toLowerCase() === "active",
  ).length;
  const personalSpent = toNum(state.personal?.total_spent_period);
  const personalAllocated = toNum(state.personal?.total_allocated);

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto w-full max-w-6xl px-m-4 py-m-10 lg:px-m-8 lg:py-m-12">
        <section className="relative overflow-hidden rounded-m-hero border border-surface-300 bg-ctx-cover p-m-6 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_16%,transparent)] md:p-m-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20"
            style={{ background: "var(--ctx-accent)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-12 left-12 h-36 w-36 rounded-full opacity-15"
            style={{ background: "var(--ctx-accent-end)" }}
          />
          <div className="relative max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent">
              Momentra · Money by context
            </p>
            <h1 className="mt-2 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ctx-text md:text-[38px]">
              Choose your operating console
            </h1>
            <p className="mt-m-3 text-[13px] leading-relaxed text-ctx-text/80 md:text-[14px]">
              Personal for your own flow, Group for shared money coordination, Business for team spend controls.
            </p>

            {!authLoading && !user ? (
              <div className="mt-m-6 flex flex-wrap gap-m-3">
                <Link
                  href="/login?next=%2F"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-m-cta bg-gradient-to-br from-ctx-accent to-ctx-accent-end px-m-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_0_24px_-8px_var(--ctx-accent)]"
                >
                  Sign in to continue
                </Link>
              </div>
            ) : (
              <div className="mt-m-6 flex flex-wrap items-center gap-m-3">
                <Link
                  href={recommendedHref}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-m-cta bg-gradient-to-br from-ctx-accent to-ctx-accent-end px-m-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_0_24px_-8px_var(--ctx-accent)]"
                >
                  Continue where you left off
                </Link>
                <p className="text-[12px] text-ctx-text/70">{recommendedReason}</p>
              </div>
            )}
          </div>
        </section>

        {loadError ? (
          <div className="mt-m-6 rounded-m-chip border border-urgency-medium/40 bg-bg2 px-m-4 py-m-3 text-[12px] text-urgency-medium">
            {loadError}
          </div>
        ) : null}

        <section className="mt-m-8 grid gap-m-4 lg:grid-cols-3">
          <article className="rounded-m-card border border-surface-300 bg-surface-100 p-m-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent">Personal</p>
            <h2 className="mt-m-2 text-[20px] font-semibold text-ink">Daily spending</h2>
            <p className="mt-m-2 text-[12px] leading-relaxed text-ink-3">
              Track transactions, pace spending, and maintain goals against current cycle budgets.
            </p>
            {user && !loadingState ? (
              <p className="mt-m-4 text-[12px] text-ink-2">
                Spent this period: <span className="font-semibold">₹{Math.round(personalSpent).toLocaleString("en-IN")}</span>
                {" · "}
                Allocated: <span className="font-semibold">₹{Math.round(personalAllocated).toLocaleString("en-IN")}</span>
              </p>
            ) : null}
            <Link
              href="/personal"
              className="mt-m-5 inline-flex min-h-[40px] items-center rounded-m-chip border border-surface-300 px-m-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-2 transition-colors hover:border-ctx-border hover:text-ctx-accent"
            >
              Open personal
            </Link>
          </article>

          <article className="rounded-m-card border border-surface-300 bg-surface-100 p-m-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent">Group</p>
            <h2 className="mt-m-2 text-[20px] font-semibold text-ink">Shared coordination</h2>
            <p className="mt-m-2 text-[12px] leading-relaxed text-ink-3">
              Coordinate commitments, shared expenses, and nudges for trips, flats, family pools, and events.
            </p>
            {user && !loadingState ? (
              <p className="mt-m-4 text-[12px] text-ink-2">
                Active groups: <span className="font-semibold">{activeGroupCount}</span>
                {" · "}
                Pending: <span className="font-semibold">{pendingCommitments}</span>
                {" · "}
                Overdue: <span className="font-semibold">{overdueCommitments}</span>
              </p>
            ) : null}
            <Link
              href="/group"
              className="mt-m-5 inline-flex min-h-[40px] items-center rounded-m-chip border border-surface-300 px-m-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-2 transition-colors hover:border-ctx-border hover:text-ctx-accent"
            >
              Open group
            </Link>
          </article>

          <article className="rounded-m-card border border-surface-300 bg-surface-100 p-m-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent">Business</p>
            <h2 className="mt-m-2 text-[20px] font-semibold text-ink">Operational controls</h2>
            <p className="mt-m-2 text-[12px] leading-relaxed text-ink-3">
              Run workspace-level budgets, approval flow, units, vendors, and cost-center visibility.
            </p>
            {user && !loadingState ? (
              <p className="mt-m-4 text-[12px] text-ink-2">
                Active workspaces: <span className="font-semibold">{activeBusinessCount}</span>
              </p>
            ) : null}
            <Link
              href="/business"
              className="mt-m-5 inline-flex min-h-[40px] items-center rounded-m-chip border border-surface-300 px-m-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-2 transition-colors hover:border-ctx-border hover:text-ctx-accent"
            >
              Open business
            </Link>
          </article>
        </section>
      </div>
    </div>
  );
}
