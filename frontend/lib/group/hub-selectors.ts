import type { GroupHome } from "@/lib/api/group";
import {
  buildActiveGroupRows,
  buildNudgeRows,
  buildRecommendedActions,
  formatInr,
  groupsNeedingAttention,
  openBalanceFromCommitments,
  pendingByGroup,
  type ActiveGroupConsoleRow,
} from "@/lib/group/group-home-console";
import type {
  GroupHealthTone,
  GroupHubCardModel,
  GroupHubOverviewStat,
  GroupHubPriorityItem,
} from "@/lib/group/types";

function num(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  const x = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(x) ? x : 0;
}

function fundingLabel(fm: string): string {
  const f = fm.toLowerCase();
  if (f === "pooled") return "Pooled";
  if (f === "split_expenses") return "Split bills";
  if (f === "hybrid") return "Hybrid";
  return fm.replace(/_/g, " ");
}

function typeLabel(gt: string): string {
  return gt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function healthToTone(health: ActiveGroupConsoleRow["health"]): GroupHealthTone {
  if (health === "needs_attention") return "at_risk";
  if (health === "slightly_behind") return "slightly_behind";
  return "on_track";
}

function healthLabelFromTone(tone: GroupHealthTone): string {
  if (tone === "at_risk") return "Worth coordinating";
  if (tone === "slightly_behind") return "Room to catch up";
  return "In a good place";
}

function earliestDueInGroup(data: GroupHome, groupId: string): string | null {
  let best: string | null = null;
  for (const r of data.pending_commitments) {
    if (r.group_id !== groupId || !r.due_date) continue;
    if (num(r.committed_amount) <= num(r.paid_amount)) continue;
    if (!best || String(r.due_date) < best) best = String(r.due_date);
  }
  return best;
}

function dueHuman(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return `Was due ${Math.abs(diff)}d ago`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff <= 7) return `Due in ${diff} days`;
  return `Due ${iso.slice(0, 10)}`;
}

/** Softer one-line for cards — prefer friendly copy over system jargon */
function smartSummary(row: ActiveGroupConsoleRow, data: GroupHome): string {
  const g = row.group;
  const pend = row.pendingCount;
  const story = row.story;
  if (row.overdueCount > 0) {
    return `Some balances are past due — a gentle check-in can help.`;
  }
  if (pend > 0) {
    return pend === 1 ? "One person still has a contribution pending." : `${pend} people still have something pending.`;
  }
  const sig = data.top_signals.find((s) => !s.resolved && s.group_id === g.group_id);
  if (sig && /spend|fast|pace/i.test(sig.message)) {
    return "Spending is a bit ahead of plan — worth a quick look.";
  }
  if (story.includes("open")) return "A few expense shares may still need settling.";
  return "Looking steady for now.";
}

export function buildHubOverviewStats(data: GroupHome): GroupHubOverviewStat[] {
  const openTotal = openBalanceFromCommitments(data.pending_commitments);
  const pendingMap = pendingByGroup(data.pending_commitments);
  const attention = groupsNeedingAttention(data, pendingMap);
  const activeFromList = data.groups.filter((g) => g.status === "active").length;
  /** Prefer server aggregate from `GET /group/home` when present. */
  const active =
    typeof data.active_group_count === "number" && data.active_group_count >= 0
      ? data.active_group_count
      : activeFromList || data.groups.length;

  return [
    {
      id: "active",
      label: "Active groups",
      value: String(active),
      hint: "You’re in these shared spaces",
    },
    {
      id: "pending-lines",
      label: "Open contributions",
      value: String(data.pending_commitment_count),
      hint: "Waiting to be completed",
    },
    {
      id: "open-rupees",
      label: "Balance to track",
      value: openTotal > 0 ? formatInr(openTotal) : "—",
      hint: openTotal > 0 ? "Across your groups" : "All clear for now",
    },
    {
      id: "attention",
      label: "Worth a glance",
      value: String(attention),
      hint: attention === 1 ? "One group" : `${attention} groups`,
    },
  ];
}

export function buildHubPriorityItems(data: GroupHome): GroupHubPriorityItem[] {
  const nudges = buildNudgeRows(data);
  const actions = buildRecommendedActions(data, nudges);
  return actions.slice(0, 5).map((a) => ({
    id: a.id,
    title: a.title,
    subtitle: a.detail,
    ctaLabel: a.ctaLabel,
    href: a.href,
    tone: (a.priority === 1 ? "urgent" : a.priority === 2 ? "soon" : "calm") as GroupHubPriorityItem["tone"],
  }));
}

export function buildHubCards(data: GroupHome): GroupHubCardModel[] {
  const rows = buildActiveGroupRows(data);
  return rows.map((row) => {
    const g = row.group;
    const target = g.target_amount != null && g.target_amount !== "" ? num(g.target_amount) : null;
    const tone = healthToTone(row.health);
    const due = earliestDueInGroup(data, g.group_id);
    const pendingMap = pendingByGroup(data.pending_commitments);
    const pendPeople = pendingMap.get(g.group_id) ?? 0;

    let moneyLine = "";
    if (g.funding_model === "pooled" && target != null && target > 0) {
      moneyLine = `Pool target ${formatInr(target)}`;
    } else if (g.funding_model === "split_expenses") {
      moneyLine = row.openInGroup > 0 ? `${formatInr(row.openInGroup)} open across splits` : "Splits up to date";
    } else {
      moneyLine =
        target != null && target > 0 ? `Guide ${formatInr(target)}` : "Money style: " + fundingLabel(g.funding_model);
    }

    return {
      groupId: g.group_id,
      title: g.title,
      groupTypeKey: g.group_type,
      groupTypeLabel: typeLabel(g.group_type),
      fundingModelKey: g.funding_model,
      fundingLabel: fundingLabel(g.funding_model),
      memberCountLabel: null,
      moneyLine,
      pendingPeopleCount: pendPeople,
      nextDueLabel: dueHuman(due),
      health: tone,
      healthLabel: healthLabelFromTone(tone),
      summaryLine: smartSummary(row, data),
      href: `/group/${g.group_id}`,
    };
  });
}

export function sortHubCardsByUrgency(cards: GroupHubCardModel[]): GroupHubCardModel[] {
  const score = (c: GroupHubCardModel) => {
    if (c.health === "at_risk") return 0;
    if (c.pendingPeopleCount > 0) return 1;
    if (c.health === "slightly_behind") return 2;
    return 3;
  };
  return [...cards].sort((a, b) => score(a) - score(b) || a.title.localeCompare(b.title));
}

export function buildHubViewModel(data: GroupHome) {
  return {
    stats: buildHubOverviewStats(data),
    priorities: buildHubPriorityItems(data),
    cards: sortHubCardsByUrgency(buildHubCards(data)),
  };
}
