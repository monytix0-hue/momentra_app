"use client";

const unitTypeOptions = ["store", "factory", "warehouse", "branch", "office", "other"] as const;
const vendorTypeOptions = ["supplier", "freelancer", "utility", "agency", "contractor", "other"] as const;
const suggestedCostCenters = ["Marketing", "Operations", "Logistics", "Production", "Admin", "R&D"] as const;

const field =
  "w-full rounded-m-chip border border-surface-300/90 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink outline-none focus:border-ctx-accent/45 focus:ring-2 focus:ring-ctx-accent/15";
const actionBtn =
  "mt-m-3 w-full rounded-m-chip bg-gradient-to-r from-surface-300/40 to-surface-300/25 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink transition-all hover:from-ctx-accent/25 hover:to-ctx-accent/15 hover:text-ctx-accent";

export function AddUnitCard({
  newUnitName,
  setNewUnitName,
  newUnitType,
  setNewUnitType,
  onAdd,
  busy,
}: {
  newUnitName: string;
  setNewUnitName: (v: string) => void;
  newUnitType: string;
  setNewUnitType: (v: string) => void;
  onAdd: () => void | Promise<void>;
  busy: boolean;
}) {
  return (
    <div className="rounded-m-card border border-surface-300/80 bg-[color-mix(in_srgb,var(--s200)_40%,var(--s100))] p-m-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
      <div className="flex items-start gap-m-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ctx-accent/30 bg-ctx-accent/10 text-[18px]"
          aria-hidden
        >
          ⌂
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-ink">Add unit</h3>
          <p className="mt-0.5 text-[12px] text-ink-3">Store, branch, or site — anchors spend and approvals.</p>
          <div className="mt-m-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              className={field}
              placeholder="Moosapet Store"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
            />
            <select className={field} value={newUnitType} onChange={(e) => setNewUnitType(e.target.value)}>
              {unitTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className={actionBtn} disabled={busy} onClick={() => void onAdd()}>
            Create unit
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddCostCenterCard({
  newCostCenterName,
  setNewCostCenterName,
  onAdd,
  busy,
}: {
  newCostCenterName: string;
  setNewCostCenterName: (v: string) => void;
  onAdd: () => void | Promise<void>;
  busy: boolean;
}) {
  return (
    <div className="rounded-m-card border border-surface-300/80 bg-[color-mix(in_srgb,var(--s200)_40%,var(--s100))] p-m-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
      <div className="flex items-start gap-m-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ctx-accent/30 bg-ctx-accent/10 text-[18px]"
          aria-hidden
        >
          ▦
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-ink">Add cost center</h3>
          <p className="mt-0.5 text-[12px] text-ink-3">Lanes like Operations or Marketing for envelope control.</p>
          <div className="mt-m-3">
            <select className={field} value={newCostCenterName} onChange={(e) => setNewCostCenterName(e.target.value)}>
              {suggestedCostCenters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className={actionBtn} disabled={busy} onClick={() => void onAdd()}>
            Add cost center
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddVendorCard({
  newVendorName,
  setNewVendorName,
  newVendorType,
  setNewVendorType,
  onAdd,
  busy,
}: {
  newVendorName: string;
  setNewVendorName: (v: string) => void;
  newVendorType: string;
  setNewVendorType: (v: string) => void;
  onAdd: () => void | Promise<void>;
  busy: boolean;
}) {
  return (
    <div className="rounded-m-card border border-surface-300/80 bg-[color-mix(in_srgb,var(--s200)_40%,var(--s100))] p-m-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
      <div className="flex items-start gap-m-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ctx-accent/30 bg-ctx-accent/10 text-[18px]"
          aria-hidden
        >
          ◇
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-ink">Add vendor</h3>
          <p className="mt-0.5 text-[12px] text-ink-3">Suppliers and operators you pay through Momentra.</p>
          <div className="mt-m-3 grid gap-2 sm:grid-cols-2">
            <input
              className={field}
              placeholder="Vendor name"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
            />
            <select className={field} value={newVendorType} onChange={(e) => setNewVendorType(e.target.value)}>
              {vendorTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className={actionBtn} disabled={busy} onClick={() => void onAdd()}>
            Save vendor
          </button>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceSetupSection(props: {
  newUnitName: string;
  setNewUnitName: (v: string) => void;
  newUnitType: string;
  setNewUnitType: (v: string) => void;
  onAddUnit: () => void | Promise<void>;
  newCostCenterName: string;
  setNewCostCenterName: (v: string) => void;
  onAddCostCenter: () => void | Promise<void>;
  newVendorName: string;
  setNewVendorName: (v: string) => void;
  newVendorType: string;
  setNewVendorType: (v: string) => void;
  onAddVendor: () => void | Promise<void>;
  busy: boolean;
}) {
  return (
    <section id="business-section-setup" className="scroll-mt-24 space-y-m-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ctx-accent">Workspace setup</p>
        <h2 className="mt-1 text-[18px] font-semibold text-ink">Quick operational actions</h2>
        <p className="mt-1 text-[13px] text-ink-3">Fast paths — no ERP maze.</p>
      </div>
      <div className="space-y-m-3">
        <AddUnitCard
          newUnitName={props.newUnitName}
          setNewUnitName={props.setNewUnitName}
          newUnitType={props.newUnitType}
          setNewUnitType={props.setNewUnitType}
          onAdd={props.onAddUnit}
          busy={props.busy}
        />
        <AddCostCenterCard
          newCostCenterName={props.newCostCenterName}
          setNewCostCenterName={props.setNewCostCenterName}
          onAdd={props.onAddCostCenter}
          busy={props.busy}
        />
        <AddVendorCard
          newVendorName={props.newVendorName}
          setNewVendorName={props.setNewVendorName}
          newVendorType={props.newVendorType}
          setNewVendorType={props.setNewVendorType}
          onAdd={props.onAddVendor}
          busy={props.busy}
        />
      </div>
    </section>
  );
}
