"use client";

import { useMemo, useState } from "react";
import type { GroupCommitment, GroupCycle, GroupMomentDetail } from "@/lib/api/group";
import {
  type CoordHealth,
  daysLeftInCycle,
  healthBadgeClass,
  healthLabel,
  pendingInActiveCycle,
} from "@/lib/group/group-detail-coordination";

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

function healthForCycleView(pendingOpen: number, overdueInCycle: number, pct: number | null): CoordHealth {
  if (overdueInCycle > 0 || pendingOpen >= 3) return "NEEDS_ATTENTION";
  if (overdueInCycle === 0 && pendingOpen === 0 && (pct == null || pct >= 85)) return "ON_TRACK";
  return "SLIGHTLY_BEHIND";
}

export function GroupCycleCoordinationBlock({
  detail,
  scopedCommitments,
  isAdmin,
  generateBusy,
  onGenerateNext,
}: {
  detail: GroupMomentDetail;
  scopedCommitments: GroupCommitment[];
  isAdmin: boolean;
  generateBusy: boolean;
  onGenerateNext: () => void | Promise<void>;
}) {
  const sorted = useMemo(
    () => [...detail.cycles].sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [detail.cycles],
  );
  const tabKey = `${detail.group_id}|${detail.active_cycle?.cycle_id ?? ""}|${sorted.map((c) => c.cycle_id).join(",")}`;
  return (
    <GroupCycleCoordinationBlockInner
      key={tabKey}
      detail={detail}
      scopedCommitments={scopedCommitments}
      isAdmin={isAdmin}
      generateBusy={generateBusy}
      onGenerateNext={onGenerateNext}
      sorted={sorted}
    />
  );
}

function GroupCycleCoordinationBlockInner({
  detail,
  scopedCommitments,
  isAdmin,
  generateBusy,
  onGenerateNext,
  sorted,
}: {
  detail: GroupMomentDetail;
  scopedCommitments: GroupCommitment[];
  isAdmin: boolean;
  generateBusy: boolean;
  onGenerateNext: () => void | Promise<void>;
  sorted: GroupCycle[];
}) {
  const defaultId = detail.active_cycle?.cycle_id ?? sorted[0]?.cycle_id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);

  const current: GroupCycle | null = sorted.find((c) => c.cycle_id === selectedId) ?? sorted[0] ?? null;
  if (!current) return null;

  const coms = scopedCommitments.filter((c) => !c.cycle_id || c.cycle_id === current.cycle_id);
  const pending = pendingInActiveCycle(detail, coms);
  const overdueInCycle = coms.filter((c) => (c.status || "").toLowerCase() === "overdue").length;
  const target = num(current.target_amount);
  const collected = num(current.collected_amount);
  const pct = target > 0 ? Math.min(100, Math.round((collected / target) * 1000) / 10) : null;
  const days = daysLeftInCycle(current.end_date);
  const health = healthForCycleView(pending, overdueInCycle, pct);

  const showGenerate =
    isAdmin && detail.duration_type === "ongoing" && String(current.cycle_id) === String(detail.active_cycle?.cycle_id);

  return (
    <div className="rounded-m-hero border border-surface-300 bg-surface-100/90 p-m-5 md:p-m-6">
      <div className="flex flex-wrap items-start justify-between gap-m-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ctx-accent">Cycle</p>
          <p className="mt-1 text-[18px] font-semibold text-ctx-text">Recurring rhythm</p>
        </div>
        <span className={`rounded-m-chip border px-m-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider ${healthBadgeClass(health)}`}>
          {healthLabel(health)}
        </span>
      </div>

      <div className="mt-m-4 flex gap-1 overflow-x-auto rounded-m-badge bg-bg2/70 p-1" role="tablist">
        {sorted.map((c) => {
          const sel = c.cycle_id === current.cycle_id;
          return (
            <button
              key={c.cycle_id}
              type="button"
              role="tab"
              aria-selected={sel}
              className={`shrink-0 rounded-m-badge px-m-3 py-2 text-[11px] font-semibold transition-colors ${
                sel ? "bg-ctx-accent text-ctx-hero shadow-sm" : "text-ctx-text/70 hover:bg-surface-200/50"
              }`}
              onClick={() => setSelectedId(c.cycle_id)}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="mt-m-5 space-y-m-4">
        <div className="flex flex-wrap justify-between gap-2 text-[13px]">
          <span className="text-ink-3">Period</span>
          <span className="font-medium tabular-nums text-ink">
            {current.start_date} → {current.end_date}
          </span>
        </div>
        {days != null ? (
          <p className="text-[13px] text-ink-2">
            {days < 0 ? (
              <span className="text-status-overdue-fg">Cycle end date passed — roll or close when ready.</span>
            ) : (
              <>
                <span className="font-semibold text-ctx-text">{days}</span> day{days === 1 ? "" : "s"} left in this
                cycle
              </>
            )}
          </p>
        ) : null}

        <div className="grid gap-m-3 sm:grid-cols-2">
          <div className="rounded-m-chip border border-surface-300 bg-bg2/50 px-m-4 py-m-3">
            <p className="text-[10px] uppercase tracking-wider text-ink-3">Target</p>
            <p className="mt-1 text-[16px] font-semibold tabular-nums text-ctx-text">{money(target)}</p>
          </div>
          <div className="rounded-m-chip border border-surface-300 bg-bg2/50 px-m-4 py-m-3">
            <p className="text-[10px] uppercase tracking-wider text-ink-3">Collected</p>
            <p className="mt-1 text-[16px] font-semibold tabular-nums text-ctx-accent">{money(collected)}</p>
          </div>
        </div>

        {pct != null ? (
          <div>
            <div className="mb-1.5 flex justify-between text-[11px] text-ink-3">
              <span>Funding progress</span>
              <span className="tabular-nums font-medium text-ink">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-ctx-accent/90 to-ctx-accent-end/80 transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-m-2 rounded-m-chip border border-surface-300/80 bg-bg2/40 px-m-3 py-m-2">
          <span className="text-[12px] text-ink-3">Open commitments in this cycle</span>
          <span className="text-[14px] font-semibold tabular-nums text-status-pending-fg">{pending}</span>
        </div>

        <div className="flex flex-wrap gap-m-2 pt-m-1">
          {sorted.length > 1 ? (
            <p className="w-full text-[11px] text-ink-4">Switch tabs above to review a previous period.</p>
          ) : null}
          {showGenerate ? (
            <button
              type="button"
              disabled={generateBusy}
              className="inline-flex min-h-[40px] items-center justify-center rounded-m-cta border border-ctx-accent/50 bg-gradient-to-br from-ctx-accent/18 to-transparent px-m-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-ctx-accent transition-opacity hover:opacity-90 disabled:opacity-50"
              onClick={() => void onGenerateNext()}
            >
              {generateBusy ? "Working…" : "Generate next cycle"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
