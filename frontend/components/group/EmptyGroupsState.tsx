"use client";

import Link from "next/link";
import { groupBtnPrimary, groupBtnSecondary, groupHeroSurface } from "@/lib/group/group-ui";

export function EmptyGroupsState() {
  return (
    <div
      className={`${groupHeroSurface} mx-auto max-w-lg px-m-7 py-m-9 text-center md:px-m-9 md:py-m-10`}
    >
      <div
        className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full opacity-[0.1]"
        style={{ background: "radial-gradient(circle, var(--ctx-accent), transparent 70%)" }}
        aria-hidden
      />
      <div className="relative">
        <div
          className="mx-auto mb-m-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-ctx-accent/20 bg-ctx-accent/[0.07] text-2xl text-ctx-accent"
          aria-hidden
        >
          ◇
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">Start when you’re ready</h2>
        <p className="mx-auto mt-m-3 max-w-sm text-[15px] leading-relaxed text-ink-3">
          Trips, roommates, events — create a group or join with an invite so everyone sees the same picture.
        </p>
        <div className="mt-m-8 flex flex-col items-stretch gap-m-3 sm:flex-row sm:justify-center">
          <Link href="/group/new" className={`${groupBtnPrimary} w-full sm:w-auto`}>
            Create a group
          </Link>
          <Link href="/group/join" className={`${groupBtnSecondary} w-full sm:w-auto`}>
            I have an invite
          </Link>
        </div>
      </div>
    </div>
  );
}
