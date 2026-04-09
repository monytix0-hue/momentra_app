"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

export function AppHeader() {
  const pathname = usePathname();
  const { user, loading, syncError, signOutUser } = useAuth();

  if (pathname === "/login") {
    return null;
  }

  const moduleTabBase =
    "shrink-0 rounded-m-chip px-m-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-[color,background-color,border-color] duration-fast ease-standard sm:text-[12px]";
  const moduleTabActive =
    "border border-ctx-border/50 bg-ctx-tab-bg text-ctx-accent shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_15%,transparent)]";
  const moduleTabIdle =
    "border border-transparent text-ink-3 hover:border-surface-300 hover:bg-surface-100 hover:text-ink-2";

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-m-4 px-m-4 lg:px-m-8">
        <div className="flex min-w-0 flex-1 items-center gap-m-3 sm:gap-m-6">
          <Link
            href="/"
            className="shrink-0 font-serif text-lg font-semibold tracking-tight text-ink transition-colors duration-fast ease-standard hover:text-ctx-accent"
          >
            Momentra
          </Link>
          <nav
            className="flex min-w-0 items-center gap-m-2 border-l border-rule pl-m-3 sm:pl-m-6"
            aria-label="Modules"
          >
            <Link
              href="/personal"
              className={`${moduleTabBase} ${pathname.startsWith("/personal") ? moduleTabActive : moduleTabIdle}`}
            >
              Personal
            </Link>
            <Link
              href="/group"
              className={`${moduleTabBase} ${pathname.startsWith("/group") ? moduleTabActive : moduleTabIdle}`}
            >
              Group
            </Link>
            <Link
              href="/business"
              className={`${moduleTabBase} ${pathname.startsWith("/business") ? moduleTabActive : moduleTabIdle}`}
            >
              Business
            </Link>
          </nav>
        </div>
        <nav className="flex shrink-0 items-center gap-m-3 text-[13px] sm:gap-m-4">
          {loading ? (
            <span className="text-ink-4">…</span>
          ) : user ? (
            <div className="flex items-center gap-m-3">
              {syncError ? (
                <span
                  className="hidden max-w-[200px] truncate text-[11px] text-urgency-high sm:inline"
                  title={syncError}
                >
                  Sync issue — check API
                </span>
              ) : null}
              <span className="max-w-[160px] truncate text-ink-3" title={user.email ?? undefined}>
                {user.email}
              </span>
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="rounded-m-chip border border-surface-300 px-m-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-2 transition-colors duration-fast ease-standard hover:border-ctx-border hover:text-ctx-accent"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-m-chip border border-ctx-border/70 bg-ctx-tab-bg px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ctx-accent transition-colors hover:bg-ctx-surface"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
