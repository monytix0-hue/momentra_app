"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  approveBusinessSpend,
  createBusinessCostCenter,
  createBusinessMember,
  createBusinessUnit,
  createBusinessVendor,
  fetchBusinessMemberInvites,
  fetchBusinessCostCenters,
  fetchBusinessDashboard,
  fetchBusinessMembers,
  fetchBusinessSpends,
  fetchBusinessUnits,
  fetchBusinessVendors,
  rejectBusinessSpend,
  submitBusinessSpend,
  updateBusinessMember,
  inviteBusinessMemberByEmail,
  type BusinessCostCenter,
  type BusinessDashboard,
  type BusinessMemberInvite,
  type BusinessMember,
  type BusinessSpend,
  type BusinessUnit,
  type BusinessVendor,
  type BusinessWorkspace,
} from "@/lib/api/business";
import { bizNum } from "@/lib/business/format";
import { ApprovalCenterSectionV3 } from "@/components/business/approval-center-section-v3";
import { BusinessActivityTimelineV3 } from "@/components/business/business-activity-timeline-v3";
import { BusinessControlSummaryV3 } from "@/components/business/business-control-summary-v3";
import { BusinessInsightsSection } from "@/components/business/business-insights-section";
import { BusinessWorkspaceHeader } from "@/components/business/business-workspace-header";
import { CostCenterBreakdownV3 } from "@/components/business/cost-center-breakdown-v3";
import { OperationalSpendFeed } from "@/components/business/operational-spend-feed";
import { RecommendedActionsSection } from "@/components/business/recommended-actions-section";
import { SubmitSpendActionCardV3 } from "@/components/business/submit-spend-action-card-v3";
import { SubmitSpendModal } from "@/components/business/submit-spend-modal";
import { TeamConsoleSectionV3 } from "@/components/business/team-console-section-v3";
import { TodayBusinessSection } from "@/components/business/today-business-section";
import { UnitIntelligenceSection } from "@/components/business/unit-intelligence-section";
import { WorkspaceSetupActionsV3 } from "@/components/business/workspace-setup-actions-v3";

