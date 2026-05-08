export const BUDGET_TEMPLATE_CUSTOM = "__custom__";
export const SAVINGS_STYLE_CUSTOM = "__custom__";

export type BudgetTemplate = {
  id: string;
  label: string;
  positioning: string;
  momentTitle: string;
  lifestyleBudget: number;
};

export const BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: "student-campus",
    label: "Student / Campus",
    positioning: "Basic, controlled",
    momentTitle: "Student monthly plan",
    lifestyleBudget: 12000,
  },
  {
    id: "lean-living",
    label: "Lean Living",
    positioning: "Minimal lifestyle",
    momentTitle: "Lean living plan",
    lifestyleBudget: 18000,
  },
  {
    id: "essential-focus",
    label: "Essential Focus",
    positioning: "Needs-first",
    momentTitle: "Essential focus plan",
    lifestyleBudget: 35000,
  },
  {
    id: "metro-solo",
    label: "Metro Solo",
    positioning: "Urban independent",
    momentTitle: "Metro solo plan",
    lifestyleBudget: 52000,
  },
  {
    id: "two-earners",
    label: "Two Earners",
    positioning: "Shared lifestyle",
    momentTitle: "Two-earner household plan",
    lifestyleBudget: 78000,
  },
  {
    id: "family-living",
    label: "Family Living",
    positioning: "Full household",
    momentTitle: "Family living plan",
    lifestyleBudget: 115000,
  },
];

export type SavingsStyle = {
  id: string;
  label: string;
  behavior: string;
  minPct: number;
  maxPct: number;
};

export const SAVINGS_STYLES: SavingsStyle[] = [
  {
    id: "aggressive",
    label: "Aggressive Saver",
    behavior: "Growth focused",
    minPct: 20,
    maxPct: 30,
  },
  {
    id: "balanced",
    label: "Balanced Saver",
    behavior: "Stable",
    minPct: 10,
    maxPct: 15,
  },
  {
    id: "light",
    label: "Light Saver",
    behavior: "Flexible",
    minPct: 5,
    maxPct: 7,
  },
  {
    id: "spend-first",
    label: "Spend First",
    behavior: "Lifestyle heavy",
    minPct: 0,
    maxPct: 0,
  },
];

export function defaultCycleLabelForNow(): string {
  const d = new Date();
  return `${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`;
}

export function applyBudgetTemplate(
  t: BudgetTemplate,
): { momentTitle: string; lifestyleBudget: string; cycleLabel: string } {
  return {
    momentTitle: t.momentTitle,
    lifestyleBudget: String(t.lifestyleBudget),
    cycleLabel: defaultCycleLabelForNow(),
  };
}

export function suggestSavingsTarget(lifestyleBudget: number, style: SavingsStyle): number {
  if (lifestyleBudget <= 0) return 0;
  const pct = (style.minPct + style.maxPct) / 2;
  return Math.round((lifestyleBudget * pct) / 100);
}

export function savingsStyleHint(style: SavingsStyle): string {
  if (style.minPct === 0 && style.maxPct === 0) return "No target by default.";
  return `~${style.minPct}-${style.maxPct}% of your lifestyle budget.`;
}
