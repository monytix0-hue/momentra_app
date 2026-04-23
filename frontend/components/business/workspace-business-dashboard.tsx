"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getApiBaseUrl } from "@/lib/api/client";
import { approveBusinessSpend, rejectBusinessSpend, submitBusinessSpend } from "@/lib/api/business";
import { bizMoney, formatBizDateShort, healthToneClasses } from "@/lib/business/format";
import { useWorkspaceBusinessData } from "@/lib/business/use-workspace-business-data";
import { WorkspaceBusinessWorkspaceTop } from "@/components/business/workspace-business-page-header";
import { SubmitSpendModal } from "@/components/business/submit-spend-modal";
import { transactionKindLabel } from "@/lib/business/transaction-kinds";

const card =
  "rounded-m-card border border-[color:var(--b-border)] bg-surface-100 p-m-4 shadow-sm";
const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.12em] text-b-text-dim";

export function WorkspaceBusinessDashboard({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    loading,
    error,
    workspaces,
    workspace,
    dashboard,
    viewModel,
    units,
    vendors,
    costCenters,
    reload,
    user: dataUser,
  } = useWorkspaceBusinessData(workspaceId);

  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [showSpend, setShowSpend] = useState(false);
  const [spendVariant, setSpendVariant] = useState<"purchase" | "expense">("expense");
  /** Remount modal so form state matches variant without setState-in-effect. */
  const [spendModalNonce, setSpendModalNonce] = useState(0);
  const openSpendModal = (v: "purchase" | "expense") => {
    setSpendVariant(v);
    setSpendModalNonce((n) => n + 1);
    setShowSpend(true);
  };
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [outlookDetailsOpen, setOutlookDetailsOpen] = useState(false);

  const onApprove = useCallback(
    async (spendId: string) => {
      if (!dataUser) return;
      setBusy(true);
      setLocalErr(null);
      try {
        const token = await dataUser.getIdToken();
        await approveBusinessSpend(token, spendId);
        await reload();
      } catch (e) {
        setLocalErr(e instanceof Error ? e.message : "Could not approve");
      } finally {
        setBusy(false);
      }
    },
    [dataUser, reload],
  );

  const onReject = useCallback(
    async (spendId: string) => {
      if (!dataUser || !rejectReason.trim()) return;
      setBusy(true);
      setLocalErr(null);
      try {
        const token = await dataUser.getIdToken();
        await rejectBusinessSpend(token, spendId, rejectReason.trim());
        setRejectId(null);
        setRejectReason("");
        await reload();
      } catch (e) {
        setLocalErr(e instanceof Error ? e.message : "Could not reject");
      } finally {
        setBusy(false);
      }
    },
    [dataUser, rejectReason, reload],
  );

  const submitSpend = useCallback(
    async (body: Parameters<typeof submitBusinessSpend>[2]) => {
      if (!dataUser) return;
      setBusy(true);
      setLocalErr(null);
      try {
        const token = await dataUser.getIdToken();
        await submitBusinessSpend(token, workspaceId, body);
        setShowSpend(false);
        await reload();
      } catch (e) {
        setLocalErr(e instanceof Error ? e.message : "Could not submit");
      } finally {
        setBusy(false);
      }
    },
    [dataUser, workspaceId, reload],
  );

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
      </div>
    );
  }

  if (!user) {
    router.replace(`/login?next=${encodeURIComponent(`/workspaces/${workspaceId}/business`)}`);
    return null;
  }

  if (loading && !viewModel) {
    return (
      <div className="space-y-m-4">
        <div className="h-36 animate-pulse rounded-m-hero bg-surface-200/80" />
        <div className="h-48 animate-pulse rounded-m-card bg-surface-200/80" />
        <div className="grid gap-m-3 sm:grid-cols-3">
          <div className="h-24 animate-pulse rounded-m-card bg-surface-200/80" />
          <div className="h-24 animate-pulse rounded-m-card bg-surface-200/80" />
          <div className="h-24 animate-pulse rounded-m-card bg-surface-200/80" />
        </div>
      </div>
    );
  }

  if (error || !viewModel || !workspace || !dashboard) {
    const apiOrigin = getApiBaseUrl();
    const looksLocal = apiOrigin.includes("127.0.0.1") || apiOrigin.includes("localhost");
    return (
      <div className={`${card} border-urgency-high/30 bg-bg2`}>
        <p className="text-[15px] font-semibold text-urgency-high">Could not open this workspace</p>
        <p className="mt-2 text-[13px] text-ink-2">{error ?? "Something went wrong."}</p>
        <p className="mt-m-3 rounded-m-chip border border-surface-300/80 bg-bg px-m-3 py-m-2 font-mono text-[11px] leading-relaxed text-ink-3">
          API base in this build: {apiOrigin}
          {looksLocal ? (
            <span className="mt-1 block text-urgency-high">
              This build is still pointing at localhost — set NEXT_PUBLIC_API_URL in Vercel and redeploy, or fix DNS so
              this domain hits the deployment that includes that variable.
            </span>
          ) : null}
        </p>
        <Link
          href="/workspaces"
          className="mt-m-4 inline-flex min-h-[44px] items-center rounded-m-cta bg-ctx-accent px-m-4 text-[14px] font-semibold text-ctx-hero"
        >
          Choose a workspace
        </Link>
      </div>
    );
  }

  const vm = viewModel;
  const heroCls = healthToneClasses(vm.hero.health);
  const payablesTotal = vm.payables.reduce((sum, p) => sum + p.amount, 0);

  const scrollToPayables = () => {
    document.getElementById("section-payables")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onNextStepCta = () => {
    if (vm.nextStep?.onPress === "scroll_payables") scrollToPayables();
  };

  return (
    <div className="space-y-m-6 pb-28 lg:pb-m-8">
      <WorkspaceBusinessWorkspaceTop
        workspaceId={workspaceId}
        workspaceTitle={workspace.title}
        workspaces={workspaces}
        subtitle="Cash, purchases, and expenses — today in one screen."
        onAddPurchase={() => openSpendModal("purchase")}
        onAddExpense={() => openSpendModal("expense")}
      />

      {localErr ? (
        <p className="rounded-m-chip border border-urgency-high/35 bg-bg2 px-m-3 py-m-2 text-[13px] text-urgency-high">
          {localErr}
        </p>
      ) : null}

      {/* Today hero — cash & purchase first for scanning */}
      <section className={`${card} ring-1 ${heroCls.ring}`}>
        <div className="flex flex-wrap items-start justify-between gap-m-3">
          <div>
            <p className={eyebrow}>Today</p>
            <h2 className="mt-1 text-[20px] font-semibold text-ink">Snapshot</h2>
            <p className="mt-2 max-w-[28rem] text-[14px] leading-snug text-ink-2">{vm.hero.statusLine}</p>
          </div>
          <span className={`inline-flex items-center rounded-m-badge px-m-3 py-1.5 text-[12px] font-semibold ${heroCls.bg} ${heroCls.text}`}>
            {vm.hero.healthLabel}
          </span>
        </div>
        <div className="mt-m-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-m-chip border border-[color:var(--b-border)] bg-b-surf-2 p-m-4 sm:p-m-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-b-text-dim">Cash in hand</p>
            <p className="mt-1 text-[36px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
              {vm.hero.cashInHandLabel}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-b-text-dim">{vm.hero.cashInHandSub}</p>
          </div>
          <div className="rounded-m-chip border border-teal-500/35 bg-teal-500/[0.08] p-m-4 shadow-sm ring-1 ring-teal-500/25 sm:p-m-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-b-text-dim">Purchases</p>
            <p className="mt-1 text-[18px] font-bold tabular-nums text-ink">{vm.hero.purchasesLabel}</p>
            <p className="mt-1 text-[11px] leading-snug text-b-text-dim">{vm.hero.purchasesSub}</p>
          </div>
          <div className="rounded-m-chip border border-[color:var(--b-border)] bg-b-surf-2 p-m-4 sm:p-m-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-b-text-dim">Sales</p>
            <p className="mt-1 text-[18px] font-bold tabular-nums text-ink">{vm.hero.salesLabel}</p>
            <p className="mt-1 text-[11px] leading-snug text-b-text-dim">{vm.hero.salesSub}</p>
          </div>
          <div className="rounded-m-chip border border-rose-500/25 bg-rose-500/[0.06] p-m-4 sm:p-m-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-b-text-dim">Expenses</p>
            <p className="mt-1 text-[18px] font-bold tabular-nums text-ink">{vm.hero.expensesLabel}</p>
            <p className="mt-1 text-[11px] leading-snug text-b-text-dim">{vm.hero.expensesSub}</p>
          </div>
        </div>
      </section>

      {/* Next step */}
      {vm.nextStep ? (
        <section
          className={`${card} border-ctx-accent/15 bg-gradient-to-br from-ctx-accent/[0.07] to-emerald-950/[0.04]`}
        >
          <p className={eyebrow}>Next step</p>
          <h3 className="mt-2 text-[17px] font-semibold leading-snug text-ink">{vm.nextStep.title}</h3>
          <p className="mt-2 text-[14px] leading-snug text-ink-2">{vm.nextStep.reason}</p>
          <button
            type="button"
            onClick={onNextStepCta}
            className="mt-m-4 inline-flex min-h-[50px] w-full items-center justify-center rounded-m-cta bg-gradient-to-br from-ctx-accent to-ctx-accent-end px-m-4 text-[15px] font-semibold text-ctx-hero shadow-sm sm:w-auto"
          >
            {vm.nextStep.ctaLabel}
          </button>
        </section>
      ) : null}

      {/* Money you owe / Money coming in */}
      <div>
        <p className={eyebrow}>Money</p>
        <div className="mt-m-2 grid gap-m-4 lg:grid-cols-2">
        <section id="section-payables" className={card}>
          <div className="flex items-center justify-between gap-m-2">
            <h3 className="text-[16px] font-semibold text-ink">To Pay</h3>
            <Link
              href={`/workspaces/${workspaceId}/business/payables`}
              className="min-h-[40px] shrink-0 text-[12px] font-semibold text-ctx-accent hover:underline sm:min-h-0"
            >
              View all
            </Link>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-ink-3">
            Supplier bills — <span className="font-medium text-teal-900/85">Purchase</span> is stock,{" "}
            <span className="font-medium text-rose-900/80">Expense</span> is running cost.
          </p>
          {vm.payables.length > 0 ? (
            <p className="mt-m-3 rounded-m-chip border border-surface-300/80 bg-bg2/90 px-m-3 py-m-2 text-[13px] text-ink">
              <span className="text-ink-3">Total waiting: </span>
              <span className="font-bold tabular-nums text-ink">{bizMoney(payablesTotal, workspace.currency)}</span>
            </p>
          ) : null}
          <ul className="mt-m-4 space-y-m-3">
            {vm.payables.length === 0 ? (
              <li className="rounded-m-chip border border-dashed border-surface-300 bg-bg2/60 px-m-3 py-m-4 text-[13px] text-ink-3">
                All clear — no bills waiting. Add Purchase or Add Expense when you need to.
              </li>
            ) : (
              vm.payables.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-m-2 rounded-m-chip border border-surface-300/90 bg-bg2/70 p-m-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
                        p.flowLabel === "Purchase" ? "text-teal-800/90" : "text-rose-800/90"
                      }`}
                    >
                      {p.flowLabel}
                    </p>
                    <p className="text-[14px] font-semibold text-ink">{p.name}</p>
                    <p className="text-[12px] text-ink-3">{p.dueLine}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold tabular-nums text-ink">
                      {bizMoney(p.amount, workspace.currency)}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onApprove(p.id)}
                      className="min-h-[40px] rounded-m-chip bg-emerald-700/90 px-m-3 text-[12px] font-semibold text-white disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRejectId(p.id)}
                      className="min-h-[40px] rounded-m-chip border border-surface-300 px-m-3 text-[12px] font-medium text-ink disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className={card}>
          <div className="flex items-center justify-between gap-m-2">
            <h3 className="text-[16px] font-semibold text-ink">To Collect</h3>
            <Link
              href={`/workspaces/${workspaceId}/business/receivables`}
              className="min-h-[40px] shrink-0 text-[12px] font-semibold text-ctx-accent hover:underline sm:min-h-0"
            >
              View all
            </Link>
          </div>
          <p className="mt-1 text-[13px] text-ink-3">Customer credit & pending sales</p>
          <div className="mt-m-3 rounded-m-chip border border-sky-500/20 bg-sky-500/[0.06] p-m-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-sky-900/75">Total to collect</p>
            <p className="mt-1 text-[22px] font-bold tabular-nums text-ink">—</p>
            <p className="mt-2 text-[13px] leading-snug text-ink-3">
              No customer dues here yet. When you connect billing, shop credit and counter dues will list with amounts.
            </p>
            <Link
              href={`/workspaces/${workspaceId}/business/receivables`}
              className="mt-m-3 inline-flex min-h-[44px] items-center text-[13px] font-semibold text-ctx-accent hover:underline"
            >
              To Collect page
            </Link>
          </div>
        </section>
        </div>
      </div>

      {/* Today’s movement */}
      <section className={card}>
        <p className={eyebrow}>Breakdown</p>
        <h3 className="mt-1 text-[16px] font-semibold text-ink">Movement</h3>
        <p className="mt-1 text-[12px] text-ink-3">Purchase and expense are always separate.</p>
        <div className="mt-m-4 grid gap-m-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-m-chip border border-emerald-500/15 bg-emerald-500/[0.06] p-m-3">
            <p className="text-[11px] font-medium text-emerald-900/80">Sales</p>
            <p className="mt-1 text-[18px] font-bold tabular-nums text-ink">{vm.daily.salesLabel}</p>
            <p className="mt-1 text-[11px] text-ink-3">{vm.daily.salesSub}</p>
          </div>
          <div className="rounded-m-chip border border-teal-500/20 bg-teal-500/[0.06] p-m-3">
            <p className="text-[11px] font-medium text-teal-900/85">Purchases</p>
            <p className="mt-1 text-[18px] font-bold tabular-nums text-ink">{vm.daily.purchasesLabel}</p>
            <p className="mt-1 text-[11px] text-ink-3">{vm.daily.purchasesSub}</p>
          </div>
          <div className="rounded-m-chip border border-rose-500/15 bg-rose-500/[0.05] p-m-3">
            <p className="text-[11px] font-medium text-rose-900/80">Expenses</p>
            <p className="mt-1 text-[18px] font-bold tabular-nums text-ink">{vm.daily.expensesLabel}</p>
            <p className="mt-1 text-[11px] text-ink-3">{vm.daily.expensesSub}</p>
          </div>
          <div className="rounded-m-chip border border-sky-500/15 bg-sky-500/[0.05] p-m-3">
            <p className="text-[11px] font-medium text-sky-900/85">Collections</p>
            <p className="mt-1 text-[18px] font-bold tabular-nums text-ink">{vm.daily.collectionsLabel}</p>
            <p className="mt-1 text-[11px] text-ink-3">{vm.daily.collectionsSub}</p>
          </div>
          <div className="rounded-m-chip border border-violet-500/15 bg-violet-500/[0.05] p-m-3">
            <p className="text-[11px] font-medium text-violet-900/85">Payments</p>
            <p className="mt-1 text-[18px] font-bold tabular-nums text-ink">{vm.daily.paymentsLabel}</p>
            <p className="mt-1 text-[11px] text-ink-3">{vm.daily.paymentsSub}</p>
          </div>
          <div
            className={`rounded-m-chip border p-m-3 ${
              vm.daily.netPositive
                ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                : "border-amber-500/25 bg-amber-500/[0.06]"
            }`}
          >
            <p className="text-[11px] font-medium text-ink-2">Net today</p>
            <p className="mt-1 text-[18px] font-bold tabular-nums text-ink">{vm.daily.netLabel}</p>
            <p className="mt-1 text-[11px] text-ink-3">{vm.daily.netSub}</p>
          </div>
        </div>
      </section>

      {/* Recent transactions */}
      <section className={card}>
        <p className={eyebrow}>Activity</p>
        <div className="mt-1 flex items-center justify-between gap-m-2">
          <div>
            <h3 className="text-[16px] font-semibold text-ink">Recent transactions</h3>
            <p className="mt-0.5 text-[12px] text-ink-3">Latest purchase & expense entries</p>
          </div>
          <Link
            href={`/workspaces/${workspaceId}/business/transactions`}
            className="text-[12px] font-semibold text-ctx-accent hover:underline"
          >
            View all
          </Link>
        </div>
        <ul className="mt-m-3 divide-y divide-b-separator">
          {vm.recentTransactions.length === 0 ? (
            <li className="py-m-4 text-[13px] text-ink-3">No purchases or expenses yet. Use Add Purchase or Add Expense.</li>
          ) : (
            vm.recentTransactions.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-m-3 py-m-3">
                <div className="min-w-0">
                  <span
                    className={`inline-block rounded-m-badge px-m-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                      r.type === "purchase"
                        ? "bg-teal-500/15 text-teal-900"
                        : r.type === "expense"
                          ? "bg-rose-500/12 text-rose-900"
                          : "bg-surface-300/40 text-ink-3"
                    }`}
                  >
                    {transactionKindLabel(r.type)}
                  </span>
                  <p className="mt-1 text-[14px] font-medium text-ink">{r.title}</p>
                  <p className="text-[12px] text-ink-3">
                    {formatBizDateShort(r.when)}
                  </p>
                  {r.meta ? <p className="text-[11px] text-ink-4">{r.meta}</p> : null}
                </div>
                {r.amount > 0 ? (
                  <span className="shrink-0 text-[15px] font-bold tabular-nums text-ink">
                    {bizMoney(r.amount, workspace.currency)}
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Cash outlook */}
      <section className={card}>
        <p className={eyebrow}>Cash</p>
        <h3 className="mt-1 text-[16px] font-semibold text-ink">Next few days</h3>
        <p className="mt-1 text-[13px] text-ink-3">Rough picture — tap below for day-by-day</p>
        <div className="mt-m-4 grid gap-m-3 sm:grid-cols-3">
          <div className="rounded-m-chip border border-surface-300/80 bg-bg2/80 p-m-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Incoming</p>
            <p className="mt-1 text-[18px] font-bold tabular-nums text-ink">{vm.outlookSummary.incomingLabel}</p>
            <p className="mt-1 text-[11px] leading-snug text-ink-3">{vm.outlookSummary.incomingSub}</p>
          </div>
          <div className="rounded-m-chip border border-surface-300/80 bg-bg2/80 p-m-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Outgoing</p>
            <p className="mt-1 text-[18px] font-bold tabular-nums text-ink">{vm.outlookSummary.outgoingLabel}</p>
            <p className="mt-1 text-[11px] leading-snug text-ink-3">{vm.outlookSummary.outgoingSub}</p>
          </div>
          <div
            className={`rounded-m-chip border p-m-3 ${
              vm.outlookSummary.cushionTone === "ok"
                ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                : "border-amber-500/25 bg-amber-500/[0.07]"
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">After queue</p>
            <p className="mt-1 text-[14px] font-semibold leading-snug text-ink">{vm.outlookSummary.cushionLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOutlookDetailsOpen((o) => !o)}
          className="mt-m-4 inline-flex min-h-[44px] items-center rounded-m-chip border border-surface-300 bg-bg2 px-m-3 text-[13px] font-semibold text-ink"
        >
          {outlookDetailsOpen ? "Hide day-by-day" : "View day-by-day"}
        </button>
        {outlookDetailsOpen ? (
          <div className="mt-m-3 overflow-x-auto rounded-m-chip border border-surface-300/60 bg-bg2/40 p-m-2">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-surface-300 text-[11px] uppercase tracking-[0.08em] text-ink-3">
                  <th className="pb-2 pr-m-2 font-medium">Day</th>
                  <th className="pb-2 pr-m-2 font-medium">Incoming</th>
                  <th className="pb-2 pr-m-2 font-medium">Outgoing</th>
                  <th className="pb-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {vm.outlook.map((row) => (
                  <tr key={row.label} className="border-b border-b-separator">
                    <td className="py-m-2 pr-m-2 font-medium text-ink">{row.label}</td>
                    <td className="py-m-2 pr-m-2 text-ink-2">{row.incoming}</td>
                    <td className="py-m-2 pr-m-2 tabular-nums text-ink">{row.outgoing}</td>
                    <td className="py-m-2 text-ink-3">{row.gapLine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {/* Stock */}
      <section className={card}>
        <p className={eyebrow}>Inventory</p>
        <div className="mt-1 flex items-center justify-between gap-m-2">
          <div>
            <h3 className="text-[16px] font-semibold text-ink">Stock</h3>
            <p className="mt-0.5 text-[12px] text-ink-3">Low stock & last purchase hints</p>
          </div>
          <Link
            href={`/workspaces/${workspaceId}/business/inventory`}
            className="text-[12px] font-semibold text-ctx-accent hover:underline"
          >
            View stock
          </Link>
        </div>
        {vm.inventory ? (
          <div className="mt-m-3">
            <p className="text-[14px] font-medium text-ink">{vm.inventory.headline}</p>
            <ul className="mt-m-2 space-y-1.5 text-[13px] text-ink-2">
              {vm.inventory.lines.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-ink-4">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-m-3 text-[13px] text-ink-3">
            Full stock counts connect here later. Purchases you add today still help you track what you bought for
            inventory.
          </p>
        )}
      </section>

      {vm.recentUpdates.length > 0 ? (
        <section className={`${card} border-surface-300/60 bg-bg2/40`}>
          <p className={eyebrow}>Other</p>
          <h3 className="mt-1 text-[16px] font-semibold text-ink">Updates</h3>
          <p className="mt-1 text-[12px] text-ink-3">App & sync — not your main money list</p>
          <ul className="mt-m-3 divide-y divide-b-separator">
            {vm.recentUpdates.map((r) => (
              <li key={r.id} className="flex flex-col gap-0.5 py-m-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] text-ink-2">{r.title}</p>
                  {r.meta ? (
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-4">{r.meta}</p>
                  ) : null}
                </div>
                <time className="shrink-0 text-[11px] text-ink-4">{formatBizDateShort(r.when)}</time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rejectId ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-m-4">
          <div className="w-full max-w-md rounded-m-card border border-surface-300 bg-bg p-m-4">
            <p className="text-[15px] font-semibold text-ink">Reject this request?</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (required)"
              className="mt-m-3 min-h-[100px] w-full rounded-m-chip border border-surface-300 bg-surface-100 px-m-3 py-m-2 text-[13px] text-ink"
            />
            <div className="mt-m-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
                className="rounded-m-chip px-m-3 py-2 text-[13px] font-medium text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !rejectReason.trim()}
                onClick={() => void onReject(rejectId)}
                className="rounded-m-chip bg-urgency-high px-m-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <SubmitSpendModal
        key={spendModalNonce}
        open={showSpend}
        variant={spendVariant}
        units={units}
        costCenters={costCenters}
        vendors={vendors}
        onClose={() => setShowSpend(false)}
        onSubmit={(body) => void submitSpend(body)}
      />

      {/* Sticky quick actions (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-300/80 bg-bg/95 px-m-2 py-m-2 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          <QuickBtn
            highlight
            label="Stock"
            title="Add purchase — material & goods"
            onClick={() => openSpendModal("purchase")}
          />
          <QuickBtn label="Bill" title="Add expense — rent, transport" onClick={() => openSpendModal("expense")} />
          <QuickBtn
            label="Sale"
            title="View transactions"
            onClick={() => router.push(`/workspaces/${workspaceId}/business/transactions`)}
          />
          <QuickBtn label="Pay" title="Bills waiting for you" onClick={scrollToPayables} />
          <QuickBtn
            label="Get"
            title="Money to collect"
            onClick={() => router.push(`/workspaces/${workspaceId}/business/receivables`)}
          />
        </div>
      </div>
    </div>
  );
}

function QuickBtn({
  label,
  title,
  onClick,
  highlight,
}: {
  label: string;
  title?: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex min-h-[48px] flex-col items-center justify-center rounded-m-chip px-0.5 text-[10px] font-semibold uppercase leading-tight tracking-[0.04em] shadow-sm active:scale-[0.98] ${
        highlight
          ? "border border-emerald-700/50 bg-emerald-900/90 text-white ring-1 ring-emerald-400/30"
          : "border border-surface-300 bg-surface-100 text-ink"
      }`}
    >
      {label}
    </button>
  );
}
