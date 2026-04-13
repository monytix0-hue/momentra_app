import type { PersonalTxnCategory } from "@/lib/api/personal";

/**
 * Fallback when `/personal/transaction-categories` is unavailable.
 * Slugs align with `personal_transaction_categories` in SQL.
 */
export const GROUP_EXPENSE_CATEGORY_FALLBACK_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "", label: "General" },
  { value: "food", label: "Food & dining" },
  { value: "transport", label: "Transport" },
  { value: "shopping", label: "Shopping" },
  { value: "bills", label: "Bills & utilities" },
  { value: "health", label: "Health & fitness" },
  { value: "entertainment", label: "Entertainment" },
  { value: "travel", label: "Travel" },
  { value: "education", label: "Education" },
  { value: "transfers", label: "Transfers & fees" },
  { value: "other", label: "Other" },
] as const;

const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  groceries: "Groceries",
  stay: "Stay & lodging",
  utilities: "Utilities",
};

const LABEL_BY_SLUG: Record<string, string> = {
  ...Object.fromEntries(
    GROUP_EXPENSE_CATEGORY_FALLBACK_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]),
  ),
  ...LEGACY_CATEGORY_LABELS,
};

/** Display label for a stored category slug (or pass-through if unknown). */
export function labelGroupExpenseCategory(slug: string | null | undefined): string | null {
  const s = (slug || "").trim();
  if (!s) return null;
  return LABEL_BY_SLUG[s] ?? s;
}

/** Map API taxonomy + sub-slug to the human label stored on `group_expenses.subcategory`. */
export function resolveTxnSubcategoryLabel(
  tree: PersonalTxnCategory[] | null | undefined,
  categorySlug: string,
  subcategorySlug: string,
): string | null {
  const sub = (subcategorySlug || "").trim();
  if (!sub) return null;
  const cat = tree?.find((c) => c.slug === categorySlug);
  const row = cat?.subcategories.find((s) => s.slug === sub);
  return row?.label ?? null;
}

export function categoryOptionsFromTree(
  tree: PersonalTxnCategory[] | null | undefined,
): { value: string; label: string }[] {
  if (Array.isArray(tree) && tree.length > 0) {
    return [{ value: "", label: "General" }, ...tree.map((c) => ({ value: c.slug, label: c.label }))];
  }
  return [...GROUP_EXPENSE_CATEGORY_FALLBACK_OPTIONS];
}
