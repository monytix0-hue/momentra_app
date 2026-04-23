"use client";

import { WorkspaceSwitcher } from "@/components/business/workspace-switcher";
import type { BusinessWorkspace } from "@/lib/api/business";

export function BusinessWorkspaceHeader({
  title,
  workspaceId,
  workspaces,
}: {
  title: string;
  workspaceId: string;
  workspaces: BusinessWorkspace[];
}) {
  return (
    <header className="relative overflow-hidden rounded-m-hero border bg-[color:var(--b-surf)] p-[18px] shadow-[0_20px_60px_-40px_rgba(212,136,10,0.25)]" style={{ borderColor: "color-mix(in srgb, var(--b-acc) 20%, transparent)" }}>
      <div
        className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(212,136,10,0.18),transparent_70%)] blur-2xl"
        aria-hidden
      />
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35">Momentra Business</p>
        <h1 className="mt-m-2 text-[clamp(1.5rem,3vw,1.85rem)] font-semibold leading-tight text-ink">{title}</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">
          Controlled spend, approval-first routing, unit-aware signals — your operational control room, not another
          ledger.
        </p>
        <div className="mt-m-4">
          <WorkspaceSwitcher workspaces={workspaces} currentWorkspaceId={workspaceId} />
        </div>
      </div>
    </header>
  );
}
