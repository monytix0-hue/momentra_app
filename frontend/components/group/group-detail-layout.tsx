"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  createGroupExpense,
  deleteGroupCommitment,
  fetchGroupActivity,
  fetchGroupCommitments,
  fetchGroupDetail,
  fetchGroupExpenses,
  fetchGroupPositions,
  fetchGroupRecurringExpenses,
  generateNextGroupCycle,
  payCommitment,
  postGroupReminder,
  updateGroupCommitment,
  type GroupCommitment,
  type GroupMomentDetail,
  type GroupPosition,
  type GroupRecurringExpense,
} from "@/lib/api/group";
import {
  fetchTransactionCategories,
  type PersonalTxnCategory,
} from "@/lib/api/personal";
import { ActivityTimeline } from "@/components/group/activity-timeline";
import { ExpenseList } from "@/components/group/expense-list";
import { GroupCoordinationActionStrip } from "@/components/group/group-coordination-action-strip";
import { GroupCoordinationPeople } from "@/components/group/group-coordination-people";
import { GroupCycleCoordinationBlock } from "@/components/group/group-cycle-coordination-block";
import { GroupRecentMovementPreview } from "@/components/group/group-recent-movement-preview";
import { GroupSplitRuleCard } from "@/components/group/group-split-rule-card";
import { RecurringExpensesPanel } from "@/components/group/recurring-expenses-panel";
import {
  commitmentSourceCaption,
  commitmentsForScope,
  coordinationHealth,
  daysLeftInCycle,
  healthBadgeClass,
  healthLabel,
  poolProgressPct,
  summaryInterpretation,
} from "@/lib/group/group-detail-coordination";
import { getGroupUxProfileFromDetail } from "@/lib/group/group-ux-profile";

const btn =
  "inline-flex min-h-[40px] items-center justify-center rounded-m-chip border border-surface-300 bg-bg2 px-m-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink transition-[border-color,background-color] duration-fast ease-standard hover:border-ctx-border/40 hover:bg-surface-200";

const linkBack =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-m-chip border-2 border-ctx-border bg-bg2 px-m-4 py-2.5 text-[12px] font-semibold text-ctx-text shadow-sm transition-[border-color,background-color] duration-fast ease-standard hover:border-ctx-accent hover:bg-surface-200";

const btnGhost =
  "inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-m-chip border-2 border-ctx-border/70 bg-bg2 px-m-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ctx-text transition-[border-color,background-color] duration-fast ease-standard hover:border-ctx-accent/80 hover:bg-surface-200";

const btnPrimary =
  "inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-ctx-accent to-ctx-accent-end px-m-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_0_20px_-10px_var(--ctx-accent)] transition-[opacity,transform] duration-fast ease-standard hover:opacity-95 active:scale-[0.99]";

function SectionRule({ title }: { title: string }) {
  return (
    <div className="mb-m-4 flex items-center gap-m-3">
      <h2 className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-ctx-accent">{title}</h2>
      <div className="h-px flex-1 bg-rule" />
    </div>
  );
}

