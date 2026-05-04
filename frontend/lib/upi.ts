/**
 * UPI deep link utilities for group expense settlement.
 * 
 * UPI URI scheme: upi://pay?pa=payee@upi&pn=PayeeName&am=amount&tn=note&cu=INR
 * GPay: tez://upi/pay?...
 * PhonePe: phonepe://pay?...
 * Paytm: paytmmp://pay?...
 * 
 * Fallback: Open upi://pay which the OS routes to the default UPI app.
 */

export type UpiPayParams = {
  /** VPA (Virtual Payment Address) e.g. "name@upi" */
  pa: string;
  /** Payee name */
  pn?: string;
  /** Amount in INR (without currency symbol) */
  am: string | number;
  /** Transaction note */
  tn?: string;
  /** Currency (default: INR) */
  cu?: string;
};

/**
 * Build a UPI deep link string for the standard `upi://pay` scheme.
 * This will open the user's default UPI app (GPay, PhonePe, Paytm, etc.)
 */
export function buildUpiDeepLink(params: UpiPayParams): string {
  const q = new URLSearchParams();
  q.set("pa", params.pa);
  if (params.pn) q.set("pn", params.pn);
  q.set("am", String(params.am));
  if (params.tn) q.set("tn", params.tn);
  q.set("cu", params.cu || "INR");
  return `upi://pay?${q.toString()}`;
}

/**
 * Build GPay-specific deep link for Android.
 * This opens GPay directly with pre-filled details.
 */
export function buildGpayDeepLink(params: UpiPayParams): string {
  const q = new URLSearchParams();
  q.set("pa", params.pa);
  if (params.pn) q.set("pn", params.pn);
  q.set("am", String(params.am));
  if (params.tn) q.set("tn", params.tn);
  q.set("cu", params.cu || "INR");
  return `tez://upi/pay?${q.toString()}`;
}

/**
 * Open UPI payment for a settlement instruction.
 * Returns the UPI deep link — the caller should open it (window.open / <a> / router).
 */
export function getSettlementUpiLink(params: {
  fromName: string;
  toName: string;
  toVpa?: string | null;
  amount: string | number;
  groupName?: string;
}): string | null {
  const vpa = params.toVpa || `${params.toName.toLowerCase().replace(/\s+/g, "")}@upi`;
  return buildUpiDeepLink({
    pa: vpa,
    pn: params.toName,
    am: params.amount,
    tn: params.groupName
      ? `Settlement for ${params.groupName}`
      : `Expense settlement from ${params.fromName}`,
  });
}
