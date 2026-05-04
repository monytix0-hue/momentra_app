"use client";

import Link from "next/link";
import type { GroupInvitePreview } from "@/lib/api/group";
import { mapInvitePreviewForJoinUi } from "@/lib/group/api-adapters";
import { groupBtnAccentOutline, groupHeroSurface, groupPanelElevated } from "@/lib/group/group-ui";

const JOIN_POINTS = [
  "Contributions, expenses, and updates in one place.",
  "Only people with the link can join — not public.",
  "You control notifications from the app.",
] as const;

export function GroupJoinInviteCard({
  preview,
  children,
}: {
  preview: GroupInvitePreview;
  children: React.ReactNode;
}) {
  const v = mapInvitePreviewForJoinUi(preview);
  return (
    <div className={`${groupHeroSurface} mx-auto w-full max-w-md`}>
      <div className="pointer-events-none h-16 bg-gradient-to-br from-ctx-accent/18 to-transparent md:h-20" aria-hidden />
      <div className="px-m-6 pb-m-7 pt-m-1 md:px-m-8 md:pb-m-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ctx-accent">You’re invited</p>
        <h1 className="mt-m-2 text-[1.35rem] font-bold leading-snug tracking-tight text-ink md:text-[1.5rem]">
          {v.groupTitle}
        </h1>
        <p className="mt-m-3 text-[15px] leading-relaxed text-ink-3">
          Joining as <span className="font-semibold text-ink-2">{v.inviteeDisplayName}</span> — same view as everyone
          else.
        </p>
        <ul className="mt-m-5 space-y-m-2 text-[14px] leading-relaxed text-ink-3">
          {JOIN_POINTS.map((text) => (
            <li key={text} className="flex gap-2.5">
              <span className="mt-0.5 shrink-0 text-ctx-accent" aria-hidden>
                ✓
              </span>
              {text}
            </li>
          ))}
        </ul>
        <div className="mt-m-6">{children}</div>
        <Link
          href="/group"
          className="mt-m-6 inline-block text-[13px] font-medium text-ink-4 underline-offset-4 transition-colors duration-fast hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctx-accent"
        >
          Not now
        </Link>
      </div>
    </div>
  );
}

export function GroupJoinErrorCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className={`${groupPanelElevated} mx-auto max-w-md px-m-7 py-m-9 text-center md:px-m-8`}>
      <div
        className="mx-auto mb-m-4 flex h-14 w-14 items-center justify-center rounded-full border border-urgency-medium/25 bg-urgency-medium/[0.07] text-xl text-urgency-medium"
        aria-hidden
      >
        ○
      </div>
      <h1 className="text-lg font-semibold tracking-tight text-ink md:text-xl">{title}</h1>
      <p className="mt-m-2 text-[15px] leading-relaxed text-ink-3">{message}</p>
      <div className="mt-m-6 flex flex-col items-stretch gap-m-2 sm:flex-row sm:justify-center sm:gap-m-3">
        <Link href="/group" className={`${groupBtnAccentOutline} w-full justify-center px-m-6 sm:w-auto`}>
          Back to groups
        </Link>
        <Link
          href="/group/new"
          className="inline-flex min-h-[44px] items-center justify-center text-[13px] font-semibold text-ink-3 underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Create a group
        </Link>
      </div>
    </div>
  );
}
