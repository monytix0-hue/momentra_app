import type {
  PersonalBudget,
  PersonalSummary,
  PersonalTransaction,
  SpendBreakdown,
} from "@/lib/api/personal";

function n(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  const x = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(x) ? x : 0;
}

export function localTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** Month string YYYY-MM for "now" in local time. */
export function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type TodaySnapshot = {
  spent: number;
  topCategory: string | null;
  topCategoryAmount: number;
  lastTransaction: PersonalTransaction | null;
};

export function computeTodaySnapshot(transactions: PersonalTransaction[]): TodaySnapshot {
  const today = localTodayIso();
  const todays = transactions.filter((t) => t.transaction_date.slice(0, 10) === today);
  const spent = todays.reduce((a, t) => a + n(t.amount), 0);
  const byCat = new Map<string, number>();
  for (const t of todays) {
    const label = [t.category, t.subcategory].filter(Boolean).join(" › ") || "Uncategorized";
    byCat.set(label, (byCat.get(label) ?? 0) + n(t.amount));
  }
  let topCategory: string | null = null;
  let topCategoryAmount = 0;
  for (const [label, amt] of byCat) {
    if (amt > topCategoryAmount) {
      topCategory = label;
      topCategoryAmount = amt;
    }
  }
  const sorted = [...transactions].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  const lastTransaction = sorted[0] ?? null;
  return { spent, topCategory, topCategoryAmount, lastTransaction };
}

export type PaceInsight = {
  expectedSoFar: number;
  actualSoFar: number;
  diff: number;
  status: "on_track" | "over_pace" | "under";
  dayOfMonth: number;
  daysInMonth: number;
};

export function computeMonthlyPace(
  summary: PersonalSummary | null,
  txMonth: string,
): PaceInsight | null {
  if (!summary) return null;
  const allocated = n(summary.planned_monthly_envelope ?? summary.total_allocated);
  if (allocated <= 0) return null;
  const now = new Date();
  const effectiveMonth = txMonth.trim() || currentMonthStr();
  const [y, m] = effectiveMonth.split("-").map(Number);
  if (!y || !m) return null;
  const dim = daysInMonth(y, m);
  const isCurrentMonth = effectiveMonth === currentMonthStr();
  const dom = isCurrentMonth ? now.getDate() : dim;
  const expectedSoFar = (allocated * dom) / dim;
  const actualSoFar = n(summary.total_spent_period);
  const diff = actualSoFar - expectedSoFar;
  const ratio = expectedSoFar > 0 ? actualSoFar / expectedSoFar : 1;
  let status: PaceInsight["status"] = "on_track";
  if (ratio > 1.12) status = "over_pace";
  else if (ratio < 0.82 && dom > 3) status = "under";
  return {
    expectedSoFar,
    actualSoFar,
    diff,
    status,
    dayOfMonth: dom,
    daysInMonth: dim,
  };
}

export function moneyLeftStory(spendPct: number, moneyLeft: number): string {
  if (moneyLeft < 0) return "Plan exceeded — tighten spending or adjust your monthly intent.";
  if (spendPct < 25) return "You’re well within your monthly plan.";
  if (spendPct < 55) return "Smooth pace so far — healthy plan utilization.";
  if (spendPct < 80) return "Past halfway — keep discretionary categories in check.";
  if (spendPct < 95) return "Plan usage is high for this point in the month.";
  return "Close to full plan usage — spend intentionally for the rest of this cycle.";
}

export function weekSpendComparison(transactions: PersonalTransaction[], monthFilter: string): {
  thisWeek: number;
  prevWeek: number;
  higher: boolean;
} | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(now);
  const startThis = new Date(now);
  startThis.setDate(startThis.getDate() - 6);
  const startPrev = new Date(startThis);
  startPrev.setDate(startPrev.getDate() - 7);
  const endPrev = new Date(startThis);
  endPrev.setDate(endPrev.getDate() - 1);

  const inRange = (iso: string, a: Date, b: Date) => {
    const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
    return d >= a && d <= b;
  };

  let thisWeek = 0;
  let prevWeek = 0;
  for (const t of transactions) {
    const dStr = t.transaction_date.slice(0, 10);
    if (monthFilter && !dStr.startsWith(monthFilter)) continue;
    if (inRange(t.transaction_date, startThis, end)) thisWeek += n(t.amount);
    if (inRange(t.transaction_date, startPrev, endPrev)) prevWeek += n(t.amount);
  }
  if (prevWeek <= 0 && thisWeek <= 0) return null;
  return { thisWeek, prevWeek, higher: thisWeek > prevWeek * 1.15 && prevWeek > 0 };
}

