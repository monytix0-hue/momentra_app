"use client";

import Link from "next/link";
import type { BusinessWorkspace } from "@/lib/api/business";

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
}: {
  workspaces: BusinessWorkspace[];
  currentWorkspaceId?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {workspaces.map((w) => {
        const active = currentWorkspaceId === w.workspace_id;
        return (
          <Link
            key={w.workspace_id}
            href={`/business/${w.workspace_id}`}
            className={`inline-flex min-h-[36px] items-center rounded-m-chip border px-m-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
              active
                ? "border-ctx-accent bg-ctx-accent text-ctx-hero"
                : "border-surface-300 bg-bg2 text-ink hover:border-ctx-border/50 hover:bg-surface-200"
            }`}
          >
            {w.title}
          </Link>
        );
      })}
    </div>
  );
}

