"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  createGroupExpense,
  fetchGroupActivity,
  fetchGroupCommitments,
  fetchGroupDetail,
  fetchGroupExpenses,
  fetchGroupMemberMoneySummary,
  fetchGroupPositions,
  payCommitment,
  postGroupReminder,
  type GroupExpense,
  type GroupMomentDetail,
} from "@/lib/api/group";
import { mapGroupDetailFromApi, type MapViewModelInput } from "@/lib/group/map-group-to-view-model";
import { formatInr } from "@/lib/group/selectors";
import type { GroupDetailViewModel, GroupMemberCardModel } from "@/lib/group/types";
import { GroupActionBar } from "@/components/group/GroupActionBar";
import { GroupActivityFeed } from "@/components/group/GroupActivityFeed";
import { GroupExpensesSnapshot } from "@/components/group/GroupExpensesSnapshot";
import { GroupInvitePanel } from "@/components/group/group-invite-panel";
import { GroupMembersSection } from "@/components/group/GroupMembersSection";
import { GroupDetailSkeleton } from "@/components/group/GroupDetailSkeleton";
import { GroupHubError } from "@/components/group/GroupHubError";
import { GroupSummaryHero } from "@/components/group/GroupSummaryHero";
import { ExpenseList } from "@/components/group/expense-list";
import { GROUP_EXPENSE_CATEGORY_OPTIONS } from "@/lib/group/expense-categories";
import { groupBackChip, groupBtnPrimary, groupPanelElevated, groupSectionTitle } from "@/lib/group/group-ui";

const field =
  "w-full rounded-m-chip border border-surface-300 bg-surface-100 px-m-3 py-2.5 text-[14px] text-ink placeholder:text-ink-4 focus:border-ctx-accent/50 focus:outline-none focus:ring-2 focus:ring-ctx-accent/25";

type ParticipantOption = { participant_id: string; display_name: string };

