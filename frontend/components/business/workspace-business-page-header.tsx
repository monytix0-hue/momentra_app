"use client";

import Link from "next/link";
import { WorkspaceSwitcher } from "@/components/business/workspace-switcher";
import type { BusinessWorkspace } from "@/lib/api/business";

export function WorkspaceBusinessPageHeader({
  workspaceId,
  workspaceTitle,
  workspaces,
  subtitle,
  onQuickAdd,
}: {
  workspaceId: string;
  workspaceTitle: string;
  workspaces: BusinessWorkspace[];
  subtitle: string;
  onQuickAdd: () => void;
}) {
  return (
    <header className="relative overflow-hidden rounded-m-hero border border-surface-300/80 bg-surface-100 p-m-4 shadow-[0_16px_48px_-32px_rgba(15,23,42,0.18)]">
      <div
        className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_70%)] blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-m-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Workspace · {workspaceTitle}</p>
          <h1 className="mt-1 text-[clamp(1.35rem,4vw,1.75rem)] font-semibold leading-tight text-ink">Business</h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-2">{subtitle}</p>
          <div className="mt-m-3">
            <WorkspaceSwitcher workspaces={workspaces} currentWorkspaceId={workspaceId} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onQuickAdd}
            className="inline-flex min-h-[44px] items-center justify-center rounded-m-cta bg-ctx-accent px-m-4 text-[14px] font-semibold text-ctx-hero shadow-sm transition hover:opacity-95"
          >
            Add expense
          </button>
          <Link
            href={`/workspaces/${workspaceId}/business/transactions`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-m-chip border border-surface-300 bg-bg2 px-m-4 text-[14px] font-medium text-ink hover:border-ctx-accent/40"
          >
            All activity
          </Link>
        </div>
      </div>
    </header>
  );
}
