"use client";

import type {
  BusinessCostCenter,
  BusinessDashboard,
  BusinessUnit,
  BusinessVendor,
} from "@/lib/api/business";
import { bizMoney, bizNum } from "@/lib/business/format";
import { spendTypeDetailLabel } from "@/lib/business/transaction-kinds";

const spendTypeOptions = [
  "operational",
  "inventory",
  "utilities",
  "marketing",
  "logistics",
  "maintenance",
  "payroll",
  "compliance",
] as const;
const measurementUnitOptions = ["kg", "g", "l", "ml", "pcs", "box", "pack"] as const;

const inputCls =
  "w-full rounded-m-chip border border-surface-300/90 bg-surface-100/90 px-m-3 py-2.5 text-[13px] text-ink outline-none transition-[border-color,box-shadow] duration-200 focus:border-ctx-accent/50 focus:ring-2 focus:ring-ctx-accent/20";
const selectCls = inputCls;

export function SubmitSpendActionCard({
  currency,
  units,
  costCenters,
  vendors,
  unitBreakdown,
  costCenterBreakdown,
  workspaceRemaining,
  busy,
  title,
  setTitle,
  pricePerUnit,
  setPricePerUnit,
  quantity,
  setQuantity,
  measurementUnit,
  setMeasurementUnit,
  spendType,
  setSpendType,
  unitId,
  setUnitId,
  costCenterId,
  setCostCenterId,
  vendorId,
  setVendorId,
  onSubmit,
  onOpenModal,
}: {
  currency: string;
  units: BusinessUnit[];
  costCenters: BusinessCostCenter[];
  vendors: BusinessVendor[];
  unitBreakdown: BusinessDashboard["unit_breakdown"];
  costCenterBreakdown: BusinessDashboard["cost_center_breakdown"];
  workspaceRemaining: number;
  busy: boolean;
  title: string;
  setTitle: (v: string) => void;
  pricePerUnit: string;
  setPricePerUnit: (v: string) => void;
  quantity: string;
  setQuantity: (v: string) => void;
  measurementUnit: string;
  setMeasurementUnit: (v: string) => void;
  spendType: string;
  setSpendType: (v: string) => void;
  unitId: string;
  setUnitId: (v: string) => void;
  costCenterId: string;
  setCostCenterId: (v: string) => void;
  vendorId: string;
  setVendorId: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onOpenModal?: () => void;
}) {
  const lineTotal = bizNum(pricePerUnit) * bizNum(quantity);
  const unitRow = unitBreakdown.find((r) => r.key === unitId);
  const lim = unitRow?.budget_limit != null ? bizNum(unitRow.budget_limit) : null;
  const spent = unitRow ? bizNum(unitRow.amount) : 0;
  const ccRow = costCenterBreakdown.find((r) => r.key === costCenterId);
  const ccLim = ccRow?.budget_limit != null ? bizNum(ccRow.budget_limit) : null;
  const ccSpent = ccRow ? bizNum(ccRow.amount) : 0;

  const hints: { tone: "neutral" | "warn" | "bad" | "good"; text: string }[] = [];
  if (lineTotal > 0 && workspaceRemaining >= 0 && lineTotal > workspaceRemaining) {
    hints.push({
      tone: "bad",
      text: "This line is larger than workspace remaining — expect scrutiny.",
    });
  }
  if (lim != null && lim > 0 && lineTotal > 0) {
    const after = spent + lineTotal;
    if (after > lim) {
      hints.push({ tone: "bad", text: "Exceeds this unit’s budget envelope after approval." });
    } else if (after > lim * 0.9) {
      hints.push({ tone: "warn", text: "Brings the unit within 10% of its budget cap." });
    }
  }
  if (ccLim != null && ccLim > 0 && lineTotal > 0) {
    const afterCc = ccSpent + lineTotal;
    if (afterCc > ccLim) {
      hints.push({ tone: "bad", text: "Would push this cost center past its limit." });
    } else if (afterCc > ccLim * 0.85) {
      hints.push({ tone: "warn", text: "Cost center is warming up toward its ceiling." });
    } else {
      hints.push({ tone: "good", text: "Within this cost center’s budget trajectory so far." });
    }
  }
  if (!costCenterId) {
    hints.push({ tone: "neutral", text: "Pick a cost center for cleaner approvals." });
  }
  hints.push({ tone: "neutral", text: "Submissions land in pending until an approver clears them." });

  const toneClass = (t: (typeof hints)[0]["tone"]) => {
    if (t === "bad") return "border-urgency-high/35 text-urgency-high-t";
    if (t === "warn") return "border-[color-mix(in_srgb,var(--u-med)_40%,transparent)] text-[var(--u-med-t)]";
    if (t === "good") return "border-urgency-clear-value/35 text-urgency-clear-value";
    return "border-surface-300/80 text-ink-3";
  };

  return (
    <section
      id="business-section-submit"
      className="scroll-mt-24 rounded-m-card border border-surface-300/85 bg-surface-100/95 p-m-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.035)]"
    >
      <div className="mb-m-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ctx-accent">Smart action</p>
          <h2 className="mt-1 text-[18px] font-semibold text-ink">Submit spend</h2>
          <p className="mt-1 text-[13px] text-ink-3">Record a purchase (stock) or expense — live budget hints below.</p>
        </div>
        {onOpenModal ? (
          <button
            type="button"
            className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink hover:border-ctx-accent/35"
            onClick={onOpenModal}
          >
            Advanced modal
          </button>
        ) : null}
      </div>

      <div className="mb-m-4 flex flex-col gap-2 rounded-m-chip border border-ctx-accent/25 bg-[color-mix(in_srgb,var(--ctx-accent)_10%,var(--s100))] px-m-4 py-m-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent">Live preview</p>
          <p className="mt-1 text-[20px] font-semibold tabular-nums text-ink">
            {lineTotal > 0 ? (
              <>
                This will cost <span className="text-ctx-accent">{bizMoney(lineTotal, currency)}</span>
              </>
            ) : (
              <span className="text-ink-3">Enter price × quantity to preview</span>
            )}
          </p>
        </div>
        <p className="max-w-[220px] text-[11px] leading-relaxed text-ink-3">
          Totals are indicative until approved. Hints below use approved spend + workspace envelope.
        </p>
      </div>

      <ul className="mb-m-4 space-y-2">
        {hints.slice(0, 4).map((h, i) => (
          <li
            key={i}
            className={`rounded-m-chip border px-m-3 py-2 text-[12px] leading-snug transition-colors duration-300 ${toneClass(h.tone)}`}
          >
            {h.text}
          </li>
        ))}
      </ul>

      <form className="space-y-m-3" onSubmit={onSubmit}>
        <div className="grid gap-m-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              Title
            </label>
            <input
              className={inputCls}
              placeholder="What are you buying or funding?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              Price / unit
            </label>
            <input
              className={inputCls}
              inputMode="decimal"
              type="number"
              min={0}
              step="0.01"
              placeholder="0"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              Quantity
            </label>
            <input
              className={inputCls}
              inputMode="decimal"
              type="number"
              min={0}
              step="0.001"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              Unit of measure
            </label>
            <select
              className={selectCls}
              value={measurementUnit}
              onChange={(e) => setMeasurementUnit(e.target.value)}
            >
              {measurementUnitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              Spend type
            </label>
            <select className={selectCls} value={spendType} onChange={(e) => setSpendType(e.target.value)}>
              {spendTypeOptions.map((st) => (
                <option key={st} value={st}>
                  {spendTypeDetailLabel(st)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              Store / unit
            </label>
            <select className={selectCls} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Select unit…</option>
              {units.map((u) => (
                <option key={u.unit_id} value={u.unit_id}>
                  {u.name} ({u.unit_type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              Cost center
            </label>
            <select
              className={selectCls}
              value={costCenterId}
              onChange={(e) => setCostCenterId(e.target.value)}
            >
              <option value="">Optional</option>
              {costCenters.map((c) => (
                <option key={c.cost_center_id} value={c.cost_center_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              Vendor
            </label>
            <select className={selectCls} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Optional</option>
              {vendors.map((v) => (
                <option key={v.vendor_id} value={v.vendor_id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-m-chip bg-gradient-to-r from-ctx-accent to-ctx-accent-end py-m-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ctx-hero shadow-[0_12px_32px_-12px_rgba(212,136,10,0.45)] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 sm:w-auto sm:px-m-8"
        >
          Submit spend
        </button>
      </form>
    </section>
  );
}
