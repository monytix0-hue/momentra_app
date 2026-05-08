/**
 * Maps API `spend_type` on business_spends to first-class UI concepts.
 * Purchase (stock / raw material) uses spend_type "inventory"; everything else is treated as Expense for UX.
 */
export const PURCHASE_SPEND_TYPE = "inventory" as const;

export function isPurchaseSpendType(spendType: string | null | undefined): boolean {
  return (spendType ?? "").toLowerCase() === PURCHASE_SPEND_TYPE;
}

export type UiTransactionKind = "sale" | "purchase" | "expense" | "payment" | "collection" | "other";

export function spendToUiKind(
  spendType: string,
  status: string,
): Exclude<UiTransactionKind, "sale" | "collection"> | "other" {
  if (status === "rejected") return "other";
  if (isPurchaseSpendType(spendType)) return "purchase";
  return "expense";
}

/** Payables / queue line for Indian SMB copy */
export function payableContextLine(spendType: string): string {
  if (isPurchaseSpendType(spendType)) return "Purchase — needs your OK";
  return "Expense — needs your OK";
}

export function transactionKindLabel(kind: UiTransactionKind): string {
  switch (kind) {
    case "sale":
      return "Sale";
    case "purchase":
      return "Purchase";
    case "expense":
      return "Expense";
    case "payment":
      return "Payment";
    case "collection":
      return "Collection";
    default:
      return "Update";
  }
}

/**
 * Human label for API `spend_type` everywhere we show it (lists, meta, insights).
 * Never surface raw `inventory` — that reads like storage, not "purchase".
 */
export function spendTypeDetailLabel(spendType: string | null | undefined): string {
  const t = (spendType ?? "").trim().toLowerCase();
  if (!t) return "—";
  if (isPurchaseSpendType(t)) return "Purchase";
  if (t === "operational") return "Expense";
  const labels: Record<string, string> = {
    utilities: "Utilities",
    marketing: "Marketing",
    logistics: "Logistics",
    maintenance: "Maintenance",
    payroll: "Payroll",
    compliance: "Compliance",
  };
  return labels[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