export type TriggerBarResult = {
  message: string;
  severity: "calm" | "info" | "warn";
  cta?: string;
};

export function buildPersonalTrigger(input: {
  summary: PersonalSummary | null;
  today: TodaySnapshot;
  pace: PaceInsight | null;
  weekCmp: ReturnType<typeof weekSpendComparison>;
  breakdown: SpendBreakdown | null;
  budgets: PersonalBudget[];
}): TriggerBarResult {
  const { summary, today, pace, weekCmp, breakdown, budgets } = input;

  const highSig = summary?.recent_signals?.find((s) => (s.severity || "").toLowerCase() === "high");
  if (highSig?.message) {
    return { message: highSig.message, severity: "warn", cta: "Review" };
  }

  const nearBudget = budgets.find((b) => {
    const cap = n(b.allocated_amount);
    const sp = n(b.spent_amount);
    return cap > 0 && sp / cap >= 0.85;
  });
  if (nearBudget) {
    const label = nearBudget.subcategory
      ? `${nearBudget.category} › ${nearBudget.subcategory}`
      : nearBudget.category;
    return {
      message: `${label} is nearing its cap — check before you spend more.`,
      severity: "warn",
    };
  }

  if (today.spent > 0 && today.topCategory) {
    return {
      message: `You spent ${formatInr(today.spent)} on ${today.topCategory} today.`,
      severity: "info",
    };
  }

  if (weekCmp?.higher) {
    return {
      message: "Spending is higher than usual this week — worth a quick ledger scan.",
      severity: "info",
    };
  }

  if (pace?.status === "over_pace") {
    return {
      message: "You’re ahead of the smooth monthly pace — ease up or adjust the plan.",
      severity: "warn",
    };
  }

  if (summary?.insights?.[0]) {
    return { message: summary.insights[0], severity: "info" };
  }

  if (breakdown?.rows?.length) {
    const tot = n(breakdown.total) || 1;
    const top = breakdown.rows[0];
    const share = Math.round((n(top.amount) / tot) * 100);
    if (share >= 45) {
      return {
        message: `${top.label} is ${share}% of this period’s spend — dominant category.`,
        severity: "info",
      };
    }
  }

  if (pace?.status === "under" && pace.dayOfMonth > 7) {
    return {
      message: "You’re under the smooth spending line — room for planned purchases or savings.",
      severity: "calm",
    };
  }

  return {
    message: "You’re on track this month — log spends to keep insights sharp.",
    severity: "calm",
  };
}

export function formatInr(v: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
}

export function categoryRiskLine(breakdown: SpendBreakdown | null): string | null {
  if (!breakdown?.rows.length) return null;
  const tot = n(breakdown.total);
  if (tot <= 0) return null;
  const top = breakdown.rows[0];
  const pct = Math.round((n(top.amount) / tot) * 100);
  if (pct < 35) return null;
  return `${top.label} is ${pct}% of spend this period — watch if that’s intentional.`;
}

export function goalEncouragement(saved: number, target: number, targetDate: string | null): string {
  if (target <= 0) return "Set a clear target to unlock pacing hints.";
  const pct = Math.min(100, (saved / target) * 100);
  if (pct >= 100) return "You did it — time to celebrate or set the next milestone.";
  if (pct >= 75) return "Final stretch — a small bump gets you across the line.";
  if (pct >= 40) return "Solid momentum — consistency beats perfection.";
  if (targetDate) {
    const end = new Date(`${targetDate}T12:00:00`);
    const days = (end.getTime() - Date.now()) / 86400000;
    if (days > 0 && days < 45) return `${Math.ceil(days)} days left — every deposit counts.`;
  }
  return "Small, regular saves add up faster than you think.";
}

/** Lightweight feedback after logging a transaction. */
export function txnAddFeedback(
  spendPct: number,
  categoryLabel: string | null,
  budgets: PersonalBudget[],
  categoryId: string | null,
  subcategoryId: string | null,
): string {
  if (spendPct >= 92) return "Logged. Budget is tight — next spends should be intentional.";
  const match = budgets.find(
    (b) =>
      (subcategoryId && b.subcategory_id === subcategoryId) || (categoryId && b.category_id === categoryId),
  );
  if (match) {
    const cap = n(match.allocated_amount);
    const sp = n(match.spent_amount);
    if (cap > 0 && sp / cap >= 0.8) {
      const lab = match.subcategory ? `${match.category} › ${match.subcategory}` : match.category;
      return `Logged. ${lab} is nearing its limit.`;
    }
  }
  if (spendPct < 70) return "Still on track — nice discipline.";
  return `Logged${categoryLabel ? ` under ${categoryLabel}` : ""}.`;
}
