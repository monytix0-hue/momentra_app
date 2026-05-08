"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchGroupHome, type GroupHome } from "@/lib/api/group";
import { GroupRecommendedActionsSection } from "@/components/group/group-recommended-actions-section";
import { GroupOverviewSummaryV3 } from "@/components/group/group-overview-summary-v3";
import { GroupHealthSection } from "@/components/group/group-health-section";
import { GroupRecentMovementSection } from "@/components/group/group-recent-movement-section";
import { PendingCommitmentsSectionV3 } from "@/components/group/pending-commitments-section-v3";
import { TodayGroupsSection } from "@/components/group/today-groups-section";
import { WhoNeedsANudgeSection } from "@/components/group/who-needs-a-nudge-section";
import { ConsoleCard, severityAccentVar } from "@/components/group/group-console-shared";
import {
  buildActiveGroupRows,
  buildNudgeRows,
  buildRecommendedActions,
  buildTodayItems,
  openBalanceFromCommitments,
} from "@/lib/group/group-home-console";

const btnPrimary =
  "inline-flex min-h-[44px] items-center justify-center rounded-[14px] bg-gradient-to-br from-ctx-accent to-ctx-accent-end px-m-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_0_24px_-8px_var(--ctx-accent)] transition-[opacity,transform] duration-fast ease-standard hover:opacity-95 active:scale-[0.99]";

