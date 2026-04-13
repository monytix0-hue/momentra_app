import type {
  GroupCommitment,
  GroupExpense,
  GroupMemberMoneySummaryRow,
  GroupMomentDetail,
  GroupPosition,
} from "@/lib/api/group";
import {
  coordinationHealth,
  commitmentsForScope,
  effectiveCollected,
  effectivePoolTarget,
  poolProgressPct,
  rollupsByParticipant,
  type CoordHealth,
} from "@/lib/group/group-detail-coordination";
import type {
  GroupActivityFeedItem,
  GroupDetailViewModel,
  GroupExpenseSnapshotItem,
  GroupFundingModel,
  GroupHealthTone,
  GroupInsight,
  GroupMemberCardModel,
  MemberActionKind,
  MemberLineStatus,
} from "@/lib/group/types";

function n(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  const x = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(x) ? x : 0;
}

export function formatInr(amount: number, opts?: { maximumFractionDigits?: number }): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: opts?.maximumFractionDigits ?? 0,
  }).format(amount);
}

function mapCoordHealthToTone(h: CoordHealth): GroupHealthTone {
  if (h === "ON_TRACK") return "on_track";
  if (h === "NEEDS_ATTENTION") return "at_risk";
  return "slightly_behind";
}

function healthDisplayLabel(tone: GroupHealthTone): string {
  if (tone === "on_track") return "In a good place";
  if (tone === "at_risk") return "Worth coordinating";
  return "Room to catch up";
}

const CATEGORY_EMOJI: Record<string, string> = {
  food: "🍽",
  meals: "🍽",
  travel: "✈",
  transport: "🚗",
  stay: "🏨",
  lodging: "🏨",
  entertainment: "🎬",
  movie: "🎬",
  groceries: "🛒",
  utilities: "💡",
  default: "🧾",
};

export function emojiForExpenseCategory(category: string | null | undefined, title: string): string {
  const c = (category || "").toLowerCase();
  const t = title.toLowerCase();
  for (const key of Object.keys(CATEGORY_EMOJI)) {
    if (key === "default") continue;
    if (c.includes(key) || t.includes(key)) return CATEGORY_EMOJI[key]!;
  }
  return CATEGORY_EMOJI.default;
}

function earliestDueDate(commitments: GroupCommitment[]): string | null {
  let best: string | null = null;
  for (const c of commitments) {
    if (!c.due_date) continue;
    if (n(c.committed_amount) <= n(c.paid_amount)) continue;
    if (!best || c.due_date < best) best = c.due_date;
  }
  return best;
}

