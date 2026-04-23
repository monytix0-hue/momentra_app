import type { GroupHome, GroupMomentSummary } from "@/lib/api/group";

export type ConsoleSeverity = "calm" | "low" | "medium" | "high";

export type TodayGroupItem = {
  id: string;
  headline: string;
  severity: ConsoleSeverity;
  ctaLabel: string;
  href: string;
};

export type RecommendedAction = {
  id: string;
  title: string;
  detail: string;
  priority: 1 | 2 | 3;
  ctaLabel: string;
  href: string;
};

export type NudgeParticipantRow = {
  commitmentId: string;
  displayName: string;
  groupId: string;
  groupTitle: string;
  amountLeft: number;
  dueDate: string | null;
  status: string;
  overdueDays: number;
  cycleHint: string | null;
};

export type GroupHealthTier = "on_track" | "slightly_behind" | "needs_attention";

export type ActiveGroupConsoleRow = {
  group: GroupMomentSummary;
  pendingCount: number;
  overdueCount: number;
  openInGroup: number;
  hasHighSignal: boolean;
  health: GroupHealthTier;
  story: string;
};

function num(v: string | number | null | undefined): number {
  if (v == null || v === "") return NaN;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : NaN;
}

export function formatInr(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function isActivityToday(iso: string | null | undefined): boolean {
  if (!iso?.trim()) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return startOfLocalDay(new Date(t)) === startOfLocalDay(new Date());
}

function dueOverdueDays(dueDate: string | null): number {
  if (!dueDate) return 0;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return 0;
  const due0 = startOfLocalDay(d);
  const now0 = startOfLocalDay(new Date());
  if (due0 >= now0) return 0;
  return Math.ceil((now0 - due0) / (86400000));
}

function humanizeGroupType(g: GroupMomentSummary): string {
  return g.group_type.replace(/_/g, " ");
}

function cycleHintFromGroup(g: GroupMomentSummary): string | null {
  if (g.duration_type === "one_time") return null;
  if (!g.cycle_type || g.cycle_type === "none") return null;
  return `${g.cycle_type.replace(/_/g, " ")} cycle`;
}

/** Pool targets across active groups (same heuristic as V2 overview). */
export function sumPooledTargets(groups: GroupMomentSummary[]): number {
  return groups.reduce((acc, g) => {
    const raw = g.target_amount;
    if (raw == null || raw === "") return acc;
    const n = typeof raw === "string" ? parseFloat(raw) : Number(raw);
    if (!Number.isFinite(n) || n <= 0) return acc;
    return acc + n;
  }, 0);
}

export function openBalanceFromCommitments(rows: GroupHome["pending_commitments"]): number {
  let t = 0;
  for (const r of rows) {
    const left = num(r.committed_amount) - num(r.paid_amount);
    if (left > 0) t += left;
  }
  return t;
}

export function pendingByGroup(rows: GroupHome["pending_commitments"]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const left = num(r.committed_amount) - num(r.paid_amount);
    if (left <= 0) continue;
    m.set(r.group_id, (m.get(r.group_id) ?? 0) + 1);
  }
  return m;
}

export function groupsNeedingAttention(
  data: GroupHome,
  pendingMap: Map<string, number>,
): number {
  let n = 0;
  for (const g of data.groups) {
    const pend = pendingMap.get(g.group_id) ?? 0;
    const sig = data.top_signals.some((s) => !s.resolved && s.group_id === g.group_id && s.severity === "high");
    if (pend > 0 || sig) n += 1;
  }
  return n;
}

export function buildNudgeRows(data: GroupHome): NudgeParticipantRow[] {
  const rows: NudgeParticipantRow[] = [];
  const titleMap = new Map(data.groups.map((g) => [g.group_id, g.title]));
  for (const r of data.pending_commitments) {
    const left = num(r.committed_amount) - num(r.paid_amount);
    if (left <= 0) continue;
    const g = data.groups.find((x) => x.group_id === r.group_id);
    rows.push({
      commitmentId: r.commitment_id,
      displayName: r.display_name,
      groupId: r.group_id,
      groupTitle: r.group_title || titleMap.get(r.group_id) || "Group",
      amountLeft: left,
      dueDate: r.due_date,
      status: r.status,
      overdueDays: dueOverdueDays(r.due_date),
      cycleHint: g ? cycleHintFromGroup(g) : null,
    });
  }
  rows.sort((a, b) => {
    if (b.overdueDays !== a.overdueDays) return b.overdueDays - a.overdueDays;
    return b.amountLeft - a.amountLeft;
  });
  return rows;
}

