"use client";

import type { GroupCycle } from "@/lib/api/group";
import { useMemo, useState } from "react";

function num(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function CycleTabs({
  cycles,
  activeCycleId,
  onSelect,
  embedded = false,
}: {
  cycles: GroupCycle[];
  activeCycleId: string | null;
  onSelect?: (cycle: GroupCycle) => void;
  /** When true, sits inside a parent card — no outer border on the tab strip. */
  embedded?: boolean;
}) {
  const sorted = useMemo(
    () => [...cycles].sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [cycles],
  );
  const [selected, setSelected] = useState<string | null>(() => activeCycleId ?? sorted[0]?.cycle_id ?? null);

  const current = sorted.find((c) => c.cycle_id === selected) ?? sorted[0];

  const stripCls = embedded
    ? "flex gap-1 overflow-x-auto rounded-m-badge bg-bg2/50 p-1"
    : "flex gap-1 overflow-x-auto rounded-m-chip border border-surface-300 bg-ctx-tab-bg/60 p-1";

  return (
    <div>
      <div className={stripCls} role="tablist">
        {sorted.map((c) => {
          const sel = c.cycle_id === (selected ?? current?.cycle_id);
          return (
            <button
              key={c.cycle_id}
              type="button"
              role="tab"
              aria-selected={sel}
              className={`shrink-0 rounded-m-badge px-m-3 py-2 text-[11px] font-semibold transition-colors ${
                sel
                  ? "bg-ctx-accent text-ctx-hero shadow-sm"
                  : "text-ctx-text/70 hover:bg-surface-200/40 hover:text-ctx-text"
              }`}
              onClick={() => {
                setSelected(c.cycle_id);
                onSelect?.(c);
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      {current ? (
        <dl className="mt-m-4 space-y-m-3 text-[13px] leading-snug">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ctx-text/65">Period</dt>
            <dd className="text-right font-medium text-ctx-text tabular-nums">
              {current.start_date} → {current.end_date}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ctx-text/65">Target</dt>
            <dd className="text-right font-semibold text-ctx-text tabular-nums">{money(num(current.target_amount))}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ctx-text/65">Collected</dt>
            <dd className="text-right font-semibold text-ctx-accent tabular-nums">{money(num(current.collected_amount))}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-1">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ctx-text/65">Status</dt>
            <dd
              className={
                current.status === "active"
                  ? "text-right capitalize font-semibold text-urgency-clear-value"
                  : "text-right capitalize font-medium text-ctx-text/90"
              }
            >
              {current.status}
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
