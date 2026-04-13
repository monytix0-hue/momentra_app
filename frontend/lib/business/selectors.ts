import type {
  BusinessActivity,
  BusinessControlSummary,
  BusinessDashboard,
  BusinessInsights,
  BusinessRecommendation,
  BusinessSpend,
  BusinessToday,
  BusinessVendor,
  BusinessWorkspace,
} from "@/lib/api/business";
import { bizMoney, bizNum } from "@/lib/business/format";
import type {
  BusinessHealthTone,
  DailySummaryModel,
  InventorySnapshotModel,
  NextStepModel,
  OutlookDayModel,
  RelationshipDueModel,
  TodayHeroModel,
  TransactionRowModel,
  WorkspaceBusinessDashboardModel,
} from "@/lib/business/types";

function controlToHealth(label: string): { tone: BusinessHealthTone; friendly: string } {
  const l = label.toLowerCase();
  if (l.includes("risk") || l.includes("at risk")) return { tone: "risk", friendly: "At risk" };
  if (l.includes("watch") || l.includes("unstable")) return { tone: "watch", friendly: "Watch closely" };
  return { tone: "safe", friendly: "Safe" };
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function buildTodayHero(
  control: BusinessControlSummary,
  today: BusinessToday,
  currency: string,
): TodayHeroModel {
  const remaining = bizNum(control.remaining_budget);
  const pending = bizNum(control.pending_spend);
  const spendToday = bizNum(today.spend_today_amount);
  const { tone, friendly } = controlToHealth(control.control_label);

  let statusLine = today.daily_status_label;
  if (pending > spendToday && pending > 0) {
    statusLine = "Outgoing in the queue needs a decision";
  } else if (spendToday > 0 && pending === 0) {
    statusLine = "You are safe today — spend is recorded";
  } else if (tone === "risk") {
    statusLine = "Tight on headroom — slow new spends if you can";
  } else if (tone === "watch") {
    statusLine = "You may need attention soon";
  }

  return {
    cashInHandLabel: bizMoney(remaining, currency),
    cashInHandSub: "Plan headroom (after approved spends)",
    incomingLabel: "—",
    incomingSub: "Sales tracking connects here next",
    outgoingLabel: bizMoney(pending + spendToday, currency),
    outgoingSub: "Today’s requests + waiting for approval",
    statusLine,
    health: tone,
    healthLabel: friendly,
  };
}

export function pickNextStep(recs: BusinessRecommendation[]): NextStepModel | null {
  const r = recs[0];
  if (!r) return null;
  let onPress: NextStepModel["onPress"] = "none";
  if (r.action_type === "OPEN_SPEND" || r.recommendation_type === "APPROVE_PENDING_SPEND") {
    onPress = "scroll_payables";
  }
  return {
    title: `Next step: ${r.title}`,
    reason: r.message,
    ctaLabel: r.recommendation_type.includes("UNIT") ? "Open setup" : "Review",
    onPress,
  };
}

export function buildDailySummary(
  dashboard: BusinessDashboard,
  today: BusinessToday,
  currency: string,
): DailySummaryModel {
  const approvedToday = dashboard.approved_spends.filter((s) => isSameLocalDay(s.approved_at));
  const approvedSum = approvedToday.reduce((a, s) => a + bizNum(s.amount), 0);
  const expenseApprox = bizNum(today.spend_today_amount);
  const net = approvedSum - expenseApprox;
  return {
    salesApproxLabel: bizMoney(approvedSum, currency),
    expensesLabel: bizMoney(expenseApprox, currency),
    netLabel: bizMoney(net, currency),
    netPositive: net >= 0,
  };
}

function isSameLocalDay(iso: string | null | undefined): boolean {
  if (!iso) return false;
  try {
    const d = new Date(iso);
    const n = new Date();
    return (
      d.getFullYear() === n.getFullYear() &&
      d.getMonth() === n.getMonth() &&
      d.getDate() === n.getDate()
    );
  } catch {
    return false;
  }
}

export function buildPayables(
  pending: BusinessSpend[],
  vendors: BusinessVendor[],
): RelationshipDueModel[] {
  const vmap = new Map(vendors.map((v) => [v.vendor_id, v.name]));
  return pending.slice(0, 12).map((s) => ({
    id: s.spend_id,
    name: vmap.get(s.vendor_id ?? "") ?? s.title,
    amount: bizNum(s.amount),
    urgency: "soon",
    dueLine: "Waiting for approval",
    kind: "payable" as const,
  }));
}

/** Receivables: no ledger API yet — return empty list from caller. */
export function buildReceivablesPlaceholder(): RelationshipDueModel[] {
  return [];
}

export function buildRecentTransactions(
  spends: BusinessSpend[],
  activity: BusinessActivity[],
  vendors: BusinessVendor[],
): TransactionRowModel[] {
  const vmap = new Map(vendors.map((v) => [v.vendor_id, v.name]));
  const spendRows: TransactionRowModel[] = spends.slice(0, 15).map((s) => {
    const vendorName = s.vendor_id ? vmap.get(s.vendor_id) : null;
    const type: TransactionRowModel["type"] =
      s.status === "pending" ? "expense" : s.status === "approved" ? "payment" : "other";
    return {
      id: `spend-${s.spend_id}`,
      type,
      title: s.title,
      amount: bizNum(s.amount),
      when: s.submitted_at ?? s.approved_at ?? s.created_at ?? "",
      meta: vendorName ? `${vendorName}` : s.spend_type,
    };
  });
  const actRows: TransactionRowModel[] = activity.slice(0, 10).map((a) => ({
    id: `act-${a.activity_id}`,
    type: "other",
    title: a.message,
    amount: 0,
    when: a.created_at ?? "",
    meta: a.event_type,
  }));
  const merged = [...spendRows, ...actRows].sort((a, b) => {
    const ta = a.when ? new Date(a.when).getTime() : 0;
    const tb = b.when ? new Date(b.when).getTime() : 0;
    return tb - ta;
  });
  return merged.slice(0, 12);
}

export function buildOutlook(
  control: BusinessControlSummary,
  today: BusinessToday,
  insights: BusinessInsights,
  currency: string,
): OutlookDayModel[] {
  const remaining = bizNum(control.remaining_budget);
  const pending = bizNum(control.pending_spend);
  const spendToday = bizNum(today.spend_today_amount);
  const gap = remaining - pending;
  const now = new Date();
  const days: OutlookDayModel[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const outgoing = i === 0 ? bizMoney(spendToday + pending, currency) : "—";
    const chip = insights.chips[i] ?? (i === 1 ? insights.trend_weekly_label : "");
    days.push({
      label: i === 0 ? `Today · ${formatDateShort(d)}` : formatDateShort(d),
      incoming: "—",
      outgoing,
      gapLine:
        i === 0
          ? gap >= 0
            ? `Cushion about ${bizMoney(gap, currency)}`
            : `Short by about ${bizMoney(-gap, currency)}`
          : chip || "Timing for scheduled pays will show here",
    });
  }
  return days;
}

export function buildInventorySnapshot(dashboard: BusinessDashboard): InventorySnapshotModel | null {
  const lines: string[] = [];
  let low = 0;
  for (const u of dashboard.unit_breakdown.slice(0, 4)) {
    const ratio = u.utilization_ratio ?? 0;
    if (ratio >= 0.85) low += 1;
    lines.push(`${u.label}: ${Math.round(ratio * 100)}% of unit plan used`);
  }
  for (const s of dashboard.signals.slice(0, 3)) {
    if (/stock|inventory|material|unit/i.test(s.message)) {
      lines.push(s.message);
      low += 1;
    }
  }
  if (lines.length === 0) return null;
  return {
    headline: low > 0 ? `${low} signal${low > 1 ? "s" : ""} need a look` : "Units within plan",
    lines: lines.slice(0, 4),
    lowStockCount: low,
  };
}

export function buildWorkspaceBusinessDashboardModel(input: {
  workspace: BusinessWorkspace;
  dashboard: BusinessDashboard;
  control: BusinessControlSummary;
  today: BusinessToday;
  insights: BusinessInsights;
  recommendations: BusinessRecommendation[];
  vendors: BusinessVendor[];
}): WorkspaceBusinessDashboardModel {
  const { workspace, dashboard, control, today, insights, recommendations, vendors } = input;
  const cur = workspace.currency || "INR";
  return {
    workspaceTitle: workspace.title,
    currency: cur,
    hero: buildTodayHero(control, today, cur),
    nextStep: pickNextStep(recommendations),
    daily: buildDailySummary(dashboard, today, cur),
    payables: buildPayables(dashboard.pending_approvals, vendors),
    receivables: buildReceivablesPlaceholder(),
    recent: buildRecentTransactions(
      [...dashboard.pending_approvals, ...dashboard.approved_spends],
      dashboard.activity,
      vendors,
    ),
    outlook: buildOutlook(control, today, insights, cur),
    inventory: buildInventorySnapshot(dashboard),
  };
}
