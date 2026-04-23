import type { GroupMomentDetail } from "@/lib/api/group";

/** Matches backend `_type_defaults` funding_model for a given `group_type` (wizard has no funding field). */
export function inferDefaultFundingModel(group_type: string): "pooled" | "split_expenses" | "hybrid" {
  const t = group_type.trim().toLowerCase();
  if (t === "trip" || t === "event") return "pooled";
  if (t === "roommates") return "split_expenses";
  if (t === "family" || t === "couple") return "pooled";
  return "hybrid";
}

export type ExpenseFormVariant = "full" | "pool_focus";

export type GroupUxProfile = {
  expenseFormVariant: ExpenseFormVariant;
  /** Overview: People section before the split/funding card */
  overviewPeopleFirst: boolean;
  overviewSplitTitle: string;
  /** Extra explainer under the split rule card; empty for full variant */
  overviewSplitHint: string;
  /** Primary button in header / expenses tab when opening the form */
  primaryExpenseCta: string;
  /** Intro line above the expense list / form toggle */
  expensesTabIntro: string;
  /** Plain-language line for wizard review step */
  wizardReviewMoneyLine: string;
};

export function getGroupUxProfile(input: { group_type: string; funding_model: string }): GroupUxProfile {
  const gt = input.group_type.trim().toLowerCase();
  const fm = input.funding_model.trim().toLowerCase();

  const poolFocus = fm === "pooled" && (gt === "family" || gt === "couple");

  if (poolFocus) {
    return {
      expenseFormVariant: "pool_focus",
      overviewPeopleFirst: true,
      overviewSplitTitle: "Default split for expenses",
      overviewSplitHint:
        "Moment budget is the pool target. Planned commitments are expected shares into the pool; each expense also carries splits (each person’s share of that bill).",
      primaryExpenseCta: "Record spend",
      expensesTabIntro:
        "Log spending from the shared pot. Each expense is split across participants (equal by default); that split is separate from planned pool commitments.",
      wizardReviewMoneyLine:
        "Pooled funding with a monthly rhythm. The API defaults new expenses to equal splits; you can adjust per expense.",
    };
  }

  if (fm === "split_expenses") {
    return {
      expenseFormVariant: "full",
      overviewPeopleFirst: false,
      overviewSplitTitle: "Split rule",
      overviewSplitHint:
        "Defaults apply to new expenses. Use custom or % when rent and bills don’t divide evenly.",
      primaryExpenseCta: "Add expense",
      expensesTabIntro:
        "Add shared costs: each expense is split across participants (who owes what for that bill). That’s distinct from any optional pool planned commitments.",
      wizardReviewMoneyLine:
        "Split-expense style: good for rent, utilities, and itemized bills—with full control per expense.",
    };
  }

  if (fm === "pooled" && (gt === "trip" || gt === "event")) {
    return {
      expenseFormVariant: "full",
      overviewPeopleFirst: false,
      overviewSplitTitle: "Split rule",
      overviewSplitHint:
        "Trips and one-off events often need custom or % splits; equal is the default.",
      primaryExpenseCta: "Add expense",
      expensesTabIntro:
        "Add trip or event costs: each line item is split across participants. The moment budget is the pool target; planned commitments are expected contributions into the pool.",
      wizardReviewMoneyLine:
        "Moment budget for the trip or event—split each expense equally, by amount, or by percent.",
    };
  }

  return {
    expenseFormVariant: "full",
    overviewPeopleFirst: false,
    overviewSplitTitle: "Split rule",
    overviewSplitHint: "",
    primaryExpenseCta: "Add expense",
    expensesTabIntro:
      "Add shared costs with per-expense splits. Optional pool + moment budget uses planned commitments; expense splits allocate each bill.",
    wizardReviewMoneyLine:
      "Hybrid setup: optional pool plus flexible expense splits as you go.",
  };
}

export function getGroupUxProfileFromDetail(detail: GroupMomentDetail): GroupUxProfile {
  return getGroupUxProfile({
    group_type: detail.group_type,
    funding_model: detail.funding_model,
  });
}
