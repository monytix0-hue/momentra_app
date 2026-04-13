/**
 * View-model types for the workspace Business control panel.
 * Built from API responses in selectors — not raw DTOs.
 */

import type { UiTransactionKind } from "@/lib/business/transaction-kinds";

export type BusinessHealthTone = "safe" | "watch" | "risk";

/** First screen: cash, sales, purchases, expenses — all visible at a glance */
export type TodayHeroModel = {
  cashInHandLabel: string;
  cashInHandSub: string;
  salesLabel: string;
  salesSub: string;
  /** Purchase pressure: queue + today (stock / material) */
  purchasesLabel: string;
  purchasesSub: string;
  /** Expense pressure: queue + today (running costs) */
  expensesLabel: string;
  expensesSub: string;
  /** Plain-language line for the business owner */
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
  salesLabel: string;
  salesSub: string;
  purchasesLabel: string;
  purchasesSub: string;
  expensesLabel: string;
  expensesSub: string;
  collectionsLabel: string;
  collectionsSub: string;
  paymentsLabel: string;
  paymentsSub: string;
  netLabel: string;
  netSub: string;
  netPositive: boolean;
};

export type RelationshipDueModel = {
  id: string;
  name: string;
  amount: number;
  urgency: "today" | "soon" | "normal";
  dueLine: string;
  /** Purchase vs expense row label */
  flowLabel: string;
  kind: "payable" | "receivable";
};

export type TransactionRowModel = {
  id: string;
  type: UiTransactionKind;
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

/** Scannable cash outlook before any detailed rows */
export type CashOutlookSummaryModel = {
  incomingLabel: string;
  incomingSub: string;
  outgoingLabel: string;
  outgoingSub: string;
  cushionLabel: string;
  cushionTone: "ok" | "tight";
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
  /** Purchase / expense rows from spends only */
  recentTransactions: TransactionRowModel[];
  /** Lower priority: system / admin activity */
  recentUpdates: TransactionRowModel[];
  outlookSummary: CashOutlookSummaryModel;
  outlook: OutlookDayModel[];
  inventory: InventorySnapshotModel | null;
};
