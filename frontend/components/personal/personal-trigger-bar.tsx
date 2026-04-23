"use client";

import type { TriggerBarResult } from "@/lib/personal/personal-dashboard-insights";

const toneBorder: Record<TriggerBarResult["severity"], string> = {
  calm: "border-ctx-border/50 bg-ctx-hero/60",
  info: "border-ctx-accent/35 bg-ctx-hero/70",
  warn: "border-urgency-high/40 bg-[#1a1008]/80",
};

export function PersonalTriggerBar({
  trigger,
  onCta,
}: {
  trigger: TriggerBarResult;
  onCta?: () => void;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-m-hero border px-m-5 py-m-4 shadow-[inset_0_1px_0_0_rgba(201,168,76,0.06)] ${toneBorder[trigger.severity]}`}
      role="status"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
        style={{
          background: "linear-gradient(90deg, transparent, var(--ctx-accent), transparent)",
        }}
      />
      <div className="flex flex-col gap-m-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/35">
            Today’s signal
          </p>
          <p className="mt-1.5 text-[15px] font-medium leading-snug tracking-[-0.2px] text-ink/65">
            {trigger.message}
          </p>
        </div>
        {trigger.cta && onCta ? (
          <button
            type="button"
            onClick={onCta}
            className="shrink-0 rounded-m-chip border border-surface-300 bg-bg2/90 px-m-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink/65 transition-colors hover:border-ink-4 hover:text-ink"
          >
            {trigger.cta}
          </button>
        ) : null}
      </div>
    </div>
  );
}