export function GroupDetailExperience({ groupId }: { groupId: string }) {
  const { user, loading: authLoading } = useAuth();
  const [detail, setDetail] = useState<GroupMomentDetail | null>(null);
  const [expensesList, setExpensesList] = useState<GroupExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [vm, setVm] = useState<GroupDetailViewModel | null>(null);
  const [memberSummaryErr, setMemberSummaryErr] = useState<string | null>(null);

  const [sheet, setSheet] = useState<null | "expense" | "payment">(null);
  const [busy, setBusy] = useState(false);

  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseSubcategory, setExpenseSubcategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaidBy, setExpensePaidBy] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [payAmount, setPayAmount] = useState("");
  const [payMember, setPayMember] = useState<GroupMemberCardModel | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErr(null);
    setMemberSummaryErr(null);
    try {
      const token = await user.getIdToken();
      const [d, c, e, a, pos] = await Promise.all([
        fetchGroupDetail(token, groupId),
        fetchGroupCommitments(token, groupId),
        fetchGroupExpenses(token, groupId),
        fetchGroupActivity(token, groupId),
        fetchGroupPositions(token, groupId),
      ]);
      setDetail(d);
      setExpensesList(e);
      let memberSummary: MapViewModelInput["memberSummary"] = null;
      let msErr: string | null = null;
      try {
        const ms = await fetchGroupMemberMoneySummary(token, groupId);
        memberSummary = ms.members;
      } catch (er) {
        msErr = er instanceof Error ? er.message : "Could not load member money summary";
      }
      setMemberSummaryErr(msErr);
      const input: MapViewModelInput = {
        detail: d,
        commitments: c,
        expenses: e,
        positions: pos,
        activity: a,
        currentUserId: user.uid,
        memberSummary,
      };
      setVm(mapGroupDetailFromApi(input));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load this group");
      setVm(null);
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load, groupId]);

  const payerNames = useMemo(() => {
    const m = new Map<string, string>();
    if (detail) {
      detail.participants.forEach((p) => m.set(p.participant_id, p.display_name));
    } else if (vm) {
      vm.members.forEach((mem) => m.set(mem.participantId, mem.displayName));
    }
    return m;
  }, [detail, vm]);

  const participantOptions: ParticipantOption[] = useMemo(() => {
    if (detail) {
      return detail.participants.filter((p) => p.status === "active").map((p) => ({ participant_id: p.participant_id, display_name: p.display_name }));
    }
    return [];
  }, [detail]);

  const onRefreshAfterMutation = useCallback(async () => {
    await load();
  }, [load]);

  const onMemberAction = useCallback(
    (member: GroupMemberCardModel, kind: GroupMemberCardModel["suggestedAction"]) => {
      setInfo(null);
      if (kind === "view") {
        setInfo(
          "Each card shows pool contributions separately from shared bills. Recent expenses below are the running bill log.",
        );
        return;
      }
      if (kind === "settle") {
        setInfo("Settle outside the app (UPI, bank, cash), then record a payment here when you’re ready.");
        document.getElementById("group-people")?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      if (kind === "remind" && vm?.isAdmin) {
        void (async () => {
          if (!user) {
            setInfo("Sign in to send a reminder.");
            return;
          }
          setBusy(true);
          try {
            const token = await user.getIdToken();
            const d = detail ?? (await fetchGroupDetail(token, groupId));
            await postGroupReminder(token, groupId, {
              participant_id: member.participantId,
              reminder_type: "commitment_due",
              message: `Friendly check-in: your share for «${d.title}» is still open. Thanks!`,
              cycle_id: d.active_cycle?.cycle_id ?? null,
            });
            setInfo("Reminder sent — warm and low pressure.");
            await load();
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Reminder failed");
          } finally {
            setBusy(false);
          }
        })();
        return;
      }
      if (kind === "pay_now" || kind === "mark_paid") {
        if (!member.primaryCommitmentId) {
          setInfo("There isn’t a contribution line to record against yet — ask an organizer to set a plan.");
          return;
        }
        setPayMember(member);
        setPayAmount(member.pending > 0 ? String(Math.round(member.pending)) : "");
        setSheet("payment");
      }
    },
    [user, vm?.isAdmin, detail, groupId, load],
  );

  const submitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setInfo("Sign in to record expenses.");
      setSheet(null);
      return;
    }
    const amount = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || !expensePaidBy || !Number.isFinite(amount) || amount <= 0) {
      setErr("Add a title, amount, and who paid.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      const d = detail ?? (await fetchGroupDetail(token, groupId));
      await createGroupExpense(token, groupId, {
        title: expenseTitle.trim(),
        amount,
        paid_by_participant_id: expensePaidBy,
        category: expenseCategory.trim() || null,
        subcategory: expenseSubcategory.trim() || null,
        expense_date: expenseDate,
        cycle_id: d.active_cycle?.cycle_id ?? null,
        split_rule: "equal",
      });
      setExpenseTitle("");
      setExpenseCategory("");
      setExpenseSubcategory("");
      setExpenseAmount("");
      setSheet(null);
      await load();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Could not add expense");
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !payMember?.primaryCommitmentId) {
      setInfo("Sign in to record a payment.");
      setSheet(null);
      return;
    }
    const amount = parseFloat(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr("Enter a valid amount.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      await payCommitment(token, groupId, payMember.primaryCommitmentId, amount);
      setPayMember(null);
      setPayAmount("");
      setSheet(null);
      await load();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Could not record payment");
    } finally {
      setBusy(false);
    }
  };

  const scrollInvite = () => {
    document.getElementById("group-invite-slot")?.scrollIntoView({ behavior: "smooth" });
  };

  const sendBulkReminder = async () => {
    if (!vm || !user) {
      setInfo("Sign in to send reminders.");
      return;
    }
    const target = vm.members.find(
      (m) => m.pending > 0.01 && m.participantId !== vm.currentUserParticipantId,
    );
    if (!target) {
      setInfo("No pending balances to nudge right now.");
      return;
    }
    if (!vm.isAdmin) {
      setInfo("Only an organizer can send reminders to others — you can still record your own payment.");
      return;
    }
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const d = detail ?? (await fetchGroupDetail(token, groupId));
      await postGroupReminder(token, groupId, {
        participant_id: target.participantId,
        reminder_type: "commitment_due",
        message: `Friendly check-in: your share for «${d.title}» is still open. Thanks!`,
        cycle_id: d.active_cycle?.cycle_id ?? null,
      });
      setInfo("Sent a gentle reminder.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send");
    } finally {
      setBusy(false);
    }
  };

  const scrollExpensesFull = () => {
    document.getElementById("group-expenses-full")?.scrollIntoView({ behavior: "smooth" });
  };

  const openExpense = () => {
    const first = participantOptions[0]?.participant_id ?? "";
    if (!expensePaidBy && first) setExpensePaidBy(first);
    setExpenseCategory("");
    setExpenseSubcategory("");
    setSheet("expense");
  };

  if (authLoading) {
    return <GroupDetailSkeleton />;
  }

  if (!user) {
    return (
      <div className={`${groupPanelElevated} px-m-8 py-m-9 text-center`}>
        <p className="text-[16px] font-medium text-ink">Sign in to open this group</p>
        <p className="mt-m-2 text-[14px] leading-relaxed text-ink-3">Numbers and invites are visible only to members.</p>
        <Link
          href={`/login?next=${encodeURIComponent(`/group/${groupId}`)}`}
          className={`${groupBtnPrimary} mx-auto mt-m-6 w-full max-w-[280px]`}
        >
          Continue
        </Link>
      </div>
    );
  }

  if (loading) {
    return <GroupDetailSkeleton />;
  }

  if (err && !vm) {
    return (
      <GroupHubError title="We couldn’t load this group" message={err} onRetry={() => void load()} />
    );
  }

  if (!vm) {
    return <GroupDetailSkeleton />;
  }

  return (
    <div className="pb-28 md:pb-24">
      <div className="mb-m-5">
        <Link href="/group" className={groupBackChip}>
          <span aria-hidden>←</span> All groups
        </Link>
      </div>

      {err ? (
        <p className="mb-m-4 rounded-m-card border border-urgency-high/35 bg-bg2 px-m-3 py-m-2 text-[13px] text-urgency-high" role="alert">
          {err}
        </p>
      ) : null}
      {info ? (
        <p className="mb-m-4 rounded-m-card border border-ctx-accent/25 bg-ctx-accent/[0.06] px-m-3 py-m-2 text-[13px] text-ink-2" role="status">
          {info}
        </p>
      ) : null}

      <GroupSummaryHero vm={vm} />

      {vm.isAdmin ? (
        <section id="group-invite-slot" className="mt-m-8 scroll-mt-24 md:mt-m-10">
          <h2 className={`${groupSectionTitle} mb-m-3`}>Invite people</h2>
          <GroupInvitePanel groupId={groupId} isAdmin onCreated={() => void onRefreshAfterMutation()} />
        </section>
      ) : (
        <p className="mt-m-6 rounded-m-card border border-surface-300/85 bg-bg2/45 px-m-4 py-m-3 text-[14px] leading-relaxed text-ink-3">
          Only an organizer can add people here. Need someone in? Ask an organizer to send an invite.
        </p>
      )}

      <div className="mt-m-8 md:mt-m-10">
        <GroupMembersSection
          members={vm.members}
          onMemberAction={onMemberAction}
          summaryError={memberSummaryErr}
        />
      </div>

      <div className="mt-m-8 md:mt-m-10">
        <GroupExpensesSnapshot
          items={vm.recentExpenses}
          totalCount={expensesList.length}
          onViewAll={scrollExpensesFull}
        />
      </div>

      <div id="group-expenses-full" className="mt-m-8 scroll-mt-24 md:mt-m-10">
        <h2 className={`${groupSectionTitle} mb-m-3`}>All expenses</h2>
        <p className="mb-m-3 max-w-xl text-[13px] text-ink-3">Itemized shared expenses and splits — separate from the pool contribution cards.</p>
        <ExpenseList expenses={expensesList} payerNames={payerNames} hideIntro />
      </div>

      <div className="mt-m-8 md:mt-m-10">
        <GroupActivityFeed items={vm.activity} />
      </div>

      <GroupActionBar
        onAddExpense={openExpense}
        onRecordPayment={() => {
          const self = vm.members.find((m) => m.participantId === vm.currentUserParticipantId);
          if (self && self.pending > 0.01 && self.primaryCommitmentId) {
            setPayMember(self);
            setPayAmount(String(Math.round(self.pending)));
            setSheet("payment");
          } else {
            setInfo("Choose someone with an open contribution above, or ask an organizer to record a payment.");
            document.getElementById("group-people")?.scrollIntoView({ behavior: "smooth" });
          }
        }}
        onInvite={scrollInvite}
        onSendReminder={sendBulkReminder}
        onSettle={() => {
          setInfo("Settle informally, then record it here so everyone stays aligned.");
          document.getElementById("group-people")?.scrollIntoView({ behavior: "smooth" });
        }}
        showInvite={vm.isAdmin}
        showSettle={vm.fundingModel !== "pooled" || vm.openShareDebt > 0.01}
      />

      {sheet === "expense" ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-m-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="expense-sheet-title"
        >
          <div className="w-full max-w-md rounded-m-hero border border-surface-300 bg-ctx-surface p-m-5 shadow-xl">
            <h2 id="expense-sheet-title" className="text-lg font-semibold text-ink">
              Add expense
            </h2>
            <p className="mt-1 text-[13px] text-ink-3">Split equally across everyone — fair and fast.</p>
            <form onSubmit={submitExpense} className="mt-m-4 space-y-m-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-3" htmlFor="exp-title">
                  What was it?
                </label>
                <input
                  id="exp-title"
                  className={field}
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="Dinner, cab, tickets…"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-3" htmlFor="exp-cat">
                  Category
                </label>
                <select
                  id="exp-cat"
                  className={field}
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                >
                  {GROUP_EXPENSE_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value || "general"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-3" htmlFor="exp-subcat">
                  Subcategory <span className="font-normal normal-case text-ink-4">(optional)</span>
                </label>
                <input
                  id="exp-subcat"
                  className={field}
                  value={expenseSubcategory}
                  onChange={(e) => setExpenseSubcategory(e.target.value)}
                  placeholder="e.g. Movies, Uber, Hotel"
                  maxLength={80}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-3" htmlFor="exp-amt">
                  Amount (₹)
                </label>
                <input
                  id="exp-amt"
                  className={field}
                  inputMode="decimal"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-3" htmlFor="exp-payer">
                  Who paid?
                </label>
                <select
                  id="exp-payer"
                  className={field}
                  value={expensePaidBy}
                  onChange={(e) => setExpensePaidBy(e.target.value)}
                >
                  {participantOptions.map((p) => (
                    <option key={p.participant_id} value={p.participant_id}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-3" htmlFor="exp-date">
                  Date
                </label>
                <input
                  id="exp-date"
                  type="date"
                  className={field}
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-m-2">
                <button
                  type="button"
                  className="flex-1 rounded-m-chip border border-surface-300 py-2.5 text-[12px] font-semibold text-ink"
                  onClick={() => setSheet(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-m-chip bg-gradient-to-br from-ctx-accent to-ctx-accent-end py-2.5 text-[12px] font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {sheet === "payment" && payMember ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-m-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="pay-sheet-title"
        >
          <div className="w-full max-w-md rounded-m-hero border border-surface-300 bg-ctx-surface p-m-5 shadow-xl">
            <h2 id="pay-sheet-title" className="text-lg font-semibold text-ink">
              Record payment
            </h2>
            <p className="mt-1 text-[13px] text-ink-3">
              {payMember.displayName} — {formatInr(payMember.pending)} still open
            </p>
            <form onSubmit={submitPayment} className="mt-m-4 space-y-m-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-3" htmlFor="pay-amt">
                  Amount received (₹)
                </label>
                <input
                  id="pay-amt"
                  className={field}
                  inputMode="decimal"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-m-2">
                <button
                  type="button"
                  className="flex-1 rounded-m-chip border border-surface-300 py-2.5 text-[12px] font-semibold text-ink"
                  onClick={() => {
                    setSheet(null);
                    setPayMember(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !payMember.primaryCommitmentId}
                  className="flex-1 rounded-m-chip bg-gradient-to-br from-ctx-accent to-ctx-accent-end py-2.5 text-[12px] font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
