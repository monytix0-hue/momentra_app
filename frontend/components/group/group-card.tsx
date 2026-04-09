import Link from "next/link";
import type { GroupMomentSummary } from "@/lib/api/group";

function num(v: string | number | null | undefined) {
  if (v == null || v === "") return NaN;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : NaN;
}

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function statusTone(s: string) {
  if (s === "active") return "border-urgency-clear-value/35 bg-bg2 text-urgency-clear-value";
  if (s === "draft") return "border-surface-300 bg-bg2 text-ink-4";
  return "border-surface-300 bg-bg2 text-ink-3";
}

function typeTone() {
  return "border-ctx-border/40 bg-ctx-tab-bg text-ctx-text";
}

export function GroupCard({ g }: { g: GroupMomentSummary }) {
  const target = num(g.target_amount);
  const hasTarget = Number.isFinite(target) && target > 0;

  return (
    <Link
      href={`/group/${g.group_id}`}
      className="group block rounded-m-card border border-surface-300 bg-surface-100 px-m-4 py-m-4 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_12%,transparent)] transition-[border-color,box-shadow,transform] duration-fast ease-standard hover:border-ctx-accent/45 hover:shadow-[0_0_20px_-10px_var(--ctx-accent),inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_18%,transparent)] active:scale-[0.99]"
    >
      <div className="mb-m-3 flex flex-wrap items-center gap-m-2">
        <span
          className={`rounded-m-cta border px-m-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${typeTone()}`}
        >
          {g.group_type.replace(/_/g, " ")}
        </span>
        <span
          className={`rounded-m-cta border px-m-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${statusTone(g.status)}`}
        >
          {g.status}
        </span>
      </div>
      <p className="truncate font-semibold text-ctx-text">{g.title}</p>
      <p className="mt-1 text-[12px] text-ink-2">
        <span className="capitalize text-ctx-accent/90">{g.duration_type.replace(/_/g, " ")}</span>
        <span className="text-ink-4"> · </span>
        <span className="capitalize">{g.funding_model}</span>
      </p>
      {hasTarget ? (
        <p className="mt-m-3 text-[12px] tabular-nums text-ink-2">
          <span className="text-ink-4">Target </span>
          <span className="font-medium text-ctx-text">{money(target)}</span>
        </p>
      ) : null}
    </Link>
  );
}