export function buildTodayItems(data: GroupHome, openTotal: number, nudges: NudgeParticipantRow[]): TodayGroupItem[] {
  const items: TodayGroupItem[] = [];

  if (data.overdue_commitment_count > 0) {
    const g0 = nudges.find((n) => n.overdueDays > 0);
    const fallback = data.groups[0]?.group_id;
    const href =
      g0 ? `/group/${g0.groupId}` : fallback ? `/group/${fallback}` : "/group/new";
    items.push({
      id: "overdue",
      headline:
        data.overdue_commitment_count === 1
          ? `${nudges[0]?.displayName ?? "Someone"} has a contribution that’s past due`
          : `${data.overdue_commitment_count} contributions are past due — worth a kind check-in`,
      severity: "high",
      ctaLabel: "Review now",
      href,
    });
  }

  const pendingPeople = new Set(data.pending_commitments.map((p) => p.participant_id + p.group_id)).size;
  if (openTotal > 0 && items.length < 3) {
    const groupCount = new Set(data.pending_commitments.map((p) => p.group_id)).size;
    const gid = nudges[0]?.groupId ?? data.groups[0]?.group_id;
    items.push({
      id: "open-balance",
      headline: `${formatInr(openTotal)} still open across ${groupCount === 1 ? "1 group" : `${groupCount} groups`}`,
      severity: data.overdue_commitment_count > 0 ? "medium" : "medium",
      ctaLabel: "See details",
      href: gid ? `/group/${gid}` : "/group/new",
    });
  }

  const todayActs = data.recent_activity.filter((a) => isActivityToday(a.created_at));
  const expenseToday = todayActs.find(
    (a) =>
      /expense/i.test(a.event_type) ||
      /expense/i.test(a.message) ||
      a.event_type === "expense_created",
  );
  if (expenseToday && items.length < 3) {
    items.push({
      id: `act-${expenseToday.activity_id}`,
      headline: expenseToday.message.endsWith(".") ? expenseToday.message : `${expenseToday.message}`,
      severity: "low",
      ctaLabel: "Open group",
      href: `/group/${expenseToday.group_id}`,
    });
  }

  if (pendingPeople === 1 && items.length < 3 && data.pending_commitment_count > 0) {
    const p = nudges[0];
    if (p) {
      items.push({
        id: "one-pending-person",
        headline: `One person still has a contribution open in ${p.groupTitle}`,
        severity: "medium",
        ctaLabel: "Open group",
        href: `/group/${p.groupId}`,
      });
    }
  }

  const firstSignal = data.top_signals.find((s) => !s.resolved);
  if (firstSignal && items.length < 3) {
    items.push({
      id: `sig-${firstSignal.signal_id}`,
      headline: firstSignal.message,
      severity: firstSignal.severity === "high" ? "high" : firstSignal.severity === "medium" ? "medium" : "low",
      ctaLabel: "Open group",
      href: `/group/${firstSignal.group_id}`,
    });
  }

  if (items.length === 0) {
    const firstId = data.groups[0]?.group_id;
    items.push({
      id: "calm",
      headline:
        data.groups.length === 0
          ? "No groups yet — start a shared fund or trip when you’re ready"
          : "No urgent issues — your groups look stable today",
      severity: "calm",
      ctaLabel: data.groups.length === 0 ? "Create a group" : "Browse groups",
      href: data.groups.length === 0 ? "/group/new" : firstId ? `/group/${firstId}` : "/group/new",
    });
  }

  return items.slice(0, 3);
}

