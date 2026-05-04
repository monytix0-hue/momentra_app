/**
 * Predefined savings goals for Personal (₹). Pick a template, then edit before creating.
 */

export const GOAL_TEMPLATE_CUSTOM = "__custom__";

export type GoalTemplate = {
  id: string;
  name: string;
  blurb: string;
  title: string;
  targetAmount: number;
  /** Default already saved toward the goal */
  savedAmount?: number;
  /** If set, target date = today + N calendar months; if omitted, date field left blank */
  targetDateMonthsFromNow?: number | null;
};

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: "emergency-3mo",
    name: "Emergency fund (3 mo expenses)",
    blurb: "Rough cushion for essentials—pair with your monthly budget to size this.",
    title: "Emergency fund",
    targetAmount: 120000,
    savedAmount: 0,
    targetDateMonthsFromNow: 12,
  },
  {
    id: "emergency-6mo",
    name: "Emergency fund (6 mo)",
    blurb: "Deeper runway; adjust target to match your real monthly burn.",
    title: "6-month emergency fund",
    targetAmount: 300000,
    savedAmount: 0,
    targetDateMonthsFromNow: 18,
  },
  {
    id: "vacation",
    name: "Vacation / trip",
    blurb: "Flights, stay, and spends—tweak for domestic vs international.",
    title: "Trip fund",
    targetAmount: 85000,
    savedAmount: 0,
    targetDateMonthsFromNow: 6,
  },
  {
    id: "vehicle-down",
    name: "Vehicle down payment",
    blurb: "Starter target for a two-wheeler or used car deposit.",
    title: "Vehicle down payment",
    targetAmount: 150000,
    savedAmount: 0,
    targetDateMonthsFromNow: 15,
  },
  {
    id: "home-down",
    name: "Home down payment (starter)",
    blurb: "First milestone toward a larger corpus—edit to your market and timeline.",
    title: "Home down payment",
    targetAmount: 800000,
    savedAmount: 0,
    targetDateMonthsFromNow: 36,
  },
  {
    id: "wedding",
    name: "Wedding / celebration",
    blurb: "Venue, attire, gifts—scale up or down freely.",
    title: "Wedding fund",
    targetAmount: 500000,
    savedAmount: 0,
    targetDateMonthsFromNow: 18,
  },
  {
    id: "education",
    name: "Course or certification",
    blurb: "Bootcamp, degree module, or professional cert fees.",
    title: "Education fund",
    targetAmount: 45000,
    savedAmount: 0,
    targetDateMonthsFromNow: 4,
  },
  {
    id: "gadget",
    name: "Laptop / phone upgrade",
    blurb: "Replace or upgrade a primary device.",
    title: "Tech upgrade fund",
    targetAmount: 80000,
    savedAmount: 0,
    targetDateMonthsFromNow: 6,
  },
  {
    id: "debt-payoff",
    name: "Debt payoff target",
    blurb: "Single-number payoff goal—set saved to what you’ve already cleared if tracking balance.",
    title: "Debt payoff",
    targetAmount: 200000,
    savedAmount: 0,
    targetDateMonthsFromNow: 12,
  },
  {
    id: "open-ended",
    name: "Open goal (no deadline)",
    blurb: "Target only—add a date later when you’re ready.",
    title: "Savings goal",
    targetAmount: 100000,
    savedAmount: 0,
    targetDateMonthsFromNow: null,
  },
];

export function isoDateMonthsFromNow(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function applyGoalTemplate(t: GoalTemplate): {
  title: string;
  target: string;
  saved: string;
  targetDate: string;
} {
  const saved = t.savedAmount ?? 0;
  let targetDate = "";
  if (t.targetDateMonthsFromNow != null && t.targetDateMonthsFromNow > 0) {
    targetDate = isoDateMonthsFromNow(t.targetDateMonthsFromNow);
  }
  return {
    title: t.title,
    target: String(t.targetAmount),
    saved: String(saved),
    targetDate,
  };
}
