"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchBusinessWorkspaces, type BusinessWorkspace } from "@/lib/api/business";
import { BusinessDashboard } from "@/components/business/business-dashboard";

export function BusinessWorkspacePage({ workspaceId }: { workspaceId: string }) {
  const { user, loading } = useAuth();
  const [workspaces, setWorkspaces] = useState<BusinessWorkspace[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    void (async () => {
      try {
        const token = await user.getIdToken();
        setWorkspaces(await fetchBusinessWorkspaces(token, true));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load workspaces");
      }
    })();
  }, [loading, user]);

  if (err) {
    return (
      <p className="rounded-m-chip border border-urgency-high/40 bg-bg2 px-m-3 py-m-2 text-[12px] text-urgency-high">
        {err}
      </p>
    );
  }

  return <BusinessDashboard workspaceId={workspaceId} workspaces={workspaces} />;
}