function dueSummary(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} ago`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

function distinctPendingPeople(scoped: GroupCommitment[]): number {
  return new Set(scoped.filter((c) => n(c.committed_amount) > n(c.paid_amount)).map((c) => c.participant_id)).size;
}

function lineStatusFrom(
  planned: number,
  paid: number,
  worst: string,
  hasCommitmentLine: boolean,
  expensesPaid: number,
): { line: MemberLineStatus; label: string } {
  const pend = Math.max(0, planned - paid);
  const ext = Math.max(0, paid - planned);
  const st = (worst || "").toLowerCase();
  const poolActive = planned > 0.01 || paid > 0.01;

  if (!hasCommitmentLine && !poolActive && expensesPaid > 0.01) {
    return { line: "not_started", label: "Shared bills only" };
  }
  if (!hasCommitmentLine && planned < 0.01 && paid < 0.01) {
    return { line: "not_started", label: "No plan yet" };
  }
  if (hasCommitmentLine && planned < 0.01 && paid < 0.01 && expensesPaid < 0.01) {
    return { line: "not_started", label: "No pool target" };
  }
  if (st === "overdue" && pend > 0.01) return { line: "overdue", label: "Past due" };
  if (pend > 0.01) {
    if (paid > 0.01) return { line: "pending", label: "Partially paid" };
    return { line: "pending", label: "Pending" };
  }
  if (ext > 0.01) return { line: "paid_extra", label: "Paid extra" };
  if (planned > 0.01 || paid > 0.01) return { line: "paid", label: "Paid" };
  return { line: "not_started", label: "No plan yet" };
}

function suggestedActionForMember(args: {
  isAdmin: boolean;
  isSelf: boolean;
  pending: number;
  line: MemberLineStatus;
  funding: GroupFundingModel;
  owes: number;
}): MemberActionKind {
  const { isAdmin, isSelf, pending, line, funding, owes } = args;
  if (line === "overdue" && isAdmin) return "remind";
  if (line === "overdue" && isSelf) return "pay_now";
  if (funding !== "pooled" && owes > 0.01) return "settle";
  if (pending > 0.01 && isSelf) return "pay_now";
  if (pending > 0.01 && isAdmin) return "mark_paid";
  if (pending > 0.01 && !isSelf && !isAdmin) return "view";
  return "none";
}

export function totalExpenseAmount(expenses: GroupExpense[]): number {
  return expenses.reduce((s, e) => s + n(e.amount), 0);
}

/** Matches backend member-summary expense scope: ongoing + active cycle includes null cycle_id rows. */
export function expensesPaidByParticipantForScope(
  expenses: GroupExpense[],
  activeCycleId: string | null,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of expenses) {
    if (activeCycleId) {
      if (e.cycle_id && e.cycle_id !== activeCycleId) continue;
    }
    const pid = e.paid_by_participant_id;
    m.set(pid, (m.get(pid) || 0) + n(e.amount));
  }
  return m;
}

export function topSpendCategory(expenses: GroupExpense[]): { label: string; amount: number; pct: number } | null {
  if (!expenses.length) return null;
  const by = new Map<string, number>();
  let total = 0;
  for (const e of expenses) {
    const key = (e.category || "General").trim() || "General";
    const a = n(e.amount);
    by.set(key, (by.get(key) || 0) + a);
    total += a;
  }
  if (total < 0.01) return null;
  let bestK = "";
  let bestV = 0;
  for (const [k, v] of by) {
    if (v > bestV) {
      bestK = k;
      bestV = v;
    }
  }
  return { label: bestK, amount: bestV, pct: Math.round((bestV / total) * 100) };
}

export function buildInsights(args: {
  detail: GroupMomentDetail;
  scopedCommitments: GroupCommitment[];
  expenses: GroupExpense[];
  positions: GroupPosition[];
  pendingPeople: number;
  shortfall: number | null;
}): GroupInsight[] {
  const { detail, scopedCommitments, expenses, positions, pendingPeople, shortfall } = args;
  const out: GroupInsight[] = [];
  let id = 0;
  const push = (tone: GroupInsight["tone"], text: string) => {
    out.push({ id: `i-${id++}`, tone, text });
  };

  if (pendingPeople > 1) {
    push("notice", `${pendingPeople} people still have a balance open — a gentle nudge can help.`);
  } else if (pendingPeople === 1) {
    push("warm", "One person hasn’t finished contributing yet — check in when it feels natural.");
  }

  if (shortfall != null && shortfall > 0.01 && detail.funding_model === "pooled") {
    push("neutral", `About ${formatInr(shortfall)} left to reach the shared target.`);
  }

  const top = topSpendCategory(expenses);
  if (top && top.pct >= 35) {
    push("neutral", `${top.label} is about ${top.pct}% of shared spend so far.`);
  }

  for (const p of positions) {
    const net = n(p.net_position);
    if (net > 1) {
      push(
        "warm",
        `${p.display_name} contributed ${formatInr(net)} ahead of plan — nice.`,
      );
      break;
    }
  }

  if (n(detail.summary.open_share_debt) > 0.01) {
    push("notice", "Some shared bills still have open balances — settling keeps things fair.");
  }

  if (out.length < 2 && scopedCommitments.length === 0 && expenses.length > 0) {
    push("neutral", `${expenses.length} expense${expenses.length === 1 ? "" : "s"} logged — keep adding as you go.`);
  }

  return out.slice(0, 3);
}

export interface MapViewModelInput {
  detail: GroupMomentDetail;
  commitments: GroupCommitment[];
  expenses: GroupExpense[];
  positions: GroupPosition[];
  activity: { activity_id: string; event_type: string; message: string; created_at?: string | null }[];
  currentUserId: string | null;
  /** When null, pool amounts use commitment rollups and expenses-paid is derived locally. */
  memberSummary: GroupMemberMoneySummaryRow[] | null;
}

export function buildGroupDetailViewModel(input: MapViewModelInput): GroupDetailViewModel {
  const { detail, commitments, expenses, positions, activity, currentUserId, memberSummary } = input;
  const fundingModel = (detail.funding_model || "pooled") as GroupFundingModel;
  const scoped = commitmentsForScope(commitments, detail.active_cycle?.cycle_id ?? null);
  const activeCycleId = detail.active_cycle?.cycle_id ?? null;
  const summaryByPid = new Map((memberSummary ?? []).map((r) => [r.participant_id, r]));
  const fallbackExpensePaid = expensesPaidByParticipantForScope(expenses, activeCycleId);
  const coord = coordinationHealth(detail, scoped);
  const health = mapCoordHealthToTone(coord);

  const targetAmount = effectivePoolTarget(detail);
  const collectedAmount = effectiveCollected(detail);
  const totalSpent = totalExpenseAmount(expenses);
  const poolPct = poolProgressPct(detail);

  let shortfallToPool: number | null = null;
  if (targetAmount != null && targetAmount > 0) {
    shortfallToPool = Math.max(0, targetAmount - collectedAmount);
  }

  let spendRatioPct: number | null = null;
  if (targetAmount != null && targetAmount > 0) {
    spendRatioPct = Math.min(100, Math.round((totalSpent / targetAmount) * 100));
  }

  const pendingPeopleCount = distinctPendingPeople(scoped);
  const nextDue = earliestDueDate(scoped);

  const participantById = new Map(detail.participants.map((p) => [p.participant_id, p]));
  const positionById = new Map(positions.map((p) => [p.participant_id, p]));

  const participantIds = detail.participants.map((p) => p.participant_id);
  const rollups = rollupsByParticipant(scoped, participantIds);

  const myPid = detail.participants.find((p) => p.user_id === currentUserId)?.participant_id ?? null;
  const isAdmin = detail.participants.some(
    (p) => p.user_id === currentUserId && p.status === "active" && p.role === "admin",
  );

  const members: GroupMemberCardModel[] = detail.participants
    .filter((p) => p.status === "active")
    .map((p) => {
      const r = rollups.get(p.participant_id);
      const primary = r?.primaryCommitment ?? null;
      const sumRow = summaryByPid.get(p.participant_id);
      const planned = sumRow ? n(sumRow.planned_contribution) : (r?.committed ?? 0);
      const paid = sumRow ? n(sumRow.contribution_paid) : (r?.paid ?? 0);
      const pending = sumRow ? n(sumRow.pending_contribution) : Math.max(0, planned - paid);
      const extra = sumRow ? n(sumRow.extra_contribution) : Math.max(0, paid - planned);
      const expensesPaid = sumRow ? n(sumRow.expenses_paid) : (fallbackExpensePaid.get(p.participant_id) ?? 0);
      const pos = positionById.get(p.participant_id);
      const net = pos ? n(pos.net_position) : 0;
      const owes = net < -0.01 ? Math.abs(net) : 0;

      const hasCommitmentRow = scoped.some((c) => c.participant_id === p.participant_id);
      const worst = r?.statusWorst ?? "fulfilled";
      const { line, label } = lineStatusFrom(planned, paid, worst, hasCommitmentRow, expensesPaid);

      let lineOut: MemberLineStatus = line;
      let labelOut = label;
      if (fundingModel !== "pooled" && owes > 0.01 && line === "pending") {
        lineOut = "settle_up";
        labelOut = "Balance open";
      }

      const isSelf = p.participant_id === myPid;
      const suggestedAction = suggestedActionForMember({
        isAdmin,
        isSelf,
        pending,
        line: lineOut,
        funding: fundingModel,
        owes,
      });

      return {
        participantId: p.participant_id,
        displayName: p.display_name || "Member",
        initials: initialsFromName(p.display_name || "?"),
        role: p.role || "member",
        expensesPaid,
        planned,
        paid,
        pending,
        extra,
        owes,
        lineStatus: lineOut,
        statusLabel: labelOut,
        primaryCommitmentId: primary?.commitment_id ?? null,
        dueDate: primary?.due_date ?? null,
        suggestedAction,
      };
    })
    .sort((a, b) => {
      const score = (m: GroupMemberCardModel) => {
        if (m.lineStatus === "overdue") return 0;
        if (m.pending > 0.01) return 1;
        return 2;
      };
      return score(a) - score(b) || a.displayName.localeCompare(b.displayName);
    });

  const recentExpenses: GroupExpenseSnapshotItem[] = [...expenses]
    .sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1))
    .slice(0, 4)
    .map((e) => ({
      expenseId: e.expense_id,
      title: e.title,
      amount: n(e.amount),
      paidByName: participantById.get(e.paid_by_participant_id)?.display_name ?? "Someone",
      expenseDate: e.expense_date,
      category: e.category,
      emoji: emojiForExpenseCategory(e.category, e.title),
    }));

  const activityFeed: GroupActivityFeedItem[] = activity.slice(0, 12).map((a) => ({
    activityId: a.activity_id,
    eventType: a.event_type,
    message: a.message,
    createdAt: a.created_at || "",
  }));

  const insights = buildInsights({
    detail,
    scopedCommitments: scoped,
    expenses,
    positions,
    pendingPeople: pendingPeopleCount,
    shortfall: shortfallToPool,
  });

  return {
    groupId: detail.group_id,
    title: detail.title,
    groupType: detail.group_type,
    fundingModel,
    momentStatus: detail.status,
    targetAmount,
    collectedAmount,
    totalSpent,
    shortfallToPool,
    openShareDebt: n(detail.summary.open_share_debt),
    poolProgressPct: poolPct,
    spendRatioPct,
    nextDueDate: nextDue,
    nextDueSummary: dueSummary(nextDue),
    pendingPeopleCount,
    overdueCount: detail.summary.overdue_commitment_count,
    health,
    healthLabel: healthDisplayLabel(health),
    insights,
    members,
    recentExpenses,
    activity: activityFeed,
    currentUserParticipantId: myPid,
    isAdmin,
  };
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}
