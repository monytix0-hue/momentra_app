"use client";

import { useMemo } from "react";
import type { BusinessDashboard, BusinessSignal, BusinessSpend } from "@/lib/api/business";
import { bizMoney, bizNum } from "@/lib/business/format";

export type SignalBarTone = "ok" | "warning" | "urgent";

export type BusinessSignalBarItem = {
  id: string;
  tone: SignalBarTone;
  title: string;
  detail?: string;
  /** Section DOM id to scroll to */
  scrollTargetId?: string;
};

function severityToTone(s: string): SignalBarTone {
  const x = s.toLowerCase();
  if (x === "critical") return "urgent";
  if (x === "warning") return "warning";
  return "ok";
}

function buildItems(params: {
  pending: BusinessSpend[];
  signals: BusinessSignal[];
  unitBreakdown: BusinessDashboard["unit_breakdown"];
  currency: string;
}): BusinessSignalBarItem[] {
  const { pending, signals, unitBreakdown, currency } = params;
  const items: BusinessSignalBarItem[] = [];

  const pendingTotal = pending.reduce((acc, p) => acc + bizNum(p.amount), 0);
  if (pending.length > 0) {
    items.push({
      id: "pending-approvals",
      tone: pending.length >= 3 || pendingTotal > 50_000 ? "urgent" : "warning",
      title:
        pending.length === 1
          ? "1 spend waiting approval"
          : `${pending.length} spends waiting approval`,
      detail: bizMoney(pendingTotal, currency),
      scrollTargetId: "business-section-approvals",
    });
  }

  for (const s of signals) {
    if (s.resolved) continue;
    items.push({
      id: `signal-${s.signal_id}`,
      tone: severityToTone(String(s.severity || "info")),
      title: s.message,
      scrollTargetId:
        s.unit_id && unitBreakdown.some((u) => u.key === s.unit_id)
          ? "business-section-units"
          : "business-section-insights",
    });
  }

  for (const row of unitBreakdown) {
    const r = row.utilization_ratio;
    if (r == null || r < 0.85) continue;
    const lim = row.budget_limit != null ? bizNum(row.budget_limit) : 0;
    const spent = bizNum(row.amount);
    if (r >= 1) {
      items.push({
        id: `unit-over-${row.key}`,
        tone: "urgent",
        title: `${row.label} is over its unit budget`,
        detail: lim ? `${bizMoney(spent, currency)} / ${bizMoney(lim, currency)}` : undefined,
        scrollTargetId: "business-section-units",
      });
    } else {
      items.push({
        id: `unit-near-${row.key}`,
        tone: "warning",
        title: `${row.label} is nearing its limit`,
        detail: lim ? `${bizMoney(spent, currency)} / ${bizMoney(lim, currency)}` : undefined,
        scrollTargetId: "business-section-units",
      });
    }
  }

  if (!items.length) {
    items.push({
      id: "all-clear",
      tone: "ok",
      title: "Everything under control",
      detail: "No urgent signals",
    });
  }

  items.sort((a, b) => {
    const rank = (t: SignalBarTone) => (t === "urgent" ? 0 : t === "warning" ? 1 : 2);
    return rank(a.tone) - rank(b.tone);
  });

  return items.slice(0, 6);
}

const toneStyles: Record<
  SignalBarTone,
  { bar: string; dot: string }
> = {
  ok: {
    bar: "border-urgency-clear-value/35 bg-urgency-clear-value/[0.07] shadow-[inset_0_1px_0_0_rgba(16,185,129,0.12)]",
    dot: "bg-urgency-clear-value",
  },
  warning: {
    bar: "border-[color-mix(in_srgb,var(--u-med)_45%,transparent)] bg-[color-mix(in_srgb,var(--u-med)_12%,transparent)] shadow-[inset_0_1px_0_0_rgba(245,158,11,0.15)]",
    dot: "bg-[var(--u-med)]",
  },
  urgent: {
    bar: "border-urgency-high/40 bg-urgency-high/[0.12] shadow-[inset_0_1px_0_0_rgba(226,75,74,0.18)]",
    dot: "bg-urgency-high",
  },
};

export function BusinessSignalBar({
  pendingApprovals,
  signals,
  unitBreakdown,
  currency,
  onNavigate,
}: {
  pendingApprovals: BusinessSpend[];
  signals: BusinessSignal[];
  unitBreakdown: BusinessDashboard["unit_breakdown"];
  currency: string;
  onNavigate?: (targetId: string) => void;
}) {
  const items = useMemo(
    () =>
      buildItems({
        pending: pendingApprovals,
        signals,
        unitBreakdown,
        currency,
      }),
    [pendingApprovals, signals, unitBreakdown, currency],
  );

  return (
    <div className="overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-0 gap-2 md:flex-wrap md:gap-m-2">
        {items.map((item, i) => {
          const st = toneStyles[item.tone];
          const interactive = Boolean(item.scrollTargetId && onNavigate);
          return (
            <button
              key={item.id}
              type="button"
              disabled={!interactive}
              onClick={() => item.scrollTargetId && onNavigate?.(item.scrollTargetId)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={[
                "group relative flex min-w-[200px] flex-1 flex-col items-start rounded-m-chip border px-m-3 py-m-2.5 text-left transition-all duration-300 md:min-w-[220px] md:flex-initial",
                st.bar,
                interactive
                  ? "cursor-pointer hover:-translate-y-px hover:border-ctx-accent/35 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)] active:translate-y-0"
                  : "cursor-default",
              ].join(" ")}
            >
              <span className="flex w-full items-start gap-2">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${st.dot} ring-2 ring-white/10 ${item.tone === "ok" ? "animate-pulse" : ""}`}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-snug text-ink">{item.title}</span>
                  {item.detail ? (
                    <span className="mt-0.5 block text-[12px] font-medium text-ctx-accent">{item.detail}</span>
                  ) : null}
                </span>
              </span>
              {interactive ? (
                <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4 opacity-0 transition-opacity group-hover:opacity-100">
                  Go to section →
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
