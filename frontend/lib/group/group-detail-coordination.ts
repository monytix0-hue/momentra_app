import type { GroupCommitment, GroupMomentDetail } from "@/lib/api/group";

function n(v: string | number | null | undefined): number {
  if (v == null || v === "") return NaN;
  const x = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(x) ? x : NaN;
}

export type CoordHealth = "ON_TRACK" | "SLIGHTLY_BEHIND" | "NEEDS_ATTENTION";

export function effectivePoolTarget(detail: GroupMomentDetail): number | null {
  const ac = detail.active_cycle;
  if (ac) {
    const t = n(ac.target_amount);
    if (Number.isFinite(t) && t > 0) return t;
  }
  const gt = detail.target_amount;
  if (gt != null && gt !== "") {
    const t = n(gt);
    if (Number.isFinite(t) && t > 0) return t;
  }
  return null;
}

export function effectiveCollected(detail: GroupMomentDetail): number {
  const ac = detail.active_cycle;
  if (ac) return n(ac.collected_amount) || 0;
  return n(detail.summary.collected_amount) || 0;
}

export function poolProgressPct(detail: GroupMomentDetail): number | null {
  const target = effectivePoolTarget(detail);
  if (target == null || target <= 0) return null;
  const collected = effectiveCollected(detail);
  return Math.min(100, Math.round((collected / target) * 1000) / 10);
}

export function daysLeftInCycle(endDateIso: string | null | undefined): number | null {
  if (!endDateIso?.trim()) return null;
  const end = new Date(`${endDateIso}T12:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const ms = end.getTime() - today.getTime();
  return Math.ceil(ms / 86400000);
}

export function commitmentsForScope(
  commitments: GroupCommitment[],
  activeCycleId: string | null,
): GroupCommitment[] {
  if (!activeCycleId) return commitments;
  return commitments.filter((c) => !c.cycle_id || c.cycle_id === activeCycleId);
}

export type ParticipantRollup = {
  participantId: string;
  committed: number;
  paid: number;
  remaining: number;
  statusWorst: string;
  dueDate: string | null;
  primaryCommitment: GroupCommitment | null;
};

export function rollupsByParticipant(
  commitments: GroupCommitment[],
  participantIds: string[],
): Map<string, ParticipantRollup> {
  const m = new Map<string, ParticipantRollup>();
  for (const pid of participantIds) {
    m.set(pid, {
      participantId: pid,
      committed: 0,
      paid: 0,
      remaining: 0,
      statusWorst: "fulfilled",
      dueDate: null,
      primaryCommitment: null,
    });
  }
  const rank: Record<string, number> = { overdue: 3, pending: 2, partial: 2, fulfilled: 0, unknown: 0 };
  for (const c of commitments) {
    const pid = c.participant_id;
    if (!m.has(pid)) continue;
    const cur = m.get(pid)!;
    const com = n(c.committed_amount);
    const pd = n(c.paid_amount);
    cur.committed += com;
    cur.paid += pd;
    cur.remaining += Math.max(0, com - pd);
    const st = (c.status || "").toLowerCase();
    const rk = rank[st] ?? 0;
    const prevRk = rank[cur.statusWorst] ?? 0;
    if (rk > prevRk) cur.statusWorst = st;
    if (c.due_date && cur.remaining > 0.01) {
      if (!cur.dueDate || c.due_date < cur.dueDate) cur.dueDate = c.due_date;
    }
    if (com - pd > 0.01) {
      const curOver = st === "overdue";
      if (!cur.primaryCommitment) {
        cur.primaryCommitment = c;
      } else {
        const prev = cur.primaryCommitment;
        const prevOver = (prev.status || "").toLowerCase() === "overdue";
        if (curOver && !prevOver) cur.primaryCommitment = c;
      }
    }
  }
  for (const cur of m.values()) {
    if (!cur.primaryCommitment) {
      const open = commitments.find(
        (c) => c.participant_id === cur.participantId && n(c.committed_amount) > n(c.paid_amount),
      );
      if (open) cur.primaryCommitment = open;
    }
  }
  return m;
}

export function coordinationHealth(detail: GroupMomentDetail, scopedCommitments: GroupCommitment[]): CoordHealth {
  const s = detail.summary;
  const overdue = s.overdue_commitment_count;
  const pending = s.pending_commitment_count;
  const debt = n(detail.summary.open_share_debt);
  const openCommitments = scopedCommitments.filter((c) => n(c.committed_amount) > n(c.paid_amount)).length;
  const pct = poolProgressPct(detail);

  if (overdue > 0 || (openCommitments >= 3 && pending > 0)) return "NEEDS_ATTENTION";
  if (
    overdue === 0 &&
    pending === 0 &&
    openCommitments === 0 &&
    debt <= 0.01 &&
    (pct == null || pct >= 85)
  ) {
    return "ON_TRACK";
  }
  return "SLIGHTLY_BEHIND";
}

export function summaryInterpretation(detail: GroupMomentDetail, scopedCommitments: GroupCommitment[]): string {
  const s = detail.summary;
  const target = effectivePoolTarget(detail);
  const collected = effectiveCollected(detail);
  const left = target != null ? Math.max(0, target - collected) : null;

  const distinctPending = new Set(
    scopedCommitments.filter((c) => n(c.committed_amount) > n(c.paid_amount)).map((c) => c.participant_id),
  ).size;

  if (s.overdue_commitment_count > 0) {
    return `${s.overdue_commitment_count} commitment${s.overdue_commitment_count === 1 ? "" : "s"} overdue — nudge or record payments.`;
  }
  if (distinctPending === 1) {
    return "1 person still needs to contribute.";
  }
  if (distinctPending > 1) {
    return `${distinctPending} people still have balance open.`;
  }
  if (left != null && left > 0.01 && detail.funding_model === "pooled") {
    return `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(left)} still to be pooled.`;
  }
  if (n(s.open_share_debt) > 0.01) {
    return "Some expense shares are still open — settle up when you can.";
  }
  return "Everyone is caught up on tracked commitments.";
}

export function healthLabel(h: CoordHealth): string {
  if (h === "NEEDS_ATTENTION") return "Needs attention";
  if (h === "SLIGHTLY_BEHIND") return "Slightly behind";
  return "On track";
}

export function healthBadgeClass(h: CoordHealth): string {
  if (h === "NEEDS_ATTENTION") return "border-urgency-high/45 text-urgency-high bg-urgency-high/[0.08]";
  if (h === "SLIGHTLY_BEHIND") return "border-urgency-medium/45 text-urgency-medium bg-urgency-medium/[0.08]";
  return "border-urgency-clear-value/40 text-urgency-clear-value bg-urgency-clear-value/[0.08]";
}

export function pendingInActiveCycle(
  detail: GroupMomentDetail,
  scopedCommitments: GroupCommitment[],
): number {
  return scopedCommitments.filter((c) => n(c.committed_amount) > n(c.paid_amount)).length;
}

/** Short UI line explaining how this commitment row was created (Momentra lifecycle). */
export function commitmentSourceCaption(source: string | undefined | null): string | null {
  const s = (source || "").toLowerCase();
  if (s === "auto_seeded") return "Planned share from moment budget (equal split)";
  if (s === "admin_set") return "Planned share set by admin";
  if (s === "expense_split") return "Share from an expense split";
  if (s === "participant_set") return "Share set by participant";
  return null;
}
