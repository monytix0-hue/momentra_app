/**
 * Predefined monthly budget setups for Personal quick setup (₹).
 * Users pick one to pre-fill the form, then edit any field before creating.
 */

export const BUDGET_TEMPLATE_CUSTOM = "__custom__";

export type BudgetTemplate = {
  id: string;
  name: string;
  blurb: string;
  momentTitle: string;
  /** Suggested monthly envelope; user can change before submit */
  allocatedBudget: number;
};

export const BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: "starter-lean",
    name: "Lean month",
    blurb: "Bare essentials — tight control, good for debt payoff or saving sprints.",
    momentTitle: "Lean month budget",
    allocatedBudget: 18000,
  },
  {
    id: "essentials",
    name: "Essentials focus",
    blurb: "Rent, utilities, groceries, transport — typical solo essentials band.",
    momentTitle: "Essentials budget",
    allocatedBudget: 35000,
  },
  {
    id: "metro-single",
    name: "Metro · solo",
    blurb: "Higher cost-of-living city, one person, modest discretionary room.",
    momentTitle: "Metro solo budget",
    allocatedBudget: 52000,
  },
  {
    id: "duo",
    name: "Two earners / couple",
    blurb: "Shared household — dining and discretionary included at a moderate level.",
    momentTitle: "Household budget (2)",
    allocatedBudget: 78000,
  },
  {
    id: "family",
    name: "Family (with kids)",
    blurb: "School, activities, larger grocery + home — adjust to your city tier.",
    momentTitle: "Family monthly budget",
    allocatedBudget: 115000,
  },
  {
    id: "student",
    name: "Student / campus",
    blurb: "Low fixed costs; food, transit, small discretionary.",
    momentTitle: "Student budget",
    allocatedBudget: 12000,
  },
  {
    id: "high-savings",
    name: "Aggressive savings",
    blurb: "Minimal spend cap to maximize invest / emergency fund.",
    momentTitle: "High savings cap",
    allocatedBudget: 25000,
  },
];

export function defaultCycleLabelForNow(): string {
  const d = new Date();
  return `${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`;
}

export function applyBudgetTemplate(
  t: BudgetTemplate,
): { momentTitle: string; allocated: string; cycleLabel: string } {
  return {
    momentTitle: t.momentTitle,
    allocated: String(t.allocatedBudget),
    cycleLabel: defaultCycleLabelForNow(),
  };
}
