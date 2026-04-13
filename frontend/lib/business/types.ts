/**
 * View-model types for the workspace Business control panel.
 * Built from API responses in selectors — not raw DTOs.
 */

export type BusinessHealthTone = "safe" | "watch" | "risk";

export type TodayHeroModel = {
  cashInHandLabel: string;
  cashInHandSub: string;
  incomingLabel: string;
  incomingSub: string;
  outgoingLabel: string;
  outgoingSub: string;
  statusLine: string;
  health: BusinessHealthTone;
  healthLabel: string;
};

export type NextStepModel = {
  title: string;
  reason: string;
  ctaLabel: string;
  href?: string;
  onPress?: "open_spend" | "scroll_payables" | "scroll_collect" | "none";
};

export type DailySummaryModel = {
  salesApproxLabel: string;
  expensesLabel: string;
  netLabel: string;
  netPositive: boolean;
};

export type RelationshipDueModel = {
  id: string;
  name: string;
  amount: number;
  urgency: "today" | "soon" | "normal";
  dueLine: string;
  kind: "payable" | "receivable";
};

export type TransactionRowModel = {
  id: string;
  type: "sale" | "expense" | "payment" | "collection" | "other";
  title: string;
  amount: number;
  when: string;
  meta?: string;
};

export type OutlookDayModel = {
  label: string;
  incoming: string;
  outgoing: string;
  gapLine: string;
};

export type InventorySnapshotModel = {
  headline: string;
  lines: string[];
  lowStockCount: number;
};

export type WorkspaceBusinessDashboardModel = {
  workspaceTitle: string;
  currency: string;
  hero: TodayHeroModel;
  nextStep: NextStepModel | null;
  daily: DailySummaryModel;
  payables: RelationshipDueModel[];
  receivables: RelationshipDueModel[];
  recent: TransactionRowModel[];
  outlook: OutlookDayModel[];
  inventory: InventorySnapshotModel | null;
};
