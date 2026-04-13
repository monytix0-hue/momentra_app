/** Shared format helpers for Business console UI. */

import type { BusinessHealthTone } from "@/lib/business/types";

export function bizNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export function bizMoney(n: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function shortUserId(id: string): string {
  if (!id) return "—";
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export function formatBizDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function formatBizDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function healthToneClasses(tone: BusinessHealthTone): { ring: string; text: string; bg: string } {
  if (tone === "safe") {
    return {
      ring: "ring-emerald-500/25",
      text: "text-emerald-800",
      bg: "bg-emerald-500/10",
    };
  }
  if (tone === "watch") {
    return {
      ring: "ring-amber-500/30",
      text: "text-amber-900",
      bg: "bg-amber-500/10",
    };
  }
  return {
    ring: "ring-rose-500/30",
    text: "text-rose-900",
    bg: "bg-rose-500/10",
  };
}
