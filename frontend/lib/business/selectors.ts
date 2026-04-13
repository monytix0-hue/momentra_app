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
import { isPurchaseSpendType, spendTypeDetailLabel } from "@/lib/business/transaction-kinds";
import type {
  BusinessHealthTone,
  CashOutlookSummaryModel,
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

function isSameLocalDay(iso: string | null | undefined): boolean {
  if (!iso) return false;
  try {
    const d = new Date(iso);
    const n = new Date();
    return (
      d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
    );
  } catch {
    return false;
  }
}

/** Purchase vs expense rupees: queue + anything submitted today (pending or approved). */
function splitPurchaseExpenseOutgoing(dashboard: BusinessDashboard): { purchase: number; expense: number } {
  let purchase = 0;
  let expense = 0;
  for (const s of dashboard.pending_approvals) {
    const amt = bizNum(s.amount);
    if (isPurchaseSpendType(s.spend_type)) purchase += amt;
    else expense += amt;
  }
  for (const s of dashboard.approved_spends) {
    if (!isSameLocalDay(s.submitted_at)) continue;
    const amt = bizNum(s.amount);
    if (isPurchaseSpendType(s.spend_type)) purchase += amt;
    else expense += amt;
  }
  return { purchase, expense };
}

/** Today’s movement: spends whose request landed today (submitted_at), by kind. */
function splitPurchaseExpenseSubmittedToday(dashboard: BusinessDashboard): { purchase: number; expense: number } {
  let purchase = 0;
  let expense = 0;
  const seen = new Set<string>();
  for (const s of dashboard.pending_approvals) {
    if (!isSameLocalDay(s.submitted_at)) continue;
    seen.add(s.spend_id);
    const amt = bizNum(s.amount);
    if (isPurchaseSpendType(s.spend_type)) purchase += amt;
    else expense += amt;
  }
  for (const s of dashboard.approved_spends) {
    if (!isSameLocalDay(s.submitted_at) || seen.has(s.spend_id)) continue;
    const amt = bizNum(s.amount);
    if (isPurchaseSpendType(s.spend_type)) purchase += amt;
    else expense += amt;
  }
  return { purchase, expense };
}

function plainBusinessStatusLine(
  tone: BusinessHealthTone,
  pendingCount: number,
  totalPurchaseExpenseOut: number,
): string {
  if (pendingCount > 0) {
    return pendingCount === 1 ? "1 bill waiting for your OK." : `${pendingCount} bills waiting for your OK.`;
  }
  if (tone === "risk") {
    return "Cash is tight — add spends carefully.";
  }
  if (tone === "watch") {
    return "Spend is up — watch cash this week.";
  }
  if (totalPurchaseExpenseOut > 0) {
    return "Purchases (stock) and expenses (bills) are tracked separately.";
  }
  return "All good today — nothing urgent.";
}

export function buildTodayHero(
  control: BusinessControlSummary,
  today: BusinessToday,
  dashboard: BusinessDashboard,
  currency: string,
  daily: DailySummaryModel,
): TodayHeroModel {
  const remaining = bizNum(control.remaining_budget);
  const { purchase: pOut, expense: eOut } = splitPurchaseExpenseOutgoing(dashboard);
  const totalOut = pOut + eOut;
  const { tone, friendly } = controlToHealth(control.control_label);
  const pendingCount = dashboard.pending_approvals.length;
  const statusLine = plainBusinessStatusLine(tone, pendingCount, totalOut);

  return {
    cashInHandLabel: bizMoney(remaining, currency),
    cashInHandSub: "Money left after approved spends",
    salesLabel: daily.salesLabel,
    salesSub: daily.salesSub,
    purchasesLabel: bizMoney(pOut, currency),
    purchasesSub: "Stock & material (queued + today)",
    expensesLabel: bizMoney(eOut, currency),
    expensesSub: "Bills & running cost (queued + today)",
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
    title: r.title,
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
  const { purchase: pToday, expense: eToday } = splitPurchaseExpenseSubmittedToday(dashboard);
  return {
    salesLabel: "—",
    salesSub: "Sales tally — coming soon",
    purchasesLabel: bizMoney(pToday, currency),
    purchasesSub: "Stock / material you asked for today",
    expensesLabel: bizMoney(eToday, currency),
    expensesSub: "Bills you asked for today",
    collectionsLabel: "—",
    collectionsSub: "Money coming in — when connected",
    paymentsLabel: "—",
    paymentsSub: "Money paid out — when logged",
    netLabel: bizMoney(-(pToday + eToday), currency),
    netSub: "Out today (purchase + expense requests)",
    netPositive: pToday + eToday <= 0,
  };
}

export function buildPayables(pending: BusinessSpend[], vendors: BusinessVendor[]): RelationshipDueModel[] {
  const vmap = new Map(vendors.map((v) => [v.vendor_id, v.name]));
  return pending.slice(0, 12).map((s) => ({
    id: s.spend_id,
    name: vmap.get(s.vendor_id ?? "") ?? s.title,
    amount: bizNum(s.amount),
    urgency: "soon",
    dueLine: "Approve to clear this payment",
    flowLabel: isPurchaseSpendType(s.spend_type) ? "Purchase" : "Expense",
    kind: "payable" as const,
  }));
}

export function buildReceivablesPlaceholder(): RelationshipDueModel[] {
  return [];
}

export function buildRecentTransactionsFromSpends(spends: BusinessSpend[], vendors: BusinessVendor[]): TransactionRowModel[] {
  const vmap = new Map(vendors.map((v) => [v.vendor_id, v.name]));
  const spendRows: TransactionRowModel[] = spends.map((s) => {
    const vendorName = s.vendor_id ? vmap.get(s.vendor_id) : null;
    const type: TransactionRowModel["type"] = isPurchaseSpendType(s.spend_type) ? "purchase" : "expense";
    return {
      id: `spend-${s.spend_id}`,
      type,
      title: s.title,
      amount: bizNum(s.amount),
      when: s.submitted_at ?? s.approved_at ?? s.created_at ?? "",
      meta: vendorName ? `${vendorName} · ${spendTypeDetailLabel(s.spend_type)}` : spendTypeDetailLabel(s.spend_type),
    };
  });
  return spendRows.sort((a, b) => {
    const ta = a.when ? new Date(a.when).getTime() : 0;
    const tb = b.when ? new Date(b.when).getTime() : 0;
    return tb - ta;
  }).slice(0, 14);
}

function humanizeActivityMeta(eventType: string | null | undefined): string {
  const e = (eventType ?? "").toLowerCase();
  if (e.includes("approv")) return "Update";
  if (e.includes("submit") || e.includes("spend")) return "Request";
  if (e.includes("unit")) return "Store";
  if (e.includes("workspace")) return "Workspace";
  if (e.includes("vendor")) return "Supplier";
  return "Update";
}

export function buildRecentUpdatesFromActivity(activity: BusinessActivity[]): TransactionRowModel[] {
  return activity
    .slice(0, 12)
    .map((a) => ({
      id: `act-${a.activity_id}`,
      type: "other" as const,
      title: a.message,
      amount: 0,
      when: a.created_at ?? "",
      meta: humanizeActivityMeta(a.event_type),
    }))
    .sort((a, b) => {
      const ta = a.when ? new Date(a.when).getTime() : 0;
      const tb = b.when ? new Date(b.when).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 8);
}

export function buildCashOutlookSummary(
  control: BusinessControlSummary,
  today: BusinessToday,
  currency: string,
): CashOutlookSummaryModel {
  const remaining = bizNum(control.remaining_budget);
  const pending = bizNum(control.pending_spend);
  const spendToday = bizNum(today.spend_today_amount);
  const gap = remaining - pending;
  const outCombined = spendToday + pending;
  return {
    incomingLabel: "—",
    incomingSub: "Sales & customer dues — coming soon",
    outgoingLabel: bizMoney(outCombined, currency),
    outgoingSub: "Likely out today (bills in queue)",
    cushionLabel:
      gap >= 0
        ? `${bizMoney(gap, currency)} left after queue`
        : `Short by ${bizMoney(-gap, currency)}`,
    cushionTone: gap >= 0 ? "ok" : "tight",
  };
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

export function buildInventorySnapshot(
  dashboard: BusinessDashboard,
  purchaseTodayTotal: number,
  currency: string,
): InventorySnapshotModel | null {
  const lines: string[] = [];
  let low = 0;
  for (const u of dashboard.unit_breakdown.slice(0, 4)) {
    const ratio = u.utilization_ratio ?? 0;
    if (ratio >= 0.85) low += 1;
    const pct = Math.round(ratio * 100);
    lines.push(
      pct >= 85
        ? `${u.label} — high use (${pct}%) · check stock soon`
        : `${u.label} — about ${pct}% of this store’s limit`,
    );
  }
  if (purchaseTodayTotal > 0) {
    lines.unshift(`Purchase today · ${bizMoney(purchaseTodayTotal, currency)} (adds to stock)`);
  }
  for (const s of dashboard.signals.slice(0, 3)) {
    if (/stock|inventory|material|unit/i.test(s.message)) {
      lines.push(s.message);
      low += 1;
    }
  }
  if (lines.length === 0) return null;
  return {
    headline: low > 0 ? `${low} item${low > 1 ? "s" : ""} need attention` : "Stock overview",
    lines: lines.slice(0, 5),
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
  const { purchase: pSubmittedToday } = splitPurchaseExpenseSubmittedToday(dashboard);
  const daily = buildDailySummary(dashboard, today, cur);
  const allSpends = [...dashboard.pending_approvals, ...dashboard.approved_spends];
  return {
    workspaceTitle: workspace.title,
    currency: cur,
    hero: buildTodayHero(control, today, dashboard, cur, daily),
    nextStep: pickNextStep(recommendations),
    daily,
    payables: buildPayables(dashboard.pending_approvals, vendors),
    receivables: buildReceivablesPlaceholder(),
    recentTransactions: buildRecentTransactionsFromSpends(allSpends, vendors),
    recentUpdates: buildRecentUpdatesFromActivity(dashboard.activity),
    outlookSummary: buildCashOutlookSummary(control, today, cur),
    outlook: buildOutlook(control, today, insights, cur),
    inventory: buildInventorySnapshot(dashboard, pSubmittedToday, cur),
  };
}
