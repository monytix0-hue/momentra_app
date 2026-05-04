"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  applyGroupRecurringExpenses,
  createGroupRecurringExpense,
  deleteGroupRecurringExpense,
  patchGroupRecurringExpense,
  type GroupParticipant,
  type GroupRecurringExpense,
} from "@/lib/api/group";

const btn =
  "inline-flex min-h-[36px] items-center justify-center rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink transition-[border-color,background-color] duration-fast hover:border-ctx-border/40 hover:bg-surface-200";

const inputCls =
  "w-full rounded-m-chip border border-surface-300 bg-surface-100 px-m-3 py-2 text-[13px] text-ink placeholder:text-ink-4";

const fieldLabel = "mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3";

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function num(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export function RecurringExpensesPanel({
  groupId,
  recurring,
  activeParticipants,
  isAdmin,
  activeCycleLabel,
  onRefresh,
}: {
  groupId: string;
  recurring: GroupRecurringExpense[];
  activeParticipants: GroupParticipant[];
  isAdmin: boolean;
  activeCycleLabel: string | null;
  onRefresh: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [applyMsg, setApplyMsg] = useState<string | null>(null);

  const payerName = useCallback(
    (id: string) => activeParticipants.find((p) => p.participant_id === id)?.display_name ?? "Member",
    [activeParticipants],
  );

  const onAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    const amt = parseFloat(amount);
    if (!title.trim() || !paidBy || !Number.isFinite(amt) || amt <= 0) {
      setLocalErr("Enter title, amount, and who paid.");
      return;
    }
    setBusy(true);
    setLocalErr(null);
    try {
      const token = await user.getIdToken();
      await createGroupRecurringExpense(token, groupId, {
        title: title.trim(),
        amount: amt,
        paid_by_participant_id: paidBy,
        split_rule: "equal",
        shares: [],
        is_active: true,
      });
      setTitle("");
      setAmount("");
      setPaidBy("");
      await onRefresh();
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (r: GroupRecurringExpense, next: boolean) => {
    if (!user || !isAdmin) return;
    setLocalErr(null);
    try {
      const token = await user.getIdToken();
      await patchGroupRecurringExpense(token, groupId, r.recurring_id, { is_active: next });
      await onRefresh();
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : "Update failed");
    }
  };

  const onDelete = async (r: GroupRecurringExpense) => {
    if (!user || !isAdmin) return;
    if (!confirm(`Remove recurring template «${r.title}»?`)) return;
    setLocalErr(null);
    try {
      const token = await user.getIdToken();
      await deleteGroupRecurringExpense(token, groupId, r.recurring_id);
      await onRefresh();
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const onApply = async () => {
    if (!user || !isAdmin) return;
    setBusy(true);
    setLocalErr(null);
    setApplyMsg(null);
    try {
      const token = await user.getIdToken();
      const out = await applyGroupRecurringExpenses(token, groupId, {});
      setApplyMsg(
        `Added ${out.created_count} expense(s); skipped ${out.skipped_count} (already in cycle or invalid).`,
      );
      await onRefresh();
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-m-card border border-surface-300 bg-surface-100/80 p-m-4">
      <div className="flex flex-wrap items-start justify-between gap-m-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ctx-accent">Recurring expenses</p>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-ink-3">
            Templates align with each billing cycle (month or week). When you roll a new cycle, active templates
            become real expenses automatically. You can also materialize them for the current cycle below.
            {activeCycleLabel ? (
              <>
                {" "}
                Active cycle: <span className="font-medium text-ink">{activeCycleLabel}</span>
              </>
            ) : null}
          </p>
        </div>
        {isAdmin ? (
          <button type="button" className={btn} disabled={busy} onClick={() => void onApply()}>
            Add to current cycle
          </button>
        ) : null}
      </div>
      {applyMsg ? <p className="mt-m-2 text-[12px] text-status-paid-fg">{applyMsg}</p> : null}
      {localErr ? (
        <p className="mt-m-2 text-[12px] text-urgency-high" role="alert">
          {localErr}
        </p>
      ) : null}

      {recurring.length > 0 ? (
        <ul className="mt-m-4 space-y-m-2">
          {recurring.map((r) => (
            <li
              key={r.recurring_id}
              className="flex flex-col gap-m-2 rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-m-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{r.title}</p>
                <p className="text-[11px] text-ink-3">
                  {money(num(r.amount))} · Paid by {payerName(r.paid_by_participant_id)} ·{" "}
                  <span className="capitalize">{r.split_rule.replace(/_/g, " ")}</span>
                  {!r.is_active ? <span className="text-status-pending-fg"> · Paused</span> : null}
                </p>
              </div>
              {isAdmin ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-ink-2">
                    <input
                      type="checkbox"
                      checked={r.is_active}
                      onChange={(e) => void toggleActive(r, e.target.checked)}
                    />
                    Active
                  </label>
                  <button type="button" className={btn} onClick={() => void onDelete(r)}>
                    Remove
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-m-3 text-[12px] text-ink-3">No recurring templates yet.</p>
      )}

      {isAdmin && activeParticipants.length > 0 ? (
        <form
          onSubmit={(e) => void onAddTemplate(e)}
          className="mt-m-4 grid gap-m-3 border-t border-rule pt-m-4 sm:grid-cols-2"
        >
          <p className="sm:col-span-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">
            New template (equal split among active members)
          </p>
          <div>
            <label className={fieldLabel} htmlFor="rec-title">
              Title
            </label>
            <input
              id="rec-title"
              className={inputCls}
              placeholder="Rent, utilities, subscription…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="rec-amt">
              Amount
            </label>
            <input
              id="rec-amt"
              className={inputCls}
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={fieldLabel} htmlFor="rec-payer">
              Paid by
            </label>
            <select
              id="rec-payer"
              className={inputCls}
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              <option value="">Select member</option>
              {activeParticipants.map((p) => (
                <option key={p.participant_id} value={p.participant_id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className={btn} disabled={busy}>
              Save template
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
