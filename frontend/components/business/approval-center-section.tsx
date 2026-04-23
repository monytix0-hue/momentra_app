"use client";

import { useState } from "react";
import type { BusinessSpend } from "@/lib/api/business";
import { bizMoney, bizNum, formatBizDate, shortUserId } from "@/lib/business/format";
import { isPurchaseSpendType, spendTypeDetailLabel } from "@/lib/business/transaction-kinds";

function PendingApprovalCard({
  spend,
  unitLabel,
  costCenterLabel,
  vendorLabel,
  currency,
  onApprove,
  onReject,
  disabled,
}: {
  spend: BusinessSpend;
  unitLabel: string;
  costCenterLabel: string;
  vendorLabel: string | null;
  currency: string;
  onApprove: () => void;
  onReject: () => void;
  disabled: boolean;
}) {
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <article className="overflow-hidden rounded-m-card border border-[color-mix(in_srgb,var(--u-med)_32%,var(--s300))] bg-gradient-to-b from-[color-mix(in_srgb,var(--pend-bg)_35%,var(--s100))] to-bg2 shadow-[inset_0_1px_0_0_rgba(245,158,11,0.08),0_12px_40px_-24px_rgba(0,0,0,0.55)] transition-all duration-300 hover:border-[color-mix(in_srgb,var(--ctx-accent)_40%,var(--s300))]">
      <div className="flex flex-col gap-m-3 p-m-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-m-chip border border-status-pending-fg/40 bg-status-pending-fg/15 px-m-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-status-pending-fg">
              Pending
            </span>
            <span className="text-[18px] font-semibold text-ink">{bizMoney(bizNum(spend.amount), currency)}</span>
          </div>
          <h3 className="mt-2 text-[15px] font-semibold leading-snug text-ink">{spend.title}</h3>
          <div className="mt-m-2 flex flex-wrap gap-x-m-3 gap-y-1 text-[12px] text-ink-3">
            <span
              className={
                isPurchaseSpendType(spend.spend_type) ? "font-semibold text-teal-900/85" : "font-semibold text-rose-900/80"
              }
            >
              {spendTypeDetailLabel(spend.spend_type)}
            </span>
            <span className="text-ink-4">·</span>
            <span>{unitLabel}</span>
            {costCenterLabel !== "—" ? (
              <>
                <span className="text-ink-4">·</span>
                <span>{costCenterLabel}</span>
              </>
            ) : null}
            {vendorLabel ? (
              <>
                <span className="text-ink-4">·</span>
                <span>{vendorLabel}</span>
              </>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] text-ink-4">
            Submitted by <span className="font-medium text-ink-3">{shortUserId(spend.submitted_by)}</span>
            {spend.submitted_at ? (
              <>
                {" "}
                · <time dateTime={spend.submitted_at}>{formatBizDate(spend.submitted_at)}</time>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => void onApprove()}
              className="inline-flex min-h-[38px] items-center justify-center rounded-m-chip bg-gradient-to-br from-urgency-clear-value to-emerald-600 px-m-4 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_24px_-10px_rgba(16,185,129,0.5)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void onReject()}
              className="inline-flex min-h-[38px] items-center justify-center rounded-m-chip border-2 border-urgency-high/50 bg-urgency-high/10 px-m-4 text-[10px] font-bold uppercase tracking-[0.12em] text-urgency-high transition-colors hover:bg-urgency-high/20 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
          <button
            type="button"
            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent underline-offset-2 hover:underline"
            onClick={() => setDetailOpen((o) => !o)}
          >
            {detailOpen ? "Hide details" : "View details"}
          </button>
        </div>
      </div>
      {detailOpen ? (
        <div className="border-t border-surface-300/60 bg-surface-200/30 px-m-4 py-m-3 text-[12px] text-ink-3">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.1em] text-ink-4">Spend id</dt>
              <dd className="mt-0.5 font-mono text-[11px] text-ink-2">{spend.spend_id}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.1em] text-ink-4">Line math</dt>
              <dd className="mt-0.5 text-ink-2">
                {spend.quantity != null && spend.price_per_unit != null
                  ? `${bizNum(spend.quantity)} × ${bizMoney(bizNum(spend.price_per_unit), currency)}${spend.measurement_unit ? ` ${spend.measurement_unit}` : ""}`
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </article>
  );
}

export function ApprovalCenterSection({
  pending,
  units,
  costCenters,
  vendors,
  currency,
  onApprove,
  onReject,
  disabled,
  onOpenAdvancedModal,
}: {
  pending: BusinessSpend[];
  units: { unit_id: string; name: string }[];
  costCenters: { cost_center_id: string; name: string }[];
  vendors: { vendor_id: string; name: string }[];
  currency: string;
  onApprove: (spendId: string) => void | Promise<void>;
  onReject: (spendId: string) => void | Promise<void>;
  disabled?: boolean;
  onOpenAdvancedModal?: () => void;
}) {
  const unitMap = Object.fromEntries(units.map((u) => [u.unit_id, u.name]));
  const ccMap = Object.fromEntries(costCenters.map((c) => [c.cost_center_id, c.name]));
  const vnMap = Object.fromEntries(vendors.map((v) => [v.vendor_id, v.name]));

  return (
    <section id="business-section-approvals" className="scroll-mt-24 space-y-m-3">
      <div className="flex flex-wrap items-end justify-between gap-m-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ctx-accent">Approval center</p>
          <h2 className="mt-1 text-[18px] font-semibold text-ink">What needs a decision</h2>
          <p className="mt-1 text-[13px] text-ink-3">Action-first queue — everything here blocks downstream spend.</p>
        </div>
        {onOpenAdvancedModal ? (
          <button
            type="button"
            className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:border-ctx-accent/40 hover:bg-surface-200"
            onClick={onOpenAdvancedModal}
          >
            Full-screen form
          </button>
        ) : null}
      </div>

      {!pending.length ? (
        <div className="rounded-m-card border border-urgency-clear-value/25 bg-urgency-clear-value/[0.06] px-m-4 py-m-6 text-center">
          <p className="text-[14px] font-medium text-ink">Inbox zero — no spends waiting.</p>
          <p className="mt-1 text-[12px] text-ink-3">New submissions will surface here instantly.</p>
        </div>
      ) : (
        <ul className="space-y-m-3">
          {pending.map((p) => (
            <li key={p.spend_id}>
              <PendingApprovalCard
                spend={p}
                unitLabel={unitMap[p.unit_id] ?? "Unit"}
                costCenterLabel={p.cost_center_id ? (ccMap[p.cost_center_id] ?? "Cost center") : "—"}
                vendorLabel={p.vendor_id ? (vnMap[p.vendor_id] ?? null) : null}
                currency={currency}
                onApprove={() => void onApprove(p.spend_id)}
                onReject={() => void onReject(p.spend_id)}
                disabled={Boolean(disabled)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
