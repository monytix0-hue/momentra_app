"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchGroupHome, type GroupHome } from "@/lib/api/group";
import { mapGroupHomeToHubViewModel } from "@/lib/group/api-adapters";
import { GroupCard } from "@/components/group/GroupCard";
import { EmptyGroupsState } from "@/components/group/EmptyGroupsState";
import { GroupHubError } from "@/components/group/GroupHubError";
import { GroupHubHeader } from "@/components/group/GroupHubHeader";
import { GroupHubSkeleton } from "@/components/group/GroupHubSkeleton";
import { GroupOverviewStats } from "@/components/group/GroupOverviewStats";
import { GroupPrioritySection } from "@/components/group/GroupPrioritySection";
import { groupBtnPrimary, groupPanelElevated, groupSectionTitle, groupSpinner } from "@/lib/group/group-ui";

export function GroupHubExperience() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<GroupHome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHomePayload = useCallback(async () => {
    if (!user) throw new Error("Sign in required");
    const token = await user.getIdToken();
    return fetchGroupHome(token);
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const next = await fetchHomePayload();
        if (cancelled) return;
        setData(next);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setData(null);
        setError(e instanceof Error ? e.message : "Couldn’t load groups. Check your connection and try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, fetchHomePayload]);

  const retryFetch = useCallback(() => {
    if (!user) return;
    void (async () => {
      try {
        const next = await fetchHomePayload();
        setData(next);
        setError(null);
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : "Couldn’t load groups. Check your connection and try again.");
      }
    })();
  }, [fetchHomePayload, user]);

  const vm = useMemo(() => (data ? mapGroupHomeToHubViewModel(data) : null), [data]);

  const empty =
    data &&
    data.groups.length === 0 &&
    data.pending_commitment_count === 0 &&
    data.overdue_commitment_count === 0;

  const waitingFirstLoad = !!user && data === null && error === null;

  if (authLoading) {
    return (
      <div className="flex min-h-[42vh] flex-col items-center justify-center gap-m-4">
        <div className={groupSpinner} aria-hidden />
        <p className="text-[13px] text-ink-4">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${groupPanelElevated} mx-auto max-w-md px-m-8 py-m-9 text-center`}>
        <p className="text-[16px] font-medium text-ink">Sign in to see your groups</p>
        <p className="mt-m-2 text-[14px] leading-relaxed text-ink-3">
          Shared plans and reminders stay private to you and people you invite.
        </p>
        <Link href="/login?next=/group" className={`${groupBtnPrimary} mx-auto mt-m-6 w-full max-w-[280px]`}>
          Continue
        </Link>
      </div>
    );
  }

  if (error && !data) {
    return <GroupHubError message={error} onRetry={retryFetch} />;
  }

  if (waitingFirstLoad) {
    return <GroupHubSkeleton />;
  }

  if (!data || !vm) {
    return <GroupHubSkeleton />;
  }

  return (
    <div className="space-y-m-8 md:space-y-m-10">
      <GroupHubHeader />

      {empty ? (
        <EmptyGroupsState />
      ) : (
        <>
          <GroupOverviewStats stats={vm.stats} />

          {vm.priorities.length > 0 ? <GroupPrioritySection items={vm.priorities} /> : null}

          <section aria-labelledby="all-groups-heading">
            <h2 id="all-groups-heading" className={`${groupSectionTitle} mb-m-4`}>
              Your groups
            </h2>
            <div className="grid gap-m-3 sm:grid-cols-2 sm:gap-m-4 lg:grid-cols-2 xl:grid-cols-3">
              {vm.cards.map((c) => (
                <GroupCard key={c.groupId} card={c} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
