/**
 * Presentational types for the Group Detail experience.
 * Unified language: Planned, Paid, Pending, Extra, Owes — hides raw backend names.
 */

export type GroupFundingModel = "pooled" | "split_expenses" | "hybrid";

/** Maps from coordination health + thresholds */
export type GroupHealthTone = "on_track" | "slightly_behind" | "at_risk";

export type InsightTone = "warm" | "notice" | "neutral";

export type MemberActionKind =
  | "remind"
  | "pay_now"
  | "mark_paid"
  | "settle"
  | "view"
  | "none";

export type MemberLineStatus =
  | "paid"
  | "pending"
  | "paid_extra"
  | "overdue"
  | "not_started"
  | "settle_up";

export interface GroupInsight {
  id: string;
  tone: InsightTone;
  text: string;
}

export interface GroupMemberCardModel {
  participantId: string;
  displayName: string;
  initials: string;
  /** Planned (commitments) */
  planned: number;
  /** Paid toward plan */
  paid: number;
  /** max(0, planned - paid) */
  pending: number;
  /** max(0, paid - planned) */
  extra: number;
  /** Net “owes” from positions (split / settlement lens); 0 if not applicable */
  owes: number;
  lineStatus: MemberLineStatus;
  /** Soft, human label for the pill */
  statusLabel: string;
  primaryCommitmentId: string | null;
  dueDate: string | null;
  /** Suggested primary action for this row */
  suggestedAction: MemberActionKind;
}

export interface GroupExpenseSnapshotItem {
  expenseId: string;
  title: string;
  amount: number;
  paidByName: string;
  expenseDate: string;
  category: string | null;
  emoji: string;
}

export interface GroupActivityFeedItem {
  activityId: string;
  eventType: string;
  message: string;
  createdAt: string;
}

export interface GroupDetailViewModel {
  groupId: string;
  title: string;
  groupType: string;
  fundingModel: GroupFundingModel;
  momentStatus: string;

  targetAmount: number | null;
  collectedAmount: number;
  /** Sum of expense amounts (shared spend recorded) */
  totalSpent: number;
  /** Pooled: gap to target. Null if no target. */
  shortfallToPool: number | null;
  /** From API summary — open expense-share imbalance */
  openShareDebt: number;

  poolProgressPct: number | null;
  /** Spent vs target when target exists (burn) */
  spendRatioPct: number | null;

  nextDueDate: string | null;
  nextDueSummary: string | null;

  pendingPeopleCount: number;
  overdueCount: number;

  health: GroupHealthTone;
  healthLabel: string;

  insights: GroupInsight[];

  members: GroupMemberCardModel[];
  recentExpenses: GroupExpenseSnapshotItem[];
  activity: GroupActivityFeedItem[];

  currentUserParticipantId: string | null;
  isAdmin: boolean;
}

// --- Group hub (list / dashboard) ---

export interface GroupHubOverviewStat {
  id: string;
  label: string;
  value: string;
  hint: string;
}

export type GroupHubPriorityTone = "urgent" | "soon" | "calm";

export interface GroupHubPriorityItem {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  href: string;
  tone: GroupHubPriorityTone;
}

export interface GroupHubCardModel {
  groupId: string;
  title: string;
  groupTypeKey: string;
  groupTypeLabel: string;
  fundingModelKey: string;
  fundingLabel: string;
  /** When unknown, UI shows "—" */
  memberCountLabel: string | null;
  moneyLine: string;
  pendingPeopleCount: number;
  nextDueLabel: string | null;
  health: GroupHealthTone;
  healthLabel: string;
  summaryLine: string;
  href: string;
}

// --- Create group draft (client-only) ---

export type CreateGroupUiKind = "trip" | "household" | "event" | "other";

export interface CreateGroupParticipantDraft {
  id: string;
  displayName: string;
  email: string;
  role: "member" | "admin";
}
