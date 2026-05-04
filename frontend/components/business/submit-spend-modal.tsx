"use client";

import { useState } from "react";
import type { BusinessCostCenter, BusinessUnit, BusinessVendor } from "@/lib/api/business";
import { PURCHASE_SPEND_TYPE, spendTypeDetailLabel } from "@/lib/business/transaction-kinds";

const inputCls =
  "w-full rounded-m-chip border border-surface-300 bg-surface-100 px-m-3 py-2 text-[13px] text-ink";

/** Expense flows only — purchase uses inventory separately so it is never mixed in this list. */
const EXPENSE_SPEND_TYPE_OPTIONS = [
  "operational",
  "utilities",
  "marketing",
  "logistics",
  "maintenance",
  "payroll",
  "compliance",
] as const;
const MEASUREMENT_UNIT_OPTIONS = ["kg", "g", "l", "ml", "pcs", "box", "pack"] as const;

export function SubmitSpendModal({
  open,
  units,
  costCenters,
  vendors,
  onClose,
  onSubmit,
  variant = "expense",
}: {
  open: boolean;
  units: BusinessUnit[];
  costCenters: BusinessCostCenter[];
  vendors: BusinessVendor[];
  /** Purchase defaults to inventory (stock/raw). Expense defaults to operational. */
  variant?: "purchase" | "expense";
  onClose: () => void;
  onSubmit: (body: {
    unit_id: string;
    title: string;
    amount?: number;
    price_per_unit?: number;
    quantity?: number;
    measurement_unit?: string | null;
    spend_type: string;
    cost_center_id?: string | null;
    vendor_id?: string | null;
  }) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [measurementUnit, setMeasurementUnit] = useState("kg");
  const [unitId, setUnitId] = useState("");
  const [spendType, setSpendType] = useState(variant === "purchase" ? "inventory" : "operational");
  const [costCenterId, setCostCenterId] = useState("");
  const [vendorId, setVendorId] = useState("");

  if (!open) return null;

  const heading = variant === "purchase" ? "Add purchase" : "Add expense";
  const sub =
    variant === "purchase"
      ? "Stock, raw material, or goods for resale — counts as purchase, not expense"
      : "Rent, transport, bills, and other running costs";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-m-4">
      <form
        className="w-full max-w-lg space-y-m-3 rounded-m-card border border-surface-300 bg-bg p-m-4"
        onSubmit={(e) => {
          e.preventDefault();
          const ppu = parseFloat(pricePerUnit);
          const qty = parseFloat(quantity);
          if (!title.trim() || !unitId || !Number.isFinite(ppu) || ppu <= 0 || !Number.isFinite(qty) || qty <= 0)
            return;
          void onSubmit({
            unit_id: unitId,
            title: title.trim(),
            price_per_unit: ppu,
            quantity: qty,
            measurement_unit: measurementUnit,
            spend_type: variant === "purchase" ? PURCHASE_SPEND_TYPE : spendType,
            cost_center_id: costCenterId || null,
            vendor_id: vendorId || null,
          });
          onClose();
          setTitle("");
          setPricePerUnit("");
          setQuantity("");
          setMeasurementUnit("kg");
          setUnitId("");
          setSpendType(variant === "purchase" ? "inventory" : "operational");
          setCostCenterId("");
          setVendorId("");
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-accent">{heading}</p>
        <p className="text-[12px] text-ink-3">{sub}</p>
        <input
          className={inputCls}
          placeholder={variant === "purchase" ? "What are you buying?" : "What was this for?"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-m-2">
          <input
            className={inputCls}
            placeholder="Price / unit"
            inputMode="decimal"
            type="number"
            min="0"
            step="0.01"
            value={pricePerUnit}
            onChange={(e) => setPricePerUnit(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Quantity"
            inputMode="decimal"
            type="number"
            min="0"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        {variant === "purchase" ? (
          <div className="space-y-m-2">
            <select className={inputCls} value={measurementUnit} onChange={(e) => setMeasurementUnit(e.target.value)}>
              {MEASUREMENT_UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-ink-3">
              Recorded as <span className="font-semibold text-teal-900/90">Purchase</span> — adds to stock, not as a
              running expense.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-m-2">
            <select className={inputCls} value={measurementUnit} onChange={(e) => setMeasurementUnit(e.target.value)}>
              {MEASUREMENT_UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <select className={inputCls} value={spendType} onChange={(e) => setSpendType(e.target.value)}>
              {EXPENSE_SPEND_TYPE_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {spendTypeDetailLabel(st)}
                </option>
              ))}
            </select>
          </div>
        )}
        <select className={inputCls} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          <option value="">Store</option>
          {units.map((u) => (
            <option key={u.unit_id} value={u.unit_id}>
              {u.name}
            </option>
          ))}
        </select>
        <select className={inputCls} value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)}>
          <option value="">Cost center (optional)</option>
          {costCenters.map((c) => (
            <option key={c.cost_center_id} value={c.cost_center_id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={inputCls} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
          <option value="">Vendor (optional)</option>
          {vendors.map((v) => (
            <option key={v.vendor_id} value={v.vendor_id}>
              {v.name}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-m-2 pt-m-2">
          <button type="button" onClick={onClose} className="rounded-m-chip border border-surface-300 px-m-3 py-2 text-[11px]">
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[50px] w-full rounded-m-cta bg-gradient-to-br from-ctx-accent to-ctx-accent-end px-m-3 text-[15px] font-semibold text-ctx-hero sm:w-auto"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}