export function buildRecommendedActions(data: GroupHome, nudges: NudgeParticipantRow[]): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  let aid = 0;
  const nextId = () => `a-${++aid}`;

  for (const n of nudges.slice(0, 3)) {
    const overdueBit =
      n.overdueDays > 0 ? ` · past due ${n.overdueDays} day${n.overdueDays === 1 ? "" : "s"}` : "";
    actions.push({
      id: nextId(),
      title: `Gentle check-in: ${n.displayName} — ${formatInr(n.amountLeft)} still open`,
      detail: `${n.groupTitle}${overdueBit}`,
      priority: n.overdueDays > 0 ? 1 : 2,
      ctaLabel: "Open group",
      href: `/group/${n.groupId}`,
    });
  }

  const todayActs = data.recent_activity.filter((a) => isActivityToday(a.created_at));
  const review = todayActs.find((a) => /expense|committed|commitment/i.test(a.event_type + a.message));
  if (review) {
    actions.push({
      id: nextId(),
      title: "Review today’s update",
      detail: review.message,
      priority: 2,
      ctaLabel: "Review",
      href: `/group/${review.group_id}`,
    });
  }

  const open = openBalanceFromCommitments(data.pending_commitments);
  if (open > 0 && !actions.some((a) => a.title.includes("Settle"))) {
    actions.push({
      id: nextId(),
      title: `${formatInr(open)} still on the radar`,
      detail: "Record a payment or settle up inside each group when you’re ready.",
      priority: 2,
      ctaLabel: "View commitments",
      href: `/group/${nudges[0]?.groupId ?? data.groups[0]?.group_id ?? ""}`,
    });
  }

  for (const s of data.top_signals.filter((x) => !x.resolved).slice(0, 2)) {
    if (actions.length >= 5) break;
    if (/cycle/i.test(s.message + s.signal_type)) {
      actions.push({
        id: nextId(),
        title: "Catch up on the current cycle",
        detail: s.message,
        priority: s.severity === "high" ? 1 : 2,
        ctaLabel: "Open group",
        href: `/group/${s.group_id}`,
      });
    }
  }

  actions.sort((a, b) => a.priority - b.priority);
  return actions.slice(0, 5);
}

function healthTier(pending: number, overdue: number, highSig: boolean): GroupHealthTier {
  if (overdue > 0 || highSig) return "needs_attention";
  if (pending > 0) return "slightly_behind";
  return "on_track";
}

export function buildActiveGroupRows(data: GroupHome): ActiveGroupConsoleRow[] {
  const nudges = buildNudgeRows(data);
  const byGroupPending = new Map<string, number>();
  const byGroupOverdue = new Map<string, number>();
  const openByGroup = new Map<string, number>();

  for (const n of nudges) {
    byGroupPending.set(n.groupId, (byGroupPending.get(n.groupId) ?? 0) + 1);
    if (n.overdueDays > 0) {
      byGroupOverdue.set(n.groupId, (byGroupOverdue.get(n.groupId) ?? 0) + 1);
    }
    openByGroup.set(n.groupId, (openByGroup.get(n.groupId) ?? 0) + n.amountLeft);
  }

  return data.groups.map((g) => {
    const pendingCount = byGroupPending.get(g.group_id) ?? 0;
    const overdueCount = byGroupOverdue.get(g.group_id) ?? 0;
    const openInGroup = openByGroup.get(g.group_id) ?? 0;
    const hasHighSignal = data.top_signals.some(
      (s) => !s.resolved && s.group_id === g.group_id && s.severity === "high",
    );
    const health = healthTier(pendingCount, overdueCount, hasHighSignal);

    let story = "All members fulfilled on tracked commitments.";
    if (overdueCount > 0) {
      story = `${overdueCount} overdue — people may be waiting on this group.`;
    } else if (pendingCount > 0) {
      story = `${pendingCount} commitment${pendingCount === 1 ? "" : "s"} still pending`;
    } else if (openInGroup > 0) {
      story = `${formatInr(openInGroup)} open — expenses may need settling`;
    } else {
      const expenseSignal = data.top_signals.find(
        (s) => !s.resolved && s.group_id === g.group_id && /expense|settle|share/i.test(s.message),
      );
      if (expenseSignal) story = "Expenses added — check if shares are settled";
    }

    return {
      group: g,
      pendingCount,
      overdueCount,
      openInGroup,
      hasHighSignal,
      health,
      story,
    };
  });
}

export function overviewSupportingLine(data: GroupHome, attentionCount: number, openTotal: number): string {
  const parts: string[] = [];
  if (attentionCount === 1) parts.push("1 active group needs attention");
  else if (attentionCount > 1) parts.push(`${attentionCount} active groups need attention`);
  else parts.push("Groups look coordinated");

  if (openTotal > 0) {
    parts.push(`${formatInr(openTotal)} open across current cycles`);
  } else {
    parts.push("no open commitment balance on your radar");
  }
  return parts.join(" · ");
}

export { humanizeGroupType, cycleHintFromGroup };
