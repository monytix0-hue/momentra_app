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
        "Logged expenses use this default (usually equal across members). Commitments track who pays into the pool; shares show each person’s portion of a line item.",
      primaryExpenseCta: "Record spend",
      expensesTabIntro:
        "Log spending from the shared pot. New entries split equally by default—you can open custom or % splits if you need them.",
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
        "Add shared costs for this group. Splits are recorded separately from commitments.",
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
        "Add shared costs for this group. Splits are recorded separately from commitments.",
      wizardReviewMoneyLine:
        "Pooled target for the trip or event—split each expense equally, by amount, or by percent.",
    };
  }

  return {
    expenseFormVariant: "full",
    overviewPeopleFirst: false,
    overviewSplitTitle: "Split rule",
    overviewSplitHint: "",
    primaryExpenseCta: "Add expense",
    expensesTabIntro:
      "Add shared costs for this group. Splits are recorded separately from commitments.",
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
