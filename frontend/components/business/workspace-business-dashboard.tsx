"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { approveBusinessSpend, rejectBusinessSpend, submitBusinessSpend } from "@/lib/api/business";
import { bizMoney, formatBizDateShort, healthToneClasses } from "@/lib/business/format";
import { useWorkspaceBusinessData } from "@/lib/business/use-workspace-business-data";
import { WorkspaceBusinessPageHeader } from "@/components/business/workspace-business-page-header";
import { SubmitSpendModal } from "@/components/business/submit-spend-modal";

const card = "rounded-m-card border border-surface-300/80 bg-surface-100/95 p-m-4 shadow-sm";

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
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
        setLocalErr(e instanceof Error ? e.message : "Could not add expense");
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
    return (
      <div className={`${card} border-urgency-high/30 bg-bg2`}>
        <p className="text-[15px] font-semibold text-urgency-high">Could not open this workspace</p>
        <p className="mt-2 text-[13px] text-ink-2">{error ?? "Something went wrong."}</p>
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

  const scrollToPayables = () => {
    document.getElementById("section-payables")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onNextStepCta = () => {
    if (vm.nextStep?.onPress === "scroll_payables") scrollToPayables();
  };

  return (
    <div className="space-y-m-5 pb-28 lg:pb-m-8">
      <WorkspaceBusinessPageHeader
        workspaceId={workspaceId}
        workspaceTitle={workspace.title}
        workspaces={workspaces}
        subtitle="Track cash, dues, and daily business movement — built for small shops and growing units."
        onQuickAdd={() => setShowSpend(true)}
      />

      {localErr ? (
        <p className="rounded-m-chip border border-urgency-high/35 bg-bg2 px-m-3 py-m-2 text-[13px] text-urgency-high">
          {localErr}
        </p>
      ) : null}

      {/* Today hero */}
      <section className={`${card} ring-1 ${heroCls.ring}`}>
        <div className="flex flex-wrap items-start justify-between gap-m-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">Today</p>
            <h2 className="mt-1 text-[20px] font-semibold text-ink">Where you stand</h2>
            <p className="mt-2 text-[14px] text-ink-2">{vm.hero.statusLine}</p>
          </div>
          <span className={`inline-flex items-center rounded-m-badge px-m-3 py-1.5 text-[12px] font-semibold ${heroCls.bg} ${heroCls.text}`}>
            {vm.hero.healthLabel}
          </span>
        </div>
        <div className="mt-m-4 grid gap-m-3 sm:grid-cols-3">
          <div className="rounded-m-chip border border-surface-300/80 bg-bg2/80 p-m-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Cash in hand</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">{vm.hero.cashInHandLabel}</p>
            <p className="mt-1 text-[11px] text-ink-3">{vm.hero.cashInHandSub}</p>
          </div>
          <div className="rounded-m-chip border border-surface-300/80 bg-bg2/80 p-m-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Incoming</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">{vm.hero.incomingLabel}</p>
            <p className="mt-1 text-[11px] text-ink-3">{vm.hero.incomingSub}</p>
          </div>
          <div className="rounded-m-chip border border-surface-300/80 bg-bg2/80 p-m-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Outgoing</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">{vm.hero.outgoingLabel}</p>
            <p className="mt-1 text-[11px] text-ink-3">{vm.hero.outgoingSub}</p>
          </div>
        </div>
      </section>

      {/* Next step */}
      {vm.nextStep ? (
        <section className={`${card} border-slate-700/10 bg-gradient-to-br from-slate-900/[0.03] to-sky-900/[0.04]`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">Recommended next step</p>
          <h3 className="mt-2 text-[17px] font-semibold leading-snug text-ink">{vm.nextStep.title}</h3>
          <p className="mt-2 text-[14px] text-ink-2">{vm.nextStep.reason}</p>
          <button
            type="button"
            onClick={onNextStepCta}
            className="mt-m-4 inline-flex min-h-[44px] items-center rounded-m-cta bg-slate-900 px-m-4 text-[14px] font-semibold text-white hover:bg-slate-800"
          >
            {vm.nextStep.ctaLabel}
          </button>
        </section>
      ) : null}

      {/* Daily summary */}
      <section className={card}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">Daily summary</p>
        <h3 className="mt-1 text-[16px] font-semibold text-ink">Today&apos;s movement</h3>
        <div className="mt-m-4 grid gap-m-3 sm:grid-cols-3">
          <div className="rounded-m-chip border border-emerald-500/15 bg-emerald-500/[0.06] p-m-3">
            <p className="text-[11px] font-medium text-emerald-900/80">Sales (cleared)</p>
            <p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{vm.daily.salesApproxLabel}</p>
            <p className="mt-1 text-[11px] text-ink-3">Approved spends recorded today</p>
          </div>
          <div className="rounded-m-chip border border-rose-500/15 bg-rose-500/[0.05] p-m-3">
            <p className="text-[11px] font-medium text-rose-900/80">Expense requests</p>
            <p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{vm.daily.expensesLabel}</p>
            <p className="mt-1 text-[11px] text-ink-3">Submitted today</p>
          </div>
          <div
            className={`rounded-m-chip border p-m-3 ${
              vm.daily.netPositive
                ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                : "border-amber-500/25 bg-amber-500/[0.06]"
            }`}
          >
            <p className="text-[11px] font-medium text-ink-2">Net (simple view)</p>
            <p className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{vm.daily.netLabel}</p>
            <p className="mt-1 text-[11px] text-ink-3">Cleared − today&apos;s requests</p>
          </div>
        </div>
      </section>

      {/* Pay / Collect */}
      <div className="grid gap-m-4 lg:grid-cols-2">
        <section id="section-payables" className={card}>
          <div className="flex items-center justify-between gap-m-2">
            <h3 className="text-[16px] font-semibold text-ink">To pay</h3>
            <Link
              href={`/workspaces/${workspaceId}/business/payables`}
              className="text-[12px] font-semibold text-ctx-accent hover:underline"
            >
              View all
            </Link>
          </div>
          <p className="mt-1 text-[13px] text-ink-3">Supplier payments waiting for your approval</p>
          <ul className="mt-m-4 space-y-m-3">
            {vm.payables.length === 0 ? (
              <li className="rounded-m-chip border border-dashed border-surface-300 bg-bg2/60 px-m-3 py-m-4 text-[13px] text-ink-3">
                No supplier payments due in this workspace right now.
              </li>
            ) : (
              vm.payables.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-m-2 rounded-m-chip border border-surface-300/90 bg-bg2/70 p-m-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{p.name}</p>
                    <p className="text-[12px] text-ink-3">{p.dueLine}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold tabular-nums text-ink">{bizMoney(p.amount, workspace.currency)}</span>
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
            <h3 className="text-[16px] font-semibold text-ink">To collect</h3>
            <Link
              href={`/workspaces/${workspaceId}/business/receivables`}
              className="text-[12px] font-semibold text-ctx-accent hover:underline"
            >
              View all
            </Link>
          </div>
          <p className="mt-1 text-[13px] text-ink-3">Money customers owe you</p>
          <div className="mt-m-4 rounded-m-chip border border-dashed border-surface-300 bg-bg2/60 px-m-3 py-m-4">
            <p className="text-[14px] font-medium text-ink">Collections are not wired yet</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
              When your billing feed connects, customer dues will show here. You can still track spends and approvals
              today.
            </p>
            <Link
              href={`/workspaces/${workspaceId}/business/receivables`}
              className="mt-m-3 inline-flex text-[13px] font-semibold text-ctx-accent hover:underline"
            >
              Learn more
            </Link>
          </div>
        </section>
      </div>

      {/* Recent */}
      <section className={card}>
        <div className="flex items-center justify-between gap-m-2">
          <h3 className="text-[16px] font-semibold text-ink">Recent transactions</h3>
          <Link
            href={`/workspaces/${workspaceId}/business/transactions`}
            className="text-[12px] font-semibold text-ctx-accent hover:underline"
          >
            Open log
          </Link>
        </div>
        <ul className="mt-m-3 divide-y divide-surface-300/60">
          {vm.recent.length === 0 ? (
            <li className="py-m-4 text-[13px] text-ink-3">No transactions yet in this workspace.</li>
          ) : (
            vm.recent.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-m-3 py-m-3">
                <div>
                  <p className="text-[14px] font-medium text-ink">{r.title}</p>
                  <p className="text-[12px] text-ink-3">
                    {r.type === "expense"
                      ? "Expense"
                      : r.type === "payment"
                        ? "Payment"
                        : r.type === "collection"
                          ? "Collection"
                          : r.type === "sale"
                            ? "Sale"
                            : "Update"}{" "}
                    · {formatBizDateShort(r.when)}
                  </p>
                  {r.meta ? <p className="text-[11px] text-ink-4">{r.meta}</p> : null}
                </div>
                {r.amount > 0 ? (
                  <span className="shrink-0 text-[14px] font-semibold tabular-nums text-ink">{bizMoney(r.amount, workspace.currency)}</span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Outlook */}
      <section className={card}>
        <h3 className="text-[16px] font-semibold text-ink">Short cash outlook</h3>
        <p className="mt-1 text-[13px] text-ink-3">Next three days — based on today&apos;s queue and plan headroom</p>
        <div className="mt-m-4 overflow-x-auto">
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
                <tr key={row.label} className="border-b border-surface-300/50">
                  <td className="py-m-2 pr-m-2 font-medium text-ink">{row.label}</td>
                  <td className="py-m-2 pr-m-2 text-ink-2">{row.incoming}</td>
                  <td className="py-m-2 pr-m-2 tabular-nums text-ink">{row.outgoing}</td>
                  <td className="py-m-2 text-ink-3">{row.gapLine}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Inventory snapshot */}
      <section className={card}>
        <div className="flex items-center justify-between gap-m-2">
          <h3 className="text-[16px] font-semibold text-ink">Stock & units</h3>
          <Link
            href={`/workspaces/${workspaceId}/business/inventory`}
            className="text-[12px] font-semibold text-ctx-accent hover:underline"
          >
            Details
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
            Stock counts will show here when inventory is connected. Unit budgets help you spot pressure early.
          </p>
        )}
      </section>

      {rejectId ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-m-4">
          <div className="w-full max-w-md rounded-m-card border border-surface-300 bg-bg p-m-4">
            <p className="text-[15px] font-semibold text-ink">Reject this payment?</p>
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
        open={showSpend}
        units={units}
        costCenters={costCenters}
        vendors={vendors}
        onClose={() => setShowSpend(false)}
        onSubmit={(body) => void submitSpend(body)}
      />

      {/* Sticky quick actions (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-300/80 bg-bg/95 px-m-3 py-m-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between gap-1.5">
          <QuickBtn label="Sale" onClick={() => router.push(`/workspaces/${workspaceId}/business/transactions`)} />
          <QuickBtn label="Expense" onClick={() => setShowSpend(true)} />
          <QuickBtn label="Pay" onClick={scrollToPayables} />
          <QuickBtn
            label="Collect"
            onClick={() => router.push(`/workspaces/${workspaceId}/business/receivables`)}
          />
        </div>
      </div>
    </div>
  );
}

function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[48px] flex-1 flex-col items-center justify-center rounded-m-chip border border-surface-300 bg-surface-100 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink active:scale-[0.98]"
    >
      {label}
    </button>
  );
}
