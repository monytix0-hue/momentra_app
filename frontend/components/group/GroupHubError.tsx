"use client";

import { groupBtnSecondary, groupPanelElevated } from "@/lib/group/group-ui";

export function GroupHubError({
  message,
  onRetry,
  title = "We couldn’t refresh your groups",
}: {
  message: string;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <div className={`${groupPanelElevated} mx-auto max-w-lg px-m-8 py-m-9 text-center`} role="alert">
      <div
        className="mx-auto mb-m-3 flex h-11 w-11 items-center justify-center rounded-full border border-urgency-medium/25 bg-urgency-medium/[0.07]"
        aria-hidden
      >
        <span className="text-base text-urgency-medium">!</span>
      </div>
      <p className="text-[16px] font-semibold text-ink">{title}</p>
      <p className="mt-m-2 text-[14px] leading-relaxed text-ink-3">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className={`${groupBtnSecondary} mx-auto mt-m-6 w-full max-w-[240px] sm:w-auto`}
      >
        Try again
      </button>
    </div>
  );
}