function GroupSurfaceCard({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-m-hero border border-surface-300 bg-surface-100 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_20%,transparent)] ${className}`}
      style={style}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
        style={{
          background: "linear-gradient(90deg, transparent, var(--ctx-accent), transparent)",
        }}
      />
      {children}
    </div>
  );
}

function isOnboardingEmpty(data: GroupHome): boolean {
  return (
    data.groups.length === 0 &&
    data.pending_commitment_count === 0 &&
    data.overdue_commitment_count === 0
  );
}

function GroupHeadlineStrip({ data }: { data: GroupHome }) {
  const sev = (data.trigger_severity || "low").toLowerCase();
  const accent = severityAccentVar(sev === "high" ? "high" : sev === "medium" ? "medium" : sev === "low" ? "low" : "calm");
  return (
    <ConsoleCard
      className="border-l-[3px] pl-0"
      style={{ borderLeftColor: accent }}
      glow={false}
    >
      <div className="flex flex-col gap-m-3 p-m-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ctx-accent/80">Right now</p>
          <p className="mt-1 font-serif text-[18px] font-medium leading-snug text-ctx-text md:text-[20px]">
            {data.trigger_message}
          </p>
        </div>
        {data.top_signals[0] && !data.top_signals[0].resolved ? (
          <Link
            href={`/group/${data.top_signals[0].group_id}`}
            className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-ctx-accent underline decoration-ctx-accent/35 underline-offset-4 hover:decoration-ctx-accent"
          >
            Jump in →
          </Link>
        ) : null}
      </div>
    </ConsoleCard>
  );
}

export function GroupHomeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<GroupHome | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await user.getIdToken();
        if (cancelled) return;
        const next = await fetchGroupHome(token);
        if (!cancelled) {
          setData(next);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-bg">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent"
          style={{ animationDuration: "0.9s" }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-m-4 py-m-10 text-center">
        <GroupSurfaceCard className="p-m-10">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ctx-accent">Group</p>
          <p className="mt-m-3 text-[13px] leading-relaxed text-ink-3">
            Sign in to open your daily coordination console — commitments, nudges, and pooled money in one calm view.
          </p>
        </GroupSurfaceCard>
      </div>
    );
  }

  const empty = data ? isOnboardingEmpty(data) : false;
  const gridGap = "gap-[28px]";

  const derived = data
    ? (() => {
        const nudges = buildNudgeRows(data);
        const openTotal = openBalanceFromCommitments(data.pending_commitments);
        return {
          today: buildTodayItems(data, openTotal, nudges),
          actions: buildRecommendedActions(data, nudges),
          nudges,
          healthRows: buildActiveGroupRows(data),
        };
      })()
    : null;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-[20px] pt-[24px] pb-m-16 lg:px-[20px] lg:pt-[24px]">
        <div
          className="mb-m-8 h-px w-20 opacity-60 lg:mb-m-10 lg:w-28"
          style={{
            background: "linear-gradient(90deg, transparent, var(--ctx-accent), transparent)",
          }}
        />

        <header className="mb-m-10 lg:mb-12">
          <GroupSurfaceCard className="bg-ctx-cover px-[26px] py-[22px]">
            <div
              className="pointer-events-none absolute -right-[70px] -top-[70px] h-[220px] w-[220px] rounded-full opacity-[0.18]"
              style={{ background: "var(--ctx-accent)" }}
            />
            <div
              className="pointer-events-none absolute -bottom-[50px] left-[50px] h-[140px] w-[140px] rounded-full opacity-[0.10]"
              style={{ background: "var(--ctx-accent-end)" }}
            />
            <div className="relative grid gap-m-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-m-10">
              <div className="min-w-0 max-w-2xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent/70">
                  Group · Daily console
                </p>
                <h1 className="mt-2 text-[34px] leading-none font-bold tracking-[-0.8px] text-ctx-text lg:text-[38px]">
                  Coordination hub
                </h1>
                <p className="mt-m-3 max-w-xl text-[13px] leading-relaxed text-ctx-text/60">
                  What changed today, who’s still pending, and the next best action — built for shared funds, splits, and
                  recurring cycles you actually keep up with.
                </p>
              </div>
              <div className="flex w-full flex-col gap-m-2 lg:w-auto lg:min-w-[168px] lg:justify-self-end lg:pt-[1.375rem]">
                <Link href="/group/new" className={`${btnPrimary} w-full justify-center lg:w-auto`}>
                  New group
                </Link>
              </div>
            </div>
          </GroupSurfaceCard>
        </header>

        {err ? (
          <div
            className="mb-m-8 rounded-m-card border border-urgency-high/40 bg-bg2 px-m-4 py-m-3 text-[13px] text-urgency-high"
            role="alert"
          >
            {err}
          </div>
        ) : null}

        {data && derived ? (
          <div className={`grid grid-cols-1 ${gridGap} lg:grid-cols-12`}>
            <div className="lg:col-span-12">
              <GroupHeadlineStrip data={data} />
            </div>

            <div className="lg:col-span-12">
              <TodayGroupsSection items={derived.today} />
            </div>
            <div className="lg:col-span-12">
              <GroupOverviewSummaryV3 data={data} />
            </div>

            <div className="grid gap-m-8 lg:col-span-12 lg:grid-cols-2 lg:gap-m-6">
              <div className="min-w-0">
                <GroupRecommendedActionsSection actions={derived.actions} />
              </div>
              <div className="min-w-0">
                <WhoNeedsANudgeSection rows={derived.nudges} />
              </div>
            </div>

            <div className="lg:col-span-12">
              <GroupHealthSection rows={derived.healthRows} />
            </div>

            <div className="grid gap-m-8 lg:col-span-12 lg:grid-cols-12 lg:gap-m-6">
              <div className="min-w-0 lg:col-span-7">
                <PendingCommitmentsSectionV3 rows={data.pending_commitments} />
              </div>
              <div className="min-w-0 lg:col-span-5">
                <GroupRecentMovementSection items={data.recent_activity} />
              </div>
            </div>

            {empty ? (
              <section className="lg:col-span-12">
                <div className="mb-m-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent/75">Start here</p>
                  <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-ctx-text">Create your first group</h2>
                  <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-3">
                    Trip, flat rent, family pool — add people, set commitments or splits, and this console becomes your
                    daily check-in.
                  </p>
                </div>
                <GroupSurfaceCard className="p-m-6 md:p-m-8">
                  <ol className="max-w-xl space-y-m-3 text-[13px] text-ink-2">
                    <li className="flex gap-m-3">
                      <span className="font-semibold tabular-nums text-ctx-accent">1</span>
                      <span>
                        <span className="text-ink">Name the moment</span> — duration, funding model, optional pool target.
                      </span>
                    </li>
                    <li className="flex gap-m-3">
                      <span className="font-semibold tabular-nums text-ctx-accent">2</span>
                      <span>
                        <span className="text-ink">Invite people</span> — commitments and splits follow each participant.
                      </span>
                    </li>
                    <li className="flex gap-m-3">
                      <span className="font-semibold tabular-nums text-ctx-accent">3</span>
                      <span>
                        <span className="text-ink">Come back tomorrow</span> — nudges, signals, and movement stay surfaced for
                        you.
                      </span>
                    </li>
                  </ol>
                  <Link
                    href="/group/new"
                    className={`${btnPrimary} mt-m-8 inline-flex w-full justify-center sm:w-auto`}
                  >
                    Create your first group
                  </Link>
                </GroupSurfaceCard>
              </section>
            ) : null}
          </div>
        ) : !err ? (
          <div className="flex justify-center py-m-10">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent"
              style={{ animationDuration: "0.9s" }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