export function BusinessDashboard({
  workspaceId,
  workspaces,
}: {
  workspaceId: string;
  workspaces: BusinessWorkspace[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [spends, setSpends] = useState<BusinessSpend[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [invites, setInvites] = useState<BusinessMemberInvite[]>([]);
  const [costCenters, setCostCenters] = useState<BusinessCostCenter[]>([]);
  const [vendors, setVendors] = useState<BusinessVendor[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [registerUnitFilter, setRegisterUnitFilter] = useState("");
  const [registerCostCenterFilter, setRegisterCostCenterFilter] = useState("");
  const [registerStatusFilter, setRegisterStatusFilter] = useState("");

  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitType, setNewUnitType] = useState<string>("store");
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorType, setNewVendorType] = useState<string>("supplier");
  const [newCostCenterName, setNewCostCenterName] = useState<string>("Operations");
  const [purchaseTitle, setPurchaseTitle] = useState("");
  const [purchasePricePerUnit, setPurchasePricePerUnit] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("");
  const [purchaseMeasurementUnit, setPurchaseMeasurementUnit] = useState("kg");
  const [purchaseUnitId, setPurchaseUnitId] = useState("");
  const [purchaseSpendType, setPurchaseSpendType] = useState<string>("operational");
  const [purchaseCostCenterId, setPurchaseCostCenterId] = useState("");
  const [purchaseVendorId, setPurchaseVendorId] = useState("");
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [inviteUnitId, setInviteUnitId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [emailInviteNotice, setEmailInviteNotice] = useState<{
    sent: boolean;
    join_url: string;
    message?: string | null;
  } | null>(null);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.workspace_id === workspaceId) ?? null,
    [workspaceId, workspaces],
  );

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  async function loadAll() {
    if (!user) return;
    const token = await user.getIdToken();
    setErr(null);
    try {
      const [d, s, u, c, v, m, inv] = await Promise.all([
        fetchBusinessDashboard(token, workspaceId),
        fetchBusinessSpends(token, workspaceId),
        fetchBusinessUnits(token, workspaceId),
        fetchBusinessCostCenters(token, workspaceId),
        fetchBusinessVendors(token, workspaceId),
        fetchBusinessMembers(token, workspaceId),
        fetchBusinessMemberInvites(token, workspaceId),
      ]);
      setDashboard(d);
      setSpends(s);
      setUnits(u);
      setCostCenters(c);
      setVendors(v);
      setMembers(m);
      setInvites(inv);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load workspace");
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      void router.replace(`/login?next=${encodeURIComponent(`/workspaces/${workspaceId}/business`)}`);
      return;
    }
    if (user) void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, workspaceId]);

  useEffect(() => {
    setEmailInviteNotice(null);
    setRegisterUnitFilter("");
    setRegisterCostCenterFilter("");
    setRegisterStatusFilter("");
  }, [workspaceId]);

  async function onApprove(spendId: string) {
    if (!user) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      await approveBusinessSpend(token, spendId);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  }

  async function onReject(spendId: string) {
    if (!user) return;
    const reason = prompt("Rejection reason");
    if (!reason) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      await rejectBusinessSpend(token, spendId, reason);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitPurchaseInline(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const ppu = parseFloat(purchasePricePerUnit);
    const qty = parseFloat(purchaseQuantity);
    if (!purchaseTitle.trim() || !purchaseUnitId || !Number.isFinite(ppu) || ppu <= 0 || !Number.isFinite(qty) || qty <= 0) {
      setErr("Enter title, price per unit, quantity, and unit in Submit spend.");
      return;
    }
    setBusy(true);
    try {
      const token = await user.getIdToken();
      await submitBusinessSpend(token, workspaceId, {
        unit_id: purchaseUnitId,
        title: purchaseTitle.trim(),
        price_per_unit: ppu,
        quantity: qty,
        measurement_unit: purchaseMeasurementUnit,
        spend_type: purchaseSpendType,
        cost_center_id: purchaseCostCenterId || null,
        vendor_id: purchaseVendorId || null,
      });
      setPurchaseTitle("");
      setPurchasePricePerUnit("");
      setPurchaseQuantity("");
      setPurchaseMeasurementUnit("kg");
      setPurchaseUnitId("");
      setPurchaseSpendType("operational");
      setPurchaseCostCenterId("");
      setPurchaseVendorId("");
      await loadAll();
      scrollToSection("business-section-approvals");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Submit spend failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAddTeamMember(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!inviteUserId.trim()) {
      setErr("Enter a Firebase user id to add a team member.");
      return;
    }
    setBusy(true);
    try {
      const token = await user.getIdToken();
      await createBusinessMember(token, workspaceId, {
        user_id: inviteUserId.trim(),
        role: inviteRole,
        unit_id: inviteUnitId || null,
      });
      setInviteUserId("");
      setInviteRole("member");
      setInviteUnitId("");
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add member failed");
    } finally {
      setBusy(false);
    }
  }

  async function onUpdateTeamMember(memberId: string, role: string, unitId: string) {
    if (!user) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      await updateBusinessMember(token, workspaceId, memberId, { role, unit_id: unitId || null });
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update member failed");
    } finally {
      setBusy(false);
    }
  }

  async function onInviteByEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!inviteEmail.trim()) {
      setErr("Enter an email to send invite.");
      return;
    }
    setBusy(true);
    setEmailInviteNotice(null);
    setErr(null);
    try {
      const token = await user.getIdToken();
      const out = await inviteBusinessMemberByEmail(token, workspaceId, {
        email: inviteEmail.trim(),
        role: inviteRole,
        unit_id: inviteUnitId || null,
      });
      setInviteEmail("");
      setEmailInviteNotice({
        sent: out.sent,
        join_url: out.join_url,
        message: out.message,
      });
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Send invite failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !dashboard) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
      </div>
    );
  }

  const currency = activeWorkspace?.currency || "INR";
  const summary = dashboard.summary;
  const workspaceRemaining = bizNum(summary.remaining);

  return (
    <div className="space-y-m-6 pb-m-8">
      <BusinessWorkspaceHeader
        title={activeWorkspace?.title ?? "Workspace"}
        workspaceId={workspaceId}
        workspaces={workspaces}
      />

      <TodayBusinessSection
        dashboard={dashboard}
        spends={spends}
        currency={currency}
        onNavigate={scrollToSection}
      />

      <BusinessControlSummaryV3
        summary={summary}
        pendingCount={dashboard.pending_approvals.length}
        pendingAmount={bizNum(summary.pending_amount)}
        unitsActive={units.length}
        currency={currency}
      />

      <RecommendedActionsSection
        dashboard={dashboard}
        units={units}
        vendors={vendors}
        members={members}
        onNavigate={scrollToSection}
      />

      <BusinessInsightsSection
        spends={spends}
        unitBreakdown={dashboard.unit_breakdown}
        costCenterBreakdown={dashboard.cost_center_breakdown}
        units={units}
        vendors={vendors}
      />

      {err ? (
        <p className="rounded-m-chip border border-urgency-high/40 bg-bg2 px-m-3 py-m-2 text-[12px] text-urgency-high">
          {err}
        </p>
      ) : null}

      <div className="grid gap-m-6 xl:grid-cols-[1fr_min(380px,32%)] xl:items-start">
        <div className="min-w-0 space-y-m-6">
          <ApprovalCenterSectionV3
            pending={dashboard.pending_approvals}
            units={units}
            costCenters={costCenters}
            vendors={vendors}
            currency={currency}
            onApprove={onApprove}
            onReject={onReject}
            disabled={busy}
            onOpenAdvancedModal={() => setShowSpendModal(true)}
          />

          <SubmitSpendActionCardV3
            currency={currency}
            units={units}
            costCenters={costCenters}
            vendors={vendors}
            unitBreakdown={dashboard.unit_breakdown}
            costCenterBreakdown={dashboard.cost_center_breakdown}
            workspaceRemaining={workspaceRemaining}
            busy={busy}
            title={purchaseTitle}
            setTitle={setPurchaseTitle}
            pricePerUnit={purchasePricePerUnit}
            setPricePerUnit={setPurchasePricePerUnit}
            quantity={purchaseQuantity}
            setQuantity={setPurchaseQuantity}
            measurementUnit={purchaseMeasurementUnit}
            setMeasurementUnit={setPurchaseMeasurementUnit}
            spendType={purchaseSpendType}
            setSpendType={setPurchaseSpendType}
            unitId={purchaseUnitId}
            setUnitId={setPurchaseUnitId}
            costCenterId={purchaseCostCenterId}
            setCostCenterId={setPurchaseCostCenterId}
            vendorId={purchaseVendorId}
            setVendorId={setPurchaseVendorId}
            onSubmit={(e) => void onSubmitPurchaseInline(e)}
            onOpenModal={() => setShowSpendModal(true)}
          />

          <div className="grid gap-m-6 lg:grid-cols-2">
            <UnitIntelligenceSection unitBreakdown={dashboard.unit_breakdown} units={units} currency={currency} />
            <CostCenterBreakdownV3 rows={dashboard.cost_center_breakdown} currency={currency} />
          </div>

          <OperationalSpendFeed
            spends={spends}
            units={units}
            costCenters={costCenters}
            vendors={vendors}
            currency={currency}
            filterUnitId={registerUnitFilter}
            setFilterUnitId={setRegisterUnitFilter}
            filterCostCenterId={registerCostCenterFilter}
            setFilterCostCenterId={setRegisterCostCenterFilter}
            filterStatus={registerStatusFilter}
            setFilterStatus={setRegisterStatusFilter}
          />

          <section
            id="business-section-activity"
            className="scroll-mt-24 rounded-m-card border border-surface-300/80 bg-surface-100/90 p-m-4"
          >
            <p className="mb-m-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ctx-accent">
              Activity timeline
            </p>
            <h2 className="mb-m-2 text-[18px] font-semibold text-ink">What just happened</h2>
            <BusinessActivityTimelineV3 items={dashboard.activity} />
          </section>
        </div>

        <aside className="space-y-m-6 xl:sticky xl:top-6">
          <TeamConsoleSectionV3
            members={members}
            invites={invites}
            units={units}
            busy={busy}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            inviteRole={inviteRole}
            setInviteRole={setInviteRole}
            inviteUnitId={inviteUnitId}
            setInviteUnitId={setInviteUnitId}
            inviteUserId={inviteUserId}
            setInviteUserId={setInviteUserId}
            onInviteByEmail={(e) => void onInviteByEmail(e)}
            onAddMember={(e) => void onAddTeamMember(e)}
            onUpdateMember={(id, role, uid) => void onUpdateTeamMember(id, role, uid)}
            emailInviteNotice={emailInviteNotice}
            onCopyInviteLink={() => {
              if (!emailInviteNotice?.join_url || typeof navigator === "undefined" || !navigator.clipboard) return;
              void navigator.clipboard
                .writeText(emailInviteNotice.join_url)
                .catch(() => setErr("Could not copy to clipboard"));
            }}
          />

          <WorkspaceSetupActionsV3
            newUnitName={newUnitName}
            setNewUnitName={setNewUnitName}
            newUnitType={newUnitType}
            setNewUnitType={setNewUnitType}
            onAddUnit={async () => {
              if (!user || !newUnitName.trim()) return;
              setBusy(true);
              try {
                const token = await user.getIdToken();
                await createBusinessUnit(token, workspaceId, { name: newUnitName.trim(), unit_type: newUnitType });
                setNewUnitName("");
                await loadAll();
                scrollToSection("business-section-units");
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : "Add unit failed");
              } finally {
                setBusy(false);
              }
            }}
            newCostCenterName={newCostCenterName}
            setNewCostCenterName={setNewCostCenterName}
            onAddCostCenter={async () => {
              if (!user || !newCostCenterName.trim()) return;
              setBusy(true);
              try {
                const token = await user.getIdToken();
                await createBusinessCostCenter(token, workspaceId, { name: newCostCenterName.trim() });
                await loadAll();
                scrollToSection("business-section-cost-centers");
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : "Add cost center failed");
              } finally {
                setBusy(false);
              }
            }}
            newVendorName={newVendorName}
            setNewVendorName={setNewVendorName}
            newVendorType={newVendorType}
            setNewVendorType={setNewVendorType}
            onAddVendor={async () => {
              if (!user || !newVendorName.trim()) return;
              setBusy(true);
              try {
                const token = await user.getIdToken();
                await createBusinessVendor(token, workspaceId, {
                  name: newVendorName.trim(),
                  vendor_type: newVendorType,
                });
                setNewVendorName("");
                await loadAll();
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : "Add vendor failed");
              } finally {
                setBusy(false);
              }
            }}
            busy={busy}
          />
        </aside>
      </div>

      <SubmitSpendModal
        open={showSpendModal}
        units={units}
        costCenters={costCenters}
        vendors={vendors}
        onClose={() => setShowSpendModal(false)}
        onSubmit={async (body) => {
          if (!user) return;
          const token = await user.getIdToken();
          await submitBusinessSpend(token, workspaceId, body);
          await loadAll();
          setShowSpendModal(false);
          scrollToSection("business-section-approvals");
        }}
      />
    </div>
  );
}