function GroupSurfaceCard({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-m-hero border border-surface-300 bg-surface-100 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_20%,transparent)] ${className}`}
      style={style}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
        style={{
          background: "linear-gradient(90deg, transparent, var(--ctx-accent), transparent)",
        }}
      />
      {children}
    </div>
  );
}

function num(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function moneyDetail(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Match backend `group_service.create_expense` equal split: base = round(total/n, 0.01), remainder on first participant. */
function equalShareAmountsCents(totalCents: number, n: number): number[] {
  if (n <= 0) return [];
  const totalInr = totalCents / 100;
  const baseInr = Math.round((totalInr / n) * 100) / 100;
  const baseCents = Math.round(baseInr * 100);
  const rem = totalCents - baseCents * n;
  const out = Array.from({ length: n }, () => baseCents);
  out[0] += rem;
  return out;
}

const fieldLabel = "mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3";
const inputCls =
  "w-full rounded-m-chip border border-surface-300 bg-surface-100 px-m-3 py-2 text-[13px] text-ink placeholder:text-ink-4";

function statusTone(status: string) {
  if (status === "active") return "text-ctx-text border-ctx-accent/35 bg-ctx-accent/12";
  if (status === "completed") return "text-status-paid-fg border-status-paid-fg/30 bg-status-paid-fg/10";
  return "text-status-pending-fg border-status-pending-fg/30 bg-status-pending-fg/10";
}

type Tab = "overview" | "commitments" | "expenses" | "activity" | "positions";

export function GroupDetailLayout({ groupId }: { groupId: string }) {
  const { user, loading: authLoading } = useAuth();
  const [detail, setDetail] = useState<GroupMomentDetail | null>(null);
  const [commitments, setCommitments] = useState<GroupCommitment[]>([]);
  const [expenses, setExpenses] = useState<Awaited<ReturnType<typeof fetchGroupExpenses>>>([]);
  const [recurring, setRecurring] = useState<GroupRecurringExpense[]>([]);
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof fetchGroupActivity>>>([]);
  const [positions, setPositions] = useState<GroupPosition[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [err, setErr] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<GroupCommitment | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaidBy, setExpensePaidBy] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseSubcategory, setExpenseSubcategory] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseCategories, setExpenseCategories] = useState<PersonalTxnCategory[]>([]);
  const [splitRule, setSplitRule] = useState<"equal" | "custom_amounts" | "percentages">("equal");
  const [splitInputs, setSplitInputs] = useState<Record<string, string>>({});
  /** When false on pool_focus groups, expense form only shows equal split (advanced = custom/%). */
  const [showAdvancedExpenseSplit, setShowAdvancedExpenseSplit] = useState(false);
  const [cycleGenBusy, setCycleGenBusy] = useState(false);
  const [commitmentEditId, setCommitmentEditId] = useState<string | null>(null);
  const [editCommitted, setEditCommitted] = useState("");
  const [editDue, setEditDue] = useState("");
  const [commitmentActionBusy, setCommitmentActionBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    setErr(null);
    try {
      const [d, c, e, a, rec, pos] = await Promise.all([
        fetchGroupDetail(token, groupId),
        fetchGroupCommitments(token, groupId),
        fetchGroupExpenses(token, groupId),
        fetchGroupActivity(token, groupId),
        fetchGroupRecurringExpenses(token, groupId),
        fetchGroupPositions(token, groupId),
      ]);
      setDetail(d);
      setCommitments(c);
      setExpenses(e);
      setActivity(a);
      setRecurring(rec);
      setPositions(pos);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, [user, groupId]);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  useEffect(() => {
    setShowAdvancedExpenseSplit(false);
  }, [groupId]);

  useEffect(() => {
    if (!showExpenseForm) setShowAdvancedExpenseSplit(false);
  }, [showExpenseForm]);

  const payerNames = useMemo(() => {
    const m = new Map<string, string>();
    detail?.participants.forEach((p) => m.set(p.participant_id, p.display_name));
    return m;
  }, [detail]);

  const uxProfile = useMemo(() => (detail ? getGroupUxProfileFromDetail(detail) : null), [detail]);

  const activeParticipants = useMemo(
    () => (detail?.participants ?? []).filter((p) => p.status === "active"),
    [detail],
  );

  const isGroupAdmin = useMemo(() => {
    if (!user || !detail) return false;
    return detail.participants.some(
      (p) => p.user_id === user.uid && p.status === "active" && p.role === "admin",
    );
  }, [user, detail]);
  const peopleSectionRef = useRef<HTMLDivElement>(null);
  const invitedPendingCount = useMemo(
    () => (detail?.participants ?? []).filter((p) => p.status === "invited" && !p.user_id).length,
    [detail],
  );

  const scopedCommitments = useMemo(
    () => commitmentsForScope(commitments, detail?.active_cycle?.cycle_id ?? null),
    [commitments, detail?.active_cycle?.cycle_id],
  );

  const coordinationMeta = useMemo(() => {
    if (!detail) return null;
    const interpretation = summaryInterpretation(detail, scopedCommitments);
    const health = coordinationHealth(detail, scopedCommitments);
    const pct = poolProgressPct(detail);
    const daysLeft = detail.active_cycle?.end_date
      ? daysLeftInCycle(detail.active_cycle.end_date)
      : null;
    const pendingPeople = new Set(
      scopedCommitments.filter((c) => num(c.committed_amount) > num(c.paid_amount)).map((c) => c.participant_id),
    ).size;
    return {
      interpretation,
      health,
      pct,
      daysLeft,
      pendingPeople,
    };
  }, [detail, scopedCommitments]);

  const poolExpenseCollapsed = Boolean(
    uxProfile?.expenseFormVariant === "pool_focus" && !showAdvancedExpenseSplit,
  );

  const onGenerateNextCycle = async () => {
    if (!user) return;
    setCycleGenBusy(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      await generateNextGroupCycle(token, groupId);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not generate cycle");
    } finally {
      setCycleGenBusy(false);
    }
  };

  const remindParticipant = async (participantId: string, message: string) => {
    if (!user || !detail) return;
    setErr(null);
    try {
      const token = await user.getIdToken();
      await postGroupReminder(token, groupId, {
        participant_id: participantId,
        reminder_type: "commitment_due",
        message,
        cycle_id: detail.active_cycle?.cycle_id ?? null,
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reminder failed");
      throw e;
    }
  };

  const onPay = async () => {
    if (!user || !payFor) return;
    const amt = parseFloat(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      await payCommitment(token, groupId, payFor.commitment_id, amt);
      setPayFor(null);
      setPayAmount("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Pay failed");
    } finally {
      setBusy(false);
    }
  };

  const startCommitmentEdit = (c: GroupCommitment) => {
    setCommitmentEditId(c.commitment_id);
    setEditCommitted(String(num(c.committed_amount)));
    setEditDue(c.due_date ? String(c.due_date).slice(0, 10) : "");
  };

  const cancelCommitmentEdit = () => {
    setCommitmentEditId(null);
    setEditCommitted("");
    setEditDue("");
  };

  const onSaveCommitmentEdit = async () => {
    if (!user || !commitmentEditId) return;
    const amt = parseFloat(editCommitted);
    if (!Number.isFinite(amt) || amt < 0) {
      setErr("Enter a valid planned commitment amount.");
      return;
    }
    setCommitmentActionBusy(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      await updateGroupCommitment(token, groupId, commitmentEditId, {
        committed_amount: amt,
        due_date: editDue.trim() || null,
      });
      cancelCommitmentEdit();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update commitment");
    } finally {
      setCommitmentActionBusy(false);
    }
  };

  const onDeleteCommitment = async (c: GroupCommitment) => {
    if (!user) return;
    if (!window.confirm("Delete this commitment? This cannot be undone.")) return;
    setCommitmentActionBusy(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      await deleteGroupCommitment(token, groupId, c.commitment_id);
      if (commitmentEditId === c.commitment_id) cancelCommitmentEdit();
      if (payFor?.commitment_id === c.commitment_id) {
        setPayFor(null);
        setPayAmount("");
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not delete commitment");
    } finally {
      setCommitmentActionBusy(false);
    }
  };

  const onAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !detail) return;
    const amount = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || !expensePaidBy || !Number.isFinite(amount) || amount <= 0) {
      setErr("Enter title, amount, and payer to add an expense.");
      return;
    }
    setBusy(true);
    try {
      const token = await user.getIdToken();
      let shares: { participant_id: string; owed_amount: number }[] = [];
      if (splitRule !== "equal") {
        if (splitRule === "percentages") {
          const pctSum = activeParticipants.reduce((acc, p) => acc + num(splitInputs[p.participant_id] ?? ""), 0);
          if (Math.abs(pctSum - 100) > 0.02) {
            setErr("Percent shares must sum to 100.");
            setBusy(false);
            return;
          }
          shares = activeParticipants
            .map((p) => ({
              participant_id: p.participant_id,
              owed_amount: parseFloat(splitInputs[p.participant_id] || "0"),
            }))
            .filter((s) => Number.isFinite(s.owed_amount) && s.owed_amount > 0);
        } else {
          const customSum = activeParticipants.reduce((acc, p) => acc + num(splitInputs[p.participant_id] ?? ""), 0);
          if (Math.abs(customSum - amount) > 0.01) {
            setErr("Custom share amounts must equal expense amount.");
            setBusy(false);
            return;
          }
          shares = activeParticipants
            .map((p) => ({
              participant_id: p.participant_id,
              owed_amount: parseFloat(splitInputs[p.participant_id] || "0"),
            }))
            .filter((s) => Number.isFinite(s.owed_amount) && s.owed_amount > 0);
          if (shares.length === 0) {
            setErr("Enter owed amounts.");
            setBusy(false);
            return;
          }
        }
      }

      const selectedCategory = expenseCategories.find((c) => c.category_id === expenseCategory);
      const selectedSub = selectedCategory?.subcategories.find((s) => s.subcategory_id === expenseSubcategory);
      const categoryLabel = selectedSub
        ? `${selectedCategory?.label ?? ""} › ${selectedSub.label}`
        : selectedCategory?.label ?? "";

      await createGroupExpense(token, groupId, {
        title: expenseTitle.trim(),
        amount,
        paid_by_participant_id: expensePaidBy,
        expense_date: expenseDate,
        category: categoryLabel || null,
        description: expenseDescription.trim() || null,
        cycle_id: detail.active_cycle?.cycle_id ?? null,
        split_rule: splitRule,
        shares,
      });
      setExpenseTitle("");
      setExpenseAmount("");
      setExpenseCategory("");
      setExpenseSubcategory("");
      setExpenseDescription("");
      setSplitRule("equal");
      setSplitInputs({});
      setShowAdvancedExpenseSplit(false);
      setShowExpenseForm(false);
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to add expense");
    } finally {
      setBusy(false);
    }
  };

  const openExpenseForm = () => {
    const fallbackPayer = activeParticipants[0]?.participant_id ?? "";
    if (!expensePaidBy && fallbackPayer) setExpensePaidBy(fallbackPayer);
    setTab("expenses");
    setShowExpenseForm(true);
  };

  const expenseSubcategories = useMemo(() => {
    const c = expenseCategories.find((x) => x.category_id === expenseCategory);
    return c?.subcategories ?? [];
  }, [expenseCategory, expenseCategories]);

  const prevSplitRuleRef = useRef(splitRule);

  const expenseAmountNum = useMemo(() => {
    const a = parseFloat(expenseAmount);
    return Number.isFinite(a) && a > 0 ? a : null;
  }, [expenseAmount]);

  const equalSplitPreview = useMemo(() => {
    if (!detail || !expenseAmountNum) return null;
    const n = activeParticipants.length;
    if (n <= 0) return null;
    const cents = equalShareAmountsCents(Math.round(expenseAmountNum * 100), n);
    return activeParticipants.map((p, i) => ({
      participantId: p.participant_id,
      displayName: p.display_name,
      cents: cents[i],
    }));
  }, [detail, expenseAmountNum, activeParticipants]);

  const customSplitSum = useMemo(() => {
    if (!detail || splitRule !== "custom_amounts") return null;
    let s = 0;
    for (const p of activeParticipants) {
      s += num(splitInputs[p.participant_id] ?? "");
    }
    return s;
  }, [detail, splitRule, splitInputs, activeParticipants]);

  const percentSplitSum = useMemo(() => {
    if (!detail || splitRule !== "percentages") return null;
    let s = 0;
    for (const p of activeParticipants) {
      s += num(splitInputs[p.participant_id] ?? "");
    }
    return s;
  }, [detail, splitRule, splitInputs, activeParticipants]);

  const splitFormInvalid = useMemo(() => {
    if (!expenseAmountNum || !detail) return false;
    if (poolExpenseCollapsed) return false;
    if (splitRule === "equal") return false;
    if (splitRule === "custom_amounts") {
      if (customSplitSum === null) return true;
      return Math.abs(customSplitSum - expenseAmountNum) > 0.01;
    }
    if (splitRule === "percentages") {
      if (percentSplitSum === null) return true;
      return Math.abs(percentSplitSum - 100) > 0.02;
    }
    return false;
  }, [expenseAmountNum, detail, splitRule, customSplitSum, percentSplitSum, poolExpenseCollapsed]);

  const fillSplitFromEqual = useCallback(() => {
    if (!detail || !expenseAmountNum) return;
    const ids = activeParticipants.map((p) => p.participant_id);
    const centsArr = equalShareAmountsCents(Math.round(expenseAmountNum * 100), ids.length);
    if (splitRule === "custom_amounts") {
      setSplitInputs(Object.fromEntries(ids.map((id, i) => [id, (centsArr[i] / 100).toFixed(2)])));
    } else if (splitRule === "percentages") {
      setSplitInputs(
        Object.fromEntries(
          ids.map((id, i) => [
            id,
            expenseAmountNum > 0 ? ((centsArr[i] / 100 / expenseAmountNum) * 100).toFixed(2) : "0",
          ]),
        ),
      );
    }
  }, [detail, expenseAmountNum, splitRule, activeParticipants]);

  useEffect(() => {
    const prev = prevSplitRuleRef.current;
    prevSplitRuleRef.current = splitRule;
    if (!detail) return;
    if (splitRule !== "custom_amounts" && splitRule !== "percentages") return;
    if (prev !== "equal") return;
    const amount = parseFloat(expenseAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const ids = activeParticipants.map((p) => p.participant_id);
    const centsArr = equalShareAmountsCents(Math.round(amount * 100), ids.length);
    if (splitRule === "custom_amounts") {
      setSplitInputs(Object.fromEntries(ids.map((id, i) => [id, (centsArr[i] / 100).toFixed(2)])));
    } else {
      setSplitInputs(
        Object.fromEntries(
          ids.map((id, i) => [id, amount > 0 ? ((centsArr[i] / 100 / amount) * 100).toFixed(2) : "0"]),
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refill when switching from Equal → Custom/Percent; amount is read once at transition
  }, [splitRule, detail, activeParticipants]);

  useEffect(() => {
    if (!detail) return;
    const ids = new Set(activeParticipants.map((p) => p.participant_id));
    if (expensePaidBy && !ids.has(expensePaidBy)) {
      setExpensePaidBy(activeParticipants[0]?.participant_id ?? "");
    }
  }, [detail, activeParticipants, expensePaidBy]);

  useEffect(() => {
    const loadCategories = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        setExpenseCategories(await fetchTransactionCategories(token));
      } catch {
        setExpenseCategories([]);
      }
    };
    void loadCategories();
  }, [user]);

  if (authLoading || (!detail && !err)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
      </div>
    );
  }

  if (err || !detail) {
    return (
      <>
        <div
          className="mb-m-8 h-px w-20 opacity-60 lg:mb-m-10 lg:w-28"
          style={{
            background: "linear-gradient(90deg, transparent, var(--ctx-accent), transparent)",
          }}
        />
        <div className="rounded-m-chip border border-urgency-high/40 bg-bg2 p-m-4 text-[13px] text-urgency-high">
          {err ?? "Not found"}
          <div className="mt-m-4">
            <Link href="/group" className={linkBack}>
              <span className="text-ctx-accent" aria-hidden>
                ←
              </span>
              Group hub
            </Link>
          </div>
        </div>
      </>
    );
  }

  const tabDefs = [
    ["overview", "Overview"],
    ["commitments", "Commitments & Contributions"],
    ["positions", "Positions"],
    ["expenses", "Expenses"],
    ["activity", "Activity"],
  ] as const;

  return (
    <div>
      <div
        className="mb-m-8 h-px w-20 opacity-60 lg:mb-m-10 lg:w-28"
        style={{
          background: "linear-gradient(90deg, transparent, var(--ctx-accent), transparent)",
        }}
      />

      <header className="mb-m-6 lg:mb-m-8">
        <div className="relative overflow-hidden rounded-m-hero border border-ctx-border/55 bg-ctx-hero px-m-5 py-m-5 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_26%,transparent)] md:px-m-6 md:py-m-6">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, var(--ctx-accent), transparent 68%)" }}
          />
          <div
            className="pointer-events-none absolute -left-8 -bottom-14 h-36 w-36 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, var(--ctx-accent-end), transparent 72%)" }}
          />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <Link href="/group" className={linkBack}>
                <span className="text-ctx-accent" aria-hidden>
                  ←
                </span>
                Group hub
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={btnPrimary} onClick={openExpenseForm}>
                  {uxProfile?.primaryExpenseCta ?? "Add expense"}
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => {
                    setTab("overview");
                    peopleSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Invite / QR{invitedPendingCount > 0 ? ` (${invitedPendingCount})` : ""}
                </button>
                <button type="button" className={btnGhost} onClick={() => void load()}>
                  Refresh
                </button>
              </div>
            </div>

            <p className="mt-m-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-ctx-accent">Group moment</p>
            <h1 className="mt-m-2 text-[36px] leading-none font-bold tracking-[-0.8px] text-ctx-text">
              {detail.title}
            </h1>
            <div className="mt-m-3 flex flex-wrap gap-2">
              <span className="rounded-m-chip border border-ctx-border/70 bg-bg2/70 px-m-3 py-1.5 text-[11px] font-medium capitalize text-ctx-text/90">
                {detail.group_type}
              </span>
              <span className="rounded-m-chip border border-ctx-border/70 bg-bg2/70 px-m-3 py-1.5 text-[11px] font-medium capitalize text-ctx-text/90">
                {detail.funding_model}
              </span>
              <span
                className={`rounded-m-chip border px-m-3 py-1.5 text-[11px] font-semibold capitalize ${statusTone(detail.status)}`}
              >
                {detail.status}
              </span>
            </div>
            {detail.description ? (
              <p className="mt-m-4 max-w-3xl text-[14px] leading-relaxed text-ctx-text/78">{detail.description}</p>
            ) : null}

            {coordinationMeta ? (
              <div className="mt-m-5 space-y-m-4 rounded-m-card border border-ctx-border/40 bg-ctx-surface/85 px-m-4 py-m-4 md:px-m-5 md:py-m-5">
                <div className="flex flex-wrap items-start justify-between gap-m-3">
                  <p className="max-w-2xl text-[14px] leading-relaxed text-ctx-text/85">
                    {coordinationMeta.interpretation}
                  </p>
                  <span
                    className={`shrink-0 rounded-m-chip border px-m-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider ${healthBadgeClass(coordinationMeta.health)}`}
                  >
                    {healthLabel(coordinationMeta.health)}
                  </span>
                </div>
                {coordinationMeta.pct != null ? (
                  <div>
                    <div className="mb-1.5 flex justify-between text-[11px] text-ctx-text/55">
                      <span>Pooled progress</span>
                      <span className="tabular-nums font-medium text-ctx-text">{coordinationMeta.pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg2/80">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-ctx-accent to-ctx-accent-end/90 transition-[width] duration-700 ease-out"
                        style={{ width: `${coordinationMeta.pct}%` }}
                      />
                    </div>
                  </div>
                ) : null}
                {coordinationMeta.daysLeft != null && detail.active_cycle ? (
                  <p className="text-[12px] text-ctx-text/70">
                    <span className="font-semibold text-ctx-text">{coordinationMeta.daysLeft}</span> day
                    {coordinationMeta.daysLeft === 1 ? "" : "s"} left in{" "}
                    <span className="text-ctx-accent/90">{detail.active_cycle.label}</span> cycle
                  </p>
                ) : null}
                <div className="grid gap-m-3 border-t border-ctx-border/25 pt-m-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-ctx-text/62">Moment Budget</p>
                    <p className="mt-1 text-[17px] font-semibold tabular-nums text-ctx-text">
                      {detail.summary.target_amount != null ? money(num(detail.summary.target_amount)) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-ctx-text/62">Collected</p>
                    <p className="mt-1 text-[17px] font-semibold tabular-nums text-ctx-text">
                      {money(num(detail.summary.collected_amount))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-ctx-text/62">Pending commitment</p>
                    <p className="mt-1 text-[17px] font-semibold tabular-nums text-status-pending-fg">
                      {detail.summary.pending_commitment_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-ctx-text/62">Overdue</p>
                    <p className="mt-1 text-[17px] font-semibold tabular-nums text-status-overdue-fg">
                      {detail.summary.overdue_commitment_count}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {coordinationMeta ? (
        <div className="mb-m-6 lg:mb-m-8">
          <GroupCoordinationActionStrip
            pendingPeople={coordinationMeta.pendingPeople}
            overdueCount={detail.summary.overdue_commitment_count}
            openShareDebt={num(detail.summary.open_share_debt)}
            daysLeft={coordinationMeta.daysLeft}
            emphasizeRemind={coordinationMeta.pendingPeople > 0 || detail.summary.overdue_commitment_count > 0}
            onRemind={() => setTab("commitments")}
            onMarkPayment={() => setTab("commitments")}
            onRecordSpend={openExpenseForm}
          />
        </div>
      ) : null}

      <div className="mt-m-6 flex min-w-0 flex-col gap-m-6">
        <div className="min-w-0 w-full">
          <GroupSurfaceCard className="flex min-w-0 flex-col overflow-hidden p-0">
            <div
              className="border-b border-surface-300 bg-surface-200/90 px-m-2 pt-m-2"
              role="tablist"
              aria-label="Group sections"
            >
              <div className="flex flex-wrap gap-1 rounded-m-badge bg-bg2/80 p-1">
                {tabDefs.map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={tab === k}
                    className={`min-h-[40px] shrink-0 rounded-m-badge px-m-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                      tab === k
                        ? "bg-ctx-accent text-ctx-hero shadow-sm"
                        : "text-ink-2 hover:bg-surface-200 hover:text-ink"
                    }`}
                    onClick={() => setTab(k)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-m-6 md:p-m-8">
              {tab === "overview" && (
                <div className="space-y-m-8">
                  <div ref={peopleSectionRef}>
                    <SectionRule title="People & commitments" />
                    <p className="mb-m-4 max-w-2xl text-[13px] leading-relaxed text-ink-3">
                      Moment budget (above) is the pool target. Each person&apos;s{" "}
                      <span className="font-medium text-ink">planned commitment</span> is their expected share toward that pool;{" "}
                      <span className="font-medium text-ink">paid contribution</span> is what has actually been recorded. Expense splits
                      allocate each bill across participants separately.
                    </p>
                    <GroupCoordinationPeople
                      participants={detail.participants}
                      commitments={scopedCommitments}
                      groupId={groupId}
                      groupTitle={detail.title}
                      isAdmin={isGroupAdmin}
                      onRefresh={load}
                      onMarkPaid={(c) => setPayFor(c)}
                      onRemindParticipant={remindParticipant}
                      onViewCommitments={() => setTab("commitments")}
                    />
                  </div>
                  <div>
                    <SectionRule title="Split rule" />
                    <GroupSplitRuleCard detail={detail} />
                  </div>
                  {detail.cycles.length > 0 ? (
                    <div>
                      <SectionRule title="Cycle" />
                      <GroupCycleCoordinationBlock
                        detail={detail}
                        scopedCommitments={commitments}
                        isAdmin={isGroupAdmin}
                        generateBusy={cycleGenBusy}
                        onGenerateNext={onGenerateNextCycle}
                      />
                    </div>
                  ) : null}
                  <div>
                    <SectionRule title="Movement" />
                    <GroupRecentMovementPreview
                      items={activity}
                      onViewAll={() => setTab("activity")}
                    />
                  </div>
                </div>
              )}

              {tab === "commitments" && (
                <>
                  {isGroupAdmin ? (
                    <p className="mb-m-4 max-w-2xl text-[12px] leading-relaxed text-ink-3">
                      <span className="font-semibold text-ink">Planned commitment</span> = each member&apos;s expected share. As expenses happen,{" "}
                      <span className="font-semibold text-ink">paid contribution</span> tracks what has actually been paid.
                      Admins can adjust the planned amount or due date below.
                    </p>
                  ) : null}
                  {!commitments.length ? (
                    <p className="text-[14px] leading-relaxed text-ink-2">
                      {detail.funding_model === "pooled"
                        ? "No planned commitments yet. Once created, each member's share and paid contribution appear here."
                        : "No commitments. They appear when members split the moment budget across participants."}
                    </p>
                  ) : (
                    <ul className="space-y-m-2">
                      {commitments.map((c) => {
                        const name = payerNames.get(c.participant_id) ?? "Member";
                        const left = num(c.committed_amount) - num(c.paid_amount);
                        const cycleLabel =
                          c.cycle_id && detail.cycles.length > 0
                            ? detail.cycles.find((cy) => cy.cycle_id === c.cycle_id)?.label ?? null
                            : null;
                        const sourceCap = commitmentSourceCaption(c.source);
                        const editing = commitmentEditId === c.commitment_id;
                        return (
                          <li
                            key={c.commitment_id}
                            className="flex flex-col gap-m-3 rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-m-3 sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div className="min-w-0 flex-1 text-[13px] leading-snug">
                              <span className="font-medium text-ink">{name}</span>
                              {cycleLabel ? (
                                <span className="text-ink-4"> · {cycleLabel}</span>
                              ) : null}
                              {!editing && sourceCap ? (
                                <p className="mt-1 text-[11px] leading-snug text-ink-4">{sourceCap}</p>
                              ) : null}
                              {editing ? (
                                <div className="mt-m-3 grid max-w-md gap-m-2 sm:grid-cols-2">
                                  <div>
                                    <label className={fieldLabel}>Planned Commitment (₹)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      className={inputCls}
                                      value={editCommitted}
                                      onChange={(e) => setEditCommitted(e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className={fieldLabel}>Due date</label>
                                    <input
                                      type="date"
                                      className={inputCls}
                                      value={editDue}
                                      onChange={(e) => setEditDue(e.target.value)}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <span className="text-ink-3"> · </span>
                                  <span className="text-ink-2">
                                    <span className="text-ink-4 text-[10px]">paid </span>{money(num(c.paid_amount))}
                                    <span className="text-ink-4"> / </span>
                                    <span className="text-ink-4 text-[10px]">planned </span>{money(num(c.committed_amount))}
                                  </span>
                                  <span className="text-ink-3"> · </span>
                                  <span
                                    className={
                                      c.status === "overdue"
                                        ? "text-status-overdue-fg"
                                        : c.status === "fulfilled"
                                          ? "text-status-paid-fg"
                                          : "text-status-pending-fg"
                                    }
                                  >
                                    {c.status}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-m-2">
                              {editing ? (
                                <>
                                  <button
                                    type="button"
                                    className={btnPrimary}
                                    disabled={commitmentActionBusy}
                                    onClick={() => void onSaveCommitmentEdit()}
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    className={btn}
                                    disabled={commitmentActionBusy}
                                    onClick={() => cancelCommitmentEdit()}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  {left > 0 ? (
                                    <>
                                      <button
                                        type="button"
                                        className={btn}
                                        onClick={() =>
                                          void remindParticipant(
                                            c.participant_id,
                                            `Reminder: ${money(left)} still open for «${detail.title}».`,
                                          )
                                        }
                                      >
                                        Remind
                                      </button>
                                      <button type="button" className={btn} onClick={() => setPayFor(c)}>
                                        Record payment
                                      </button>
                                    </>
                                  ) : null}
                                  {isGroupAdmin ? (
                                    <>
                                      <button
                                        type="button"
                                        className={btn}
                                        disabled={commitmentActionBusy}
                                        onClick={() => startCommitmentEdit(c)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className={btn}
                                        disabled={commitmentActionBusy}
                                        onClick={() => void onDeleteCommitment(c)}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}

              {tab === "expenses" && (
                <div className="space-y-m-4">
                  <div className="flex flex-wrap items-center justify-between gap-m-2">
                    <p className="text-[12px] leading-relaxed text-ink-3">
                      {uxProfile?.expensesTabIntro ??
                        "Add shared costs for this group. Splits are recorded separately from commitments."}
                    </p>
                    <button
                      type="button"
                      className={btn}
                      onClick={() => (showExpenseForm ? setShowExpenseForm(false) : openExpenseForm())}
                    >
                      {showExpenseForm ? "Close" : uxProfile?.primaryExpenseCta ?? "Add expense"}
                    </button>
                  </div>
                  {detail.cycles.length > 0 ? (
                    <RecurringExpensesPanel
                      groupId={groupId}
                      recurring={recurring}
                      activeParticipants={activeParticipants}
                      isAdmin={isGroupAdmin}
                      activeCycleLabel={detail.active_cycle?.label ?? null}
                      onRefresh={load}
                    />
                  ) : null}
                  {showExpenseForm ? (
                    <form
                      onSubmit={(e) => void onAddExpense(e)}
                      className="grid gap-m-5 rounded-m-card border border-surface-300 bg-bg2 p-m-4 sm:grid-cols-2"
                    >
                      <div className="sm:col-span-2">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ctx-accent">Details</p>
                        <div className="mt-m-3 space-y-m-3">
                          <div>
                            <label className={fieldLabel} htmlFor="expense-title">
                              Title
                            </label>
                            <input
                              id="expense-title"
                              className={inputCls}
                              placeholder="Dinner, cab, supplies…"
                              value={expenseTitle}
                              onChange={(e) => setExpenseTitle(e.target.value)}
                              required
                            />
                          </div>
                          <div className="grid gap-m-3 sm:grid-cols-2">
                            <div>
                              <label className={fieldLabel} htmlFor="expense-amount">
                                Amount
                              </label>
                              <input
                                id="expense-amount"
                                className={inputCls}
                                placeholder="₹"
                                inputMode="decimal"
                                type="number"
                                min="0"
                                step="0.01"
                                value={expenseAmount}
                                onChange={(e) => setExpenseAmount(e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <label className={fieldLabel} htmlFor="expense-date">
                                Date
                              </label>
                              <input
                                id="expense-date"
                                className={inputCls}
                                type="date"
                                value={expenseDate}
                                onChange={(e) => setExpenseDate(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className={fieldLabel} htmlFor="expense-desc">
                              Description{" "}
                              <span className="font-normal normal-case tracking-normal text-ink-4">(optional)</span>
                            </label>
                            <textarea
                              id="expense-desc"
                              className={`${inputCls} min-h-[72px] resize-y`}
                              placeholder="Notes for this expense"
                              value={expenseDescription}
                              onChange={(e) => setExpenseDescription(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className={fieldLabel} htmlFor="expense-paid-by">
                          Paid by
                        </label>
                        <select
                          id="expense-paid-by"
                          className={inputCls}
                          value={expensePaidBy}
                          onChange={(e) => setExpensePaidBy(e.target.value)}
                          required
                        >
                          <option value="">Select member</option>
                          {activeParticipants.map((p) => (
                            <option key={p.participant_id} value={p.participant_id}>
                              {p.display_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={fieldLabel} htmlFor="expense-category">
                          Category{" "}
                          <span className="font-normal normal-case tracking-normal text-ink-4">(optional)</span>
                        </label>
                        <select
                          id="expense-category"
                          className={inputCls}
                          value={expenseCategory}
                          onChange={(e) => {
                            setExpenseCategory(e.target.value);
                            setExpenseSubcategory("");
                          }}
                        >
                          <option value="">None</option>
                          {expenseCategories.map((c) => (
                            <option key={c.category_id} value={c.category_id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {expenseCategory ? (
                        <div className="sm:col-span-2">
                          <label className={fieldLabel} htmlFor="expense-subcategory">
                            Subcategory
                          </label>
                          <select
                            id="expense-subcategory"
                            className={inputCls}
                            value={expenseSubcategory}
                            onChange={(e) => setExpenseSubcategory(e.target.value)}
                          >
                            <option value="">Whole category</option>
                            {expenseSubcategories.map((s) => (
                              <option key={s.subcategory_id} value={s.subcategory_id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <div className="sm:col-span-2 border-t border-rule pt-m-4">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ctx-accent">Split</p>
                        {poolExpenseCollapsed ? (
                          <>
                            <p className="mt-m-2 text-[11px] leading-relaxed text-ink-3">
                              This entry will be divided equally across everyone (same math as a full split: base share
                              plus any remainder on the first member in list order). Open advanced options if you need
                              custom amounts or percentages.
                            </p>
                            {equalSplitPreview?.length ? (
                              <div className="mt-m-3 rounded-m-chip border border-ctx-accent/25 bg-ctx-accent/8 px-m-3 py-m-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                                  Equal split preview
                                </p>
                                <ul className="mt-m-2 space-y-1 text-[12px] text-ink-2">
                                  {equalSplitPreview.map((row) => (
                                    <li key={row.participantId} className="flex justify-between gap-2">
                                      <span className="min-w-0 truncate" title={row.displayName}>
                                        {row.displayName}
                                      </span>
                                      <span className="shrink-0 tabular-nums text-ink">{moneyDetail(row.cents / 100)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            <button
                              type="button"
                              className={`${btn} mt-m-3`}
                              onClick={() => setShowAdvancedExpenseSplit(true)}
                            >
                              Custom or % split
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="mt-m-2 text-[11px] leading-relaxed text-ink-3">
                              Choose how this expense is divided. Server uses the same math as equal split (remainder on
                              first member in list order).
                            </p>
                            <div
                              className="mt-m-3 flex flex-col gap-m-2 sm:flex-row"
                              role="group"
                              aria-label="Split rule"
                            >
                              {(
                                [
                                  ["equal", "Equal", "Split evenly among everyone"] as const,
                                  ["custom_amounts", "Custom", "Exact amounts per person"] as const,
                                  ["percentages", "Percent", "% per person (totals 100%)"] as const,
                                ] as const
                              ).map(([value, short, hint]) => (
                                <button
                                  key={value}
                                  type="button"
                                  className={`flex-1 rounded-m-chip border px-m-2 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-fast ease-standard ${
                                    splitRule === value
                                      ? "border-ctx-accent bg-ctx-accent/12 text-ctx-text shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_18%,transparent)]"
                                      : "border-surface-300 bg-surface-100 text-ink-2 hover:border-ctx-border/40"
                                  }`}
                                  onClick={() => setSplitRule(value)}
                                >
                                  <span className="block text-[11px] font-semibold">{short}</span>
                                  <span className="mt-0.5 block text-[10px] font-normal leading-snug text-ink-3">
                                    {hint}
                                  </span>
                                </button>
                              ))}
                            </div>

                            {splitRule === "equal" && equalSplitPreview?.length ? (
                              <div className="mt-m-3 rounded-m-chip border border-ctx-accent/25 bg-ctx-accent/8 px-m-3 py-m-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                                  Equal split preview
                                </p>
                                <ul className="mt-m-2 space-y-1 text-[12px] text-ink-2">
                                  {equalSplitPreview.map((row) => (
                                    <li key={row.participantId} className="flex justify-between gap-2">
                                      <span className="min-w-0 truncate" title={row.displayName}>
                                        {row.displayName}
                                      </span>
                                      <span className="shrink-0 tabular-nums text-ink">{moneyDetail(row.cents / 100)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            {splitRule === "custom_amounts" && expenseAmountNum !== null && customSplitSum !== null ? (
                              <p
                                className={`mt-m-3 text-[12px] tabular-nums ${
                                  Math.abs(customSplitSum - expenseAmountNum) > 0.01
                                    ? "text-urgency-high"
                                    : "text-status-paid-fg"
                                }`}
                              >
                                Sum: {moneyDetail(customSplitSum)} · Expense: {moneyDetail(expenseAmountNum)}
                              </p>
                            ) : null}

                            {splitRule === "percentages" && percentSplitSum !== null ? (
                              <p
                                className={`mt-m-3 text-[12px] tabular-nums ${
                                  Math.abs(percentSplitSum - 100) > 0.02 ? "text-urgency-high" : "text-status-paid-fg"
                                }`}
                              >
                                Total: {percentSplitSum.toFixed(1)}% · Target 100%
                              </p>
                            ) : null}

                            {splitRule !== "equal" ? (
                              <div className="mt-m-3 rounded-m-card border border-surface-300 bg-surface-100 p-m-3">
                                <div className="mb-m-2 flex flex-wrap items-center justify-between gap-m-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">
                                    {splitRule === "percentages" ? "Percent per member" : "Amount per member"}
                                  </p>
                                  <button type="button" className={btn} onClick={() => fillSplitFromEqual()}>
                                    Split equally
                                  </button>
                                </div>
                                <div className="grid gap-m-2">
                                  {activeParticipants.map((p) => {
                                    const raw = splitInputs[p.participant_id] ?? "";
                                    const pctVal = num(raw);
                                    const derivedInr =
                                      splitRule === "percentages" && expenseAmountNum
                                        ? (pctVal / 100) * expenseAmountNum
                                        : null;
                                    return (
                                      <label
                                        key={p.participant_id}
                                        className="grid grid-cols-1 items-center gap-x-m-2 gap-y-1 sm:grid-cols-[minmax(0,1fr)_112px_auto]"
                                      >
                                        <span className="truncate text-[12px] text-ink-2" title={p.display_name}>
                                          {p.display_name}
                                        </span>
                                        <input
                                          className="w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-1.5 text-[12px] text-ink tabular-nums"
                                          inputMode="decimal"
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          placeholder={splitRule === "percentages" ? "%" : "₹"}
                                          value={raw}
                                          onChange={(e) =>
                                            setSplitInputs((prev) => ({ ...prev, [p.participant_id]: e.target.value }))
                                          }
                                        />
                                        {splitRule === "percentages" ? (
                                          <span className="text-[11px] tabular-nums text-ink-3 sm:text-right">
                                            {derivedInr !== null && expenseAmountNum
                                              ? `≈ ${moneyDetail(derivedInr)}`
                                              : "—"}
                                          </span>
                                        ) : (
                                          <span className="hidden sm:block" aria-hidden />
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}

                            {uxProfile?.expenseFormVariant === "pool_focus" && showAdvancedExpenseSplit ? (
                              <button
                                type="button"
                                className={`${btn} mt-m-3`}
                                onClick={() => {
                                  setShowAdvancedExpenseSplit(false);
                                  setSplitRule("equal");
                                  setSplitInputs({});
                                }}
                              >
                                Use simple equal split only
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>

                      <div className="sm:col-span-2 flex flex-wrap items-center gap-m-2">
                        <button type="submit" className={btnPrimary} disabled={busy || splitFormInvalid}>
                          {busy ? "Saving…" : "Save expense"}
                        </button>
                        {splitFormInvalid ? (
                          <span className="text-[11px] text-urgency-high">
                            {splitRule === "custom_amounts"
                              ? "Share amounts must match the expense total."
                              : "Percentages must total 100%."}
                          </span>
                        ) : null}
                      </div>
                    </form>
                  ) : null}
                  <ExpenseList expenses={expenses} payerNames={payerNames} hideIntro />
                </div>
              )}

              {tab === "activity" && (
                <ActivityTimeline items={activity} emptyLabel="No activity in this group yet." />
              )}

              {tab === "positions" && (
                <div>
                  <p className="mb-m-4 text-[12px] leading-relaxed text-ink-3">
                    Per-member financial position across all cycles. Planned commitment is the expected share (pool lines +
                    any split-derived rows); paid contribution is what was recorded; net position is paid − planned (positive
                    means ahead / owed back).
                  </p>
                  {positions.length === 0 ? (
                    <p className="text-[13px] text-ink-3">No commitments recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[540px] border-separate border-spacing-0 text-[12px]">
                        <thead>
                          <tr>
                            <th className="border-b border-rule pb-m-2 text-left text-[10px] font-semibold uppercase tracking-wider text-ink/35">Member</th>
                            <th className="border-b border-rule pb-m-2 text-right text-[10px] font-semibold uppercase tracking-wider text-ink/35">Planned</th>
                            <th className="border-b border-rule pb-m-2 text-right text-[10px] font-semibold uppercase tracking-wider text-ink/35">Paid</th>
                            <th className="border-b border-rule pb-m-2 text-right text-[10px] font-semibold uppercase tracking-wider text-ink/35">Net position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {positions.map((p) => {
                            const net = num(p.net_position);
                            const netCls = net >= 0 ? "text-status-ok-fg" : "text-urgency-high";
                            return (
                              <tr key={p.participant_id} className="group/row">
                                <td className="py-m-3 pr-m-4 align-top font-medium text-ink/80">
                                  {p.display_name}
                                </td>
                                <td className="py-m-3 pr-m-4 text-right tabular-nums text-ink/65">
                                  {money(num(p.planned_commitment))}
                                </td>
                                <td className="py-m-3 pr-m-4 text-right tabular-nums text-ink/65">
                                  {money(num(p.paid_contribution))}
                                </td>
                                <td className={`py-m-3 text-right tabular-nums font-semibold ${netCls}`}>
                                  {net >= 0 ? "+" : ""}{money(net)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td className="border-t border-rule pt-m-3 text-[10px] font-semibold uppercase tracking-wider text-ink/35">Total</td>
                            <td className="border-t border-rule pt-m-3 text-right tabular-nums font-semibold text-ink">
                              {money(positions.reduce((s, p) => s + num(p.planned_commitment), 0))}
                            </td>
                            <td className="border-t border-rule pt-m-3 text-right tabular-nums font-semibold text-ink">
                              {money(positions.reduce((s, p) => s + num(p.paid_contribution), 0))}
                            </td>
                            <td className="border-t border-rule pt-m-3 text-right tabular-nums font-semibold text-ink/35">—</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </GroupSurfaceCard>
        </div>

      </div>

      {payFor ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-m-4 sm:items-center">
          <div className="w-full max-w-sm rounded-m-hero border border-ctx-border bg-ctx-surface p-m-5 shadow-xl">
            <p className="font-medium text-ctx-text">Record payment</p>
            <p className="mt-1 text-[13px] text-ctx-text/85">
              {payerNames.get(payFor.participant_id)} — {money(num(payFor.committed_amount) - num(payFor.paid_amount))}{" "}
              remaining
            </p>
            <input
              className="mt-m-3 w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2 text-[13px] text-ink"
              inputMode="decimal"
              placeholder="Amount"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <div className="mt-m-4 flex gap-m-2">
              <button type="button" className={btn} onClick={() => setPayFor(null)}>
                Cancel
              </button>
              <button type="button" className={btn} disabled={busy} onClick={() => void onPay()}>
                {busy ? "…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
