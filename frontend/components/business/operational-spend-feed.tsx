"use client";

import { useMemo } from "react";
import { SpendRegisterSection } from "@/components/business/spend-register-section";
import type { BusinessSpend } from "@/lib/api/business";

export function OperationalSpendFeed({
  spends,
  units,
  costCenters,
  vendors,
  currency,
  filterUnitId,
  setFilterUnitId,
  filterCostCenterId,
  setFilterCostCenterId,
  filterStatus,
  setFilterStatus,
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
  filterStatus: string;
  setFilterStatus: (v: string) => void;
}) {
  const normalized = useMemo(() => {
    if (!filterStatus) return spends;
    return spends.filter((s) => s.status === filterStatus);
  }, [spends, filterStatus]);

  return (
    <section className="space-y-m-3">
      <div className="flex justify-end">
        <select
          className="rounded-m-chip border border-surface-300 bg-bg2 px-m-2 py-2 text-[11px] text-ink"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <SpendRegisterSection
        spends={normalized}
        units={units}
        costCenters={costCenters}
        vendors={vendors}
        currency={currency}
        filterUnitId={filterUnitId}
        setFilterUnitId={setFilterUnitId}
        filterCostCenterId={filterCostCenterId}
        setFilterCostCenterId={setFilterCostCenterId}
      />
    </section>
  );
}
