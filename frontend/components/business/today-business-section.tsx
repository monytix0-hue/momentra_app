"use client";

import { useMemo } from "react";
import type { BusinessDashboard, BusinessSpend } from "@/lib/api/business";
import { bizMoney, bizNum } from "@/lib/business/format";

type Tone = "ok" | "warning" | "urgent";

function toneCls(t: Tone): string {
  if (t === "urgent") return "border-urgency-high/45 bg-urgency-high/[0.1]";
  if (t === "warning") return "border-[color-mix(in_srgb,var(--u-med)_45%,transparent)] bg-[color-mix(in_srgb,var(--u-med)_12%,transparent)]";
  return "border-urgency-clear-value/35 bg-urgency-clear-value/[0.08]";
}

export function TodayBusinessSection({
  dashboard,
  spends,
  currency,
  onNavigate,
}: {
  dashboard: BusinessDashboard;
  spends: BusinessSpend[];
  currency: string;
  onNavigate: (sectionId: string) => void;
}) {
  const cards = useMemo(() => {
    const out: Array<{ id: string; tone: Tone; title: string; detail: string; cta: string; target: string }> = [];

    const pending = dashboard.pending_approvals;
    const pendingAmount = pending.reduce((acc, p) => acc + bizNum(p.amount), 0);
    if (pending.length) {
      out.push({
        id: "today-pending",
        tone: pending.length >= 3 ? "urgent" : "warning",
        title: `${pending.length} approval${pending.length > 1 ? "s" : ""} waiting`,
        detail: bizMoney(pendingAmount, currency),
        cta: "Open approvals",
        target: "business-section-approvals",
      });
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const today = spends.filter((s) => s.submitted_at && new Date(s.submitted_at) >= dayStart);
    const todayAmt = today.reduce((acc, s) => acc + bizNum(s.amount), 0);
    if (today.length) {
      out.push({
        id: "today-spend",
        tone: todayAmt > 25000 ? "warning" : "ok",
        title: `${bizMoney(todayAmt, currency)} spent today`,
        detail: `${today.length} request${today.length > 1 ? "s" : ""} submitted`,
        cta: "View spend feed",
        target: "business-section-register",
      });
    }

    const risky = [...dashboard.unit_breakdown]
      .filter((u) => (u.utilization_ratio ?? 0) >= 0.65)
      .sort((a, b) => (b.utilization_ratio ?? 0) - (a.utilization_ratio ?? 0))[0];
    if (risky) {
      const pct = Math.round((risky.utilization_ratio ?? 0) * 100);
      out.push({
        id: "today-unit",
        tone: pct >= 90 ? "urgent" : "warning",
        title: `${risky.label} used ${pct}% of its budget`,
        detail: "Monitor pace and approvals",
        cta: "View units",
        target: "business-section-units",
      });
    }

    if (!out.length) {
      out.push({
        id: "today-calm",
        tone: "ok",
        title: "No urgent risks - control is stable",
        detail: "Great time to review growth spend",
        cta: "Open smart action",
        target: "business-section-submit",
      });
    }

    const rank = (t: Tone) => (t === "urgent" ? 0 : t === "warning" ? 1 : 2);
    return out.sort((a, b) => rank(a.tone) - rank(b.tone)).slice(0, 3);
  }, [dashboard, spends, currency]);

  return (
    <section className="space-y-m-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/35">Today in your business</p>
        <p className="mt-1 text-[13px] text-ink-3">Daily pulse - what needs attention now.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <article key={c.id} className={`rounded-m-card border p-[18px] transition-all hover:-translate-y-px hover:border-ctx-accent/40 ${toneCls(c.tone)}`} style={{ background: "var(--b-surf)" }}>
            <p className="text-[14px] font-semibold text-ink">{c.title}</p>
            <p className="mt-1 text-[12px] text-ink-3">{c.detail}</p>
            <button
              type="button"
              onClick={() => onNavigate(c.target)}
              className="mt-m-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent hover:underline"
            >
              {c.cta}{" ->"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
