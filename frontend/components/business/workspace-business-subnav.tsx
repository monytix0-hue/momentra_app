"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = (workspaceId: string) =>
  [
    { href: `/workspaces/${workspaceId}/business`, label: "Today" },
    { href: `/workspaces/${workspaceId}/business/payables`, label: "To pay" },
    { href: `/workspaces/${workspaceId}/business/receivables`, label: "To collect" },
    { href: `/workspaces/${workspaceId}/business/transactions`, label: "Transactions" },
    { href: `/workspaces/${workspaceId}/business/inventory`, label: "Stock" },
  ] as const;

export function WorkspaceBusinessSubnav({ workspaceId }: { workspaceId: string }) {
  const pathname = usePathname();
  return (
    <nav
      className="scrollbar-none -mx-m-4 flex gap-2 overflow-x-auto px-m-4 pb-m-3 lg:mx-0 lg:px-0"
      aria-label="Business sections"
    >
      {links(workspaceId).map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 rounded-m-chip px-m-3 py-2 text-[13px] font-medium transition-colors ${
              active
                ? "bg-ctx-accent text-ctx-hero shadow-sm"
                : "border border-surface-300 bg-bg2 text-ink-2 hover:border-ctx-accent/40 hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
