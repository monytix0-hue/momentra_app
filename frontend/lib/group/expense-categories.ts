/** Preset category slugs for group shared expenses (stored on `group_expenses.category`). */

export const GROUP_EXPENSE_CATEGORY_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "", label: "General" },
  { value: "food", label: "Food & dining" },
  { value: "groceries", label: "Groceries" },
  { value: "transport", label: "Transport" },
  { value: "travel", label: "Travel" },
  { value: "stay", label: "Stay & lodging" },
  { value: "entertainment", label: "Entertainment" },
  { value: "utilities", label: "Utilities" },
  { value: "health", label: "Health" },
  { value: "shopping", label: "Shopping" },
  { value: "other", label: "Other" },
] as const;

const LABEL_BY_SLUG: Record<string, string> = Object.fromEntries(
  GROUP_EXPENSE_CATEGORY_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]),
);

/** Display label for a stored category slug (or pass-through if unknown). */
export function labelGroupExpenseCategory(slug: string | null | undefined): string | null {
  const s = (slug || "").trim();
  if (!s) return null;
  return LABEL_BY_SLUG[s] ?? s;
}
