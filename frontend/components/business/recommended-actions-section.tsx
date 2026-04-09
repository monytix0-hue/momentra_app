"use client";

import { useMemo } from "react";
import type { BusinessDashboard, BusinessMember, BusinessUnit, BusinessVendor } from "@/lib/api/business";

export function RecommendedActionsSection({
  dashboard,
  units,
  vendors,
  members,
  onNavigate,
}: {
  dashboard: BusinessDashboard;
  units: BusinessUnit[];
  vendors: BusinessVendor[];
  members: BusinessMember[];
  onNavigate: (sectionId: string) => void;
}) {
  const actions = useMemo(() => {
    const out: Array<{ id: string; priority: "high" | "med" | "low"; title: string; detail: string; cta: string; target: string }> = [];

    if (dashboard.pending_approvals.length) {
      const p = dashboard.pending_approvals[0];
      out.push({
        id: "act-approve",
        priority: "high",
        title: `Approve ${p.title} to unblock operations`,
        detail: "Decision-first: pending requests delay team execution.",
        cta: "Review approvals",
        target: "business-section-approvals",
      });
    }

    if (units.some((u) => u.budget_limit == null || Number(u.budget_limit) <= 0)) {
      out.push({
        id: "act-unit-budget",
        priority: "med",
        title: "Set missing unit budgets to activate controls",
        detail: "Units without budget caps weaken signal quality.",
        cta: "Open unit intelligence",
        target: "business-section-units",
      });
    }

    if (!vendors.length) {
      out.push({
        id: "act-vendor",
        priority: "med",
        title: "Add your first vendor for faster purchase flow",
        detail: "Vendor mapping makes approvals clearer and repeatable.",
        cta: "Add vendor",
        target: "business-section-setup",
      });
    }

    if (!members.some((m) => m.role === "manager" || m.role === "approver")) {
      out.push({
        id: "act-roles",
        priority: "low",
        title: "Assign a manager or approver to tighten routing",
        detail: "Role coverage helps approvals move without admin bottlenecks.",
        cta: "Open team console",
        target: "business-section-team",
      });
    }

    const overCc = dashboard.cost_center_breakdown.find((c) => (c.utilization_ratio ?? 0) >= 0.9);
    if (overCc) {
      out.push({
        id: "act-cc",
        priority: "high",
        title: `Review spike in ${overCc.label} spend`,
        detail: "Cost-center pressure can silently overrun workspace plans.",
        cta: "Open cost centers",
        target: "business-section-cost-centers",
      });
    }

    return out.slice(0, 5);
  }, [dashboard, units, vendors, members]);

  if (!actions.length) return null;

  const pCls = (p: "high" | "med" | "low") => p === "high" ? "border-urgency-high/40" : p === "med" ? "border-[color-mix(in_srgb,var(--u-med)_45%,transparent)]" : "border-surface-300/70";

  return (
    <section className="space-y-m-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ctx-accent">Recommended actions</p>
        <p className="mt-1 text-[13px] text-ink-3">Small moves with high operational leverage.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {actions.map((a) => (
          <article key={a.id} className={`rounded-m-card border bg-surface-100/90 p-m-4 ${pCls(a.priority)}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-4">{a.priority} priority</p>
            <h3 className="mt-1 text-[14px] font-semibold text-ink">{a.title}</h3>
            <p className="mt-1 text-[12px] text-ink-3">{a.detail}</p>
            <button type="button" onClick={() => onNavigate(a.target)} className="mt-m-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent hover:underline">
              {a.cta}{" ->"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
