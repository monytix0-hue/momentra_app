"use client";

import Link from "next/link";
import { groupBtnPrimary, groupEyebrow, groupHeroSurface } from "@/lib/group/group-ui";

export function GroupHubHeader() {
  return (
    <header className={`${groupHeroSurface} p-m-6 md:p-m-8`}>
      <div
        className="pointer-events-none absolute -right-20 -top-28 h-60 w-60 rounded-full opacity-[0.14]"
        style={{ background: "radial-gradient(circle, var(--ctx-accent), transparent 70%)" }}
      />
      <div className="relative flex flex-col gap-m-6 lg:flex-row lg:items-end lg:justify-between lg:gap-m-8">
        <div className="min-w-0 max-w-2xl">
          <p className={groupEyebrow}>Groups</p>
          <h1 className="mt-m-3 text-[1.65rem] font-bold leading-[1.15] tracking-tight text-ink md:text-[2rem]">
            Shared money, calmly coordinated
          </h1>
          <p className="mt-m-3 max-w-xl text-[15px] leading-relaxed text-ink-3 md:mt-m-4">
            Pooled goals, split bills, and gentle check-ins — without awkward chasing.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-m-2 sm:flex-row sm:items-center">
          <Link href="/group/new" className={`${groupBtnPrimary} w-full justify-center sm:w-auto`}>
            New group
          </Link>
        </div>
      </div>
    </header>
  );
}
