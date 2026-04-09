"use client";

import type { BusinessSpend } from "@/lib/api/business";
import { bizMoney, bizNum, formatBizDate } from "@/lib/business/format";

function SpendRow({
  spend,
  unitLabel,
  costCenterLabel,
  vendorLabel,
  currency,
}: {
  spend: BusinessSpend;
  unitLabel: string;
  costCenterLabel: string;
  vendorLabel: string | null;
  currency: string;
}) {
  const settled = spend.status === "approved";
  const rejected = spend.status === "rejected";

  return (
    <article
      className={`group rounded-m-card border px-m-4 py-m-3 transition-all duration-300 hover:border-ctx-accent/25 ${
        settled
          ? "border-surface-300/60 bg-bg2/50"
          : rejected
            ? "border-urgency-high/25 bg-urgency-high/[0.04]"
            : "border-surface-300/70 bg-bg2/80"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-semibold text-ink">{spend.title}</h3>
            <span
              className={`rounded-m-chip border px-m-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${
                settled
                  ? "border-urgency-clear-value/35 text-urgency-clear-value"
                  : rejected
                    ? "border-urgency-high/40 text-urgency-high-t"
                    : "border-status-pending-fg/35 text-status-pending-fg"
              }`}
            >
              {spend.status}
            </span>
          </div>
          <p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{bizMoney(bizNum(spend.amount), currency)}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-3">
            <span className="capitalize text-ink-2">{spend.spend_type}</span>
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
        </div>
        <time className="shrink-0 text-[11px] text-ink-4" dateTime={spend.submitted_at ?? undefined}>
          {formatBizDate(spend.submitted_at)}
        </time>
      </div>
      {rejected && spend.rejection_reason ? (
        <p className="mt-2 border-t border-surface-300/50 pt-2 text-[11px] text-urgency-high-t">
          {spend.rejection_reason}
        </p>
      ) : null}
    </article>
  );
}

export function SpendRegisterSection({
  spends,
  units,
  costCenters,
  vendors,
  currency,
  filterUnitId,
  setFilterUnitId,
  filterCostCenterId,
  setFilterCostCenterId,
}: {
  spends: BusinessSpend[];
  units: { unit_id: string; name: string }[];
  costCenters: { cost_center_id: string; name: string }[];
  vendors: { vendor_id: string; name: string }[];
  currency: string;
  filterUnitId: string;
  setFilterUnitId: (v: string) => void;
  filterCostCenterId: string;
  setFilterCostCenterId: (v: string) => void;
}) {
  const unitMap = Object.fromEntries(units.map((u) => [u.unit_id, u.name]));
  const ccMap = Object.fromEntries(costCenters.map((c) => [c.cost_center_id, c.name]));
  const vnMap = Object.fromEntries(vendors.map((v) => [v.vendor_id, v.name]));

  const registerSpends = spends.filter((s) => s.status !== "pending");
  const filtered = registerSpends.filter((s) => {
    if (filterUnitId && s.unit_id !== filterUnitId) return false;
    if (filterCostCenterId && s.cost_center_id !== filterCostCenterId) return false;
    return true;
  });

  return (
    <section id="business-section-register" className="scroll-mt-24 space-y-m-3">
      <div className="flex flex-col gap-m-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ctx-accent">Spend register</p>
          <h2 className="mt-1 text-[18px] font-semibold text-ink">Operational feed</h2>
          <p className="mt-1 text-[13px] text-ink-3">Settled and rejected rows — pending stays in approvals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-m-chip border border-surface-300 bg-bg2 px-m-2 py-2 text-[11px] text-ink"
            value={filterUnitId}
            onChange={(e) => setFilterUnitId(e.target.value)}
            aria-label="Filter by unit"
          >
            <option value="">All units</option>
            {units.map((u) => (
              <option key={u.unit_id} value={u.unit_id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-m-chip border border-surface-300 bg-bg2 px-m-2 py-2 text-[11px] text-ink"
            value={filterCostCenterId}
            onChange={(e) => setFilterCostCenterId(e.target.value)}
            aria-label="Filter by cost center"
          >
            <option value="">All cost centers</option>
            {costCenters.map((c) => (
              <option key={c.cost_center_id} value={c.cost_center_id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!filtered.length ? (
        <p className="rounded-m-card border border-surface-300/70 p-m-6 text-center text-[13px] text-ink-3">
          No matching spend rows yet.
        </p>
      ) : (
        <div className="space-y-m-2">
          {filtered.map((s) => (
            <SpendRow
              key={s.spend_id}
              spend={s}
              unitLabel={unitMap[s.unit_id] ?? "Unit"}
              costCenterLabel={s.cost_center_id ? (ccMap[s.cost_center_id] ?? "—") : "—"}
              vendorLabel={s.vendor_id ? (vnMap[s.vendor_id] ?? null) : null}
              currency={currency}
            />
          ))}
        </div>
      )}
    </section>
  );
}
