"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { logAnalyticsEvent } from "@/lib/firebase/analytics-lazy";
import {
  applyBudgetTemplate,
  BUDGET_TEMPLATE_CUSTOM,
  BUDGET_TEMPLATES,
  defaultCycleLabelForNow,
  SAVINGS_STYLE_CUSTOM,
  SAVINGS_STYLES,
  savingsStyleHint,
  suggestSavingsTarget,
} from "@/lib/personal/budget-templates";
import {
  applyGoalTemplate,
  GOAL_TEMPLATE_CUSTOM,
  GOAL_TEMPLATES,
} from "@/lib/personal/goal-templates";
import {
  buildPersonalTrigger,
  computeMonthlyPace,
  computeTodaySnapshot,
  currentMonthStr,
  formatInr as formatInrInsight,
  goalEncouragement,
  moneyLeftStory,
  txnAddFeedback,
  weekSpendComparison,
} from "@/lib/personal/personal-dashboard-insights";
import { PersonalCategoryInsights } from "@/components/personal/personal-category-insights";
import { PersonalMoneyHero } from "@/components/personal/personal-money-hero";
import { PersonalSpendPaceCard } from "@/components/personal/personal-spend-pace-card";
import { PersonalTodaySnapshot } from "@/components/personal/personal-today-snapshot";
import { PersonalTriggerBar } from "@/components/personal/personal-trigger-bar";
import {
  createBudget,
  createCycle,
  createGoal,
  createMoment,
  createTransaction,
  deleteMoment,
  deleteTransaction,
  evaluateSignals,
  fetchBudgets,
  fetchCycles,
  fetchGoals,
  fetchMoments,
  fetchPersonalSummary,
  fetchSpendBreakdown,
  fetchTransactionCategories,
  fetchTransactions,
  transactionsToCsv,
  updateTransaction,
  type PersonalBudget,
  type PersonalCycle,
  type PersonalGoal,
  type PersonalMoment,
  type PersonalSummary,
  type PersonalTransaction,
  type PersonalTxnCategory,
  type SpendBreakdown,
} from "@/lib/api/personal";

const inputCls =
  "w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink placeholder:text-ink-4 transition-[border-color,box-shadow] duration-fast ease-standard focus:border-ctx-accent focus:outline-none focus:ring-1 focus:ring-ctx-accent/35";

const cardCls =
  "relative overflow-hidden rounded-m-hero border border-surface-300 bg-surface-100 shadow-[inset_0_1px_0_0_rgba(201,168,76,0.06)]";

const btnPrimaryCls =
  "min-h-[44px] touch-manipulation rounded-[14px] bg-gradient-to-br from-ctx-accent to-ctx-accent-end py-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_0_24px_-8px_var(--ctx-accent)] transition-[opacity,transform] duration-fast hover:opacity-95 active:scale-[0.99] disabled:opacity-40";

function inr(n: number | string) {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(v)) return "—";
  return formatInrInsight(v);
}

function todayIso() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function transactionCategoryLabel(t: PersonalTransaction): string | null {
  const parts = [t.category, t.subcategory].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return parts.join(" › ");
}

function monthStrNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function goalPaceHint(g: PersonalGoal): string | null {
  const tgt = Number(g.target_amount);
  const sv = Number(g.saved_amount);
  if (tgt <= 0) return null;
  if (sv >= tgt) return "Target reached";
  if (!g.target_date) return null;
  const end = new Date(`${g.target_date}T12:00:00`);
  const now = new Date();
  const daysLeft = (end.getTime() - now.getTime()) / 86400000;
  const left = tgt - sv;
  if (daysLeft <= 0) return "Past target date — adjust the date or top up faster.";
  const perDay = left / daysLeft;
  if (!Number.isFinite(perDay) || perDay < 0) return null;
  return `About ${inr(perDay)} / day to hit the target on time.`;
}

function goalTimeLeftLabel(targetDate: string | null): string | null {
  if (!targetDate) return null;
  const end = new Date(`${targetDate}T12:00:00`);
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (days < 0) return "Target date passed";
  if (days === 0) return "Due today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function SectionRule({ title }: { title: string }) {
  const c = "text-ink/35";
  return (
    <div className="mb-m-4 flex items-center gap-m-3">
      <h3 className={`shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] ${c}`}>{title}</h3>
      <div className="h-px flex-1 bg-rule" />
    </div>
  );
}

export function PersonalDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<PersonalSummary | null>(null);
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [goals, setGoals] = useState<PersonalGoal[]>([]);
  const [moments, setMoments] = useState<PersonalMoment[]>([]);
  const [cycles, setCycles] = useState<PersonalCycle[]>([]);
  const [txnCategories, setTxnCategories] = useState<PersonalTxnCategory[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [freeCategory, setFreeCategory] = useState("");
  const [freeSubcategory, setFreeSubcategory] = useState("");
  const [merchant, setMerchant] = useState("");
  const [txDate, setTxDate] = useState(todayIso);
  const [cycleId, setCycleId] = useState("");
  const [editingTransaction, setEditingTransaction] = useState<PersonalTransaction | null>(null);
  const [txMonth, setTxMonth] = useState(monthStrNow);
  const [txCycleFilter, setTxCycleFilter] = useState("");
  const [txCategoryFilter, setTxCategoryFilter] = useState("");
  const [txMerchantFilter, setTxMerchantFilter] = useState("");
  const [breakdown, setBreakdown] = useState<SpendBreakdown | null>(null);
  const [budgetCycleId, setBudgetCycleId] = useState("");
  const [budgets, setBudgets] = useState<PersonalBudget[]>([]);
  const [budgetCategoryId, setBudgetCategoryId] = useState("");
  const [budgetSubcategoryId, setBudgetSubcategoryId] = useState("");
  const [budgetFreeCategory, setBudgetFreeCategory] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");

  const txnFormRef = useRef<HTMLDivElement>(null);
  const signalsRef = useRef<HTMLDivElement>(null);
  const addGoalRef = useRef<HTMLDivElement>(null);

  const [txnFeedback, setTxnFeedback] = useState<string | null>(null);

  const [budgetTemplateId, setBudgetTemplateId] = useState(BUDGET_TEMPLATE_CUSTOM);
  const [momentTitle, setMomentTitle] = useState("My financial plan");
  const [cycleLabel, setCycleLabel] = useState(defaultCycleLabelForNow);
  const [allocated, setAllocated] = useState("35000");
  const [savingsStyleId, setSavingsStyleId] = useState("balanced");
  const [savingsTarget, setSavingsTarget] = useState("4375");

  const activeBudgetTemplate = useMemo(
    () => BUDGET_TEMPLATES.find((b) => b.id === budgetTemplateId),
    [budgetTemplateId],
  );

  function selectBudgetTemplate(id: string) {
    setBudgetTemplateId(id);
    if (id === BUDGET_TEMPLATE_CUSTOM) return;
    const t = BUDGET_TEMPLATES.find((b) => b.id === id);
    if (!t) return;
    const a = applyBudgetTemplate(t);
    const activeStyle = SAVINGS_STYLES.find((x) => x.id === savingsStyleId) ?? SAVINGS_STYLES[1];
    setMomentTitle(a.momentTitle);
    setCycleLabel(a.cycleLabel);
    setAllocated(a.lifestyleBudget);
    setSavingsTarget(String(suggestSavingsTarget(Number(a.lifestyleBudget), activeStyle)));
    logAnalyticsEvent("personal_budget_template_selected", { template_id: id });
  }

  const activeSavingsStyle = useMemo(
    () => SAVINGS_STYLES.find((s) => s.id === savingsStyleId),
    [savingsStyleId],
  );

  function selectSavingsStyle(id: string) {
    setSavingsStyleId(id);
    if (id === SAVINGS_STYLE_CUSTOM) return;
    const style = SAVINGS_STYLES.find((x) => x.id === id);
    if (!style) return;
    setSavingsTarget(String(suggestSavingsTarget(parseFloat(allocated) || 0, style)));
    logAnalyticsEvent("personal_savings_style_selected", { style_id: id });
  }

  const [goalTemplateId, setGoalTemplateId] = useState(GOAL_TEMPLATE_CUSTOM);
  const [goalTitle, setGoalTitle] = useState("My savings goal");
  const [goalTarget, setGoalTarget] = useState("100000");
  const [goalSaved, setGoalSaved] = useState("0");
  const [goalTargetDate, setGoalTargetDate] = useState("");

  const activeGoalTemplate = useMemo(
    () => GOAL_TEMPLATES.find((g) => g.id === goalTemplateId),
    [goalTemplateId],
  );

  const subcategoriesForCategory = useMemo(() => {
    if (!categoryId) return [];
    const c = txnCategories.find((x) => x.category_id === categoryId);
    return c?.subcategories ?? [];
  }, [categoryId, txnCategories]);

  const subcategoriesForBudgetCategory = useMemo(() => {
    if (!budgetCategoryId) return [];
    const c = txnCategories.find((x) => x.category_id === budgetCategoryId);
    return c?.subcategories ?? [];
  }, [budgetCategoryId, txnCategories]);

  function selectGoalTemplate(id: string) {
    setGoalTemplateId(id);
    if (id === GOAL_TEMPLATE_CUSTOM) return;
    const g = GOAL_TEMPLATES.find((x) => x.id === id);
    if (!g) return;
    const a = applyGoalTemplate(g);
    setGoalTitle(a.title);
    setGoalTarget(a.target);
    setGoalSaved(a.saved);
    setGoalTargetDate(a.targetDate);
    logAnalyticsEvent("personal_goal_template_selected", { template_id: id });
  }

  const refresh = useCallback(async (): Promise<{
    summary: PersonalSummary | null;
    budgets: PersonalBudget[];
  }> => {
    if (!user) return { summary: null, budgets: [] };
    const token = await user.getIdToken();
    setLoadError(null);
    let budgetsResult: PersonalBudget[] = [];
    let summaryResult: PersonalSummary | null = null;
    try {
      const [s, g, m, c] = await Promise.all([
        fetchPersonalSummary(token),
        fetchGoals(token),
        fetchMoments(token),
        fetchCycles(token),
      ]);
      summaryResult = s;
      setSummary(s);
      setGoals(g);
      setMoments(m);
      setCycles(c);
      const t = await fetchTransactions(token, {
        limit: 200,
        month: txMonth || undefined,
        cycle_id: txCycleFilter || undefined,
        category_id: txCategoryFilter || undefined,
        merchant: txMerchantFilter || undefined,
      });
      setTransactions(t);
      try {
        setBreakdown(
          await fetchSpendBreakdown(token, {
            month: txMonth || undefined,
            cycle_id: txCycleFilter || undefined,
          }),
        );
      } catch {
        setBreakdown(null);
      }
      try {
        setTxnCategories(await fetchTransactionCategories(token));
      } catch {
        setTxnCategories([]);
      }
      if (budgetCycleId) {
        try {
          budgetsResult = await fetchBudgets(token, budgetCycleId);
          setBudgets(budgetsResult);
        } catch {
          budgetsResult = [];
          setBudgets([]);
        }
      } else {
        setBudgets([]);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    }
    return { summary: summaryResult, budgets: budgetsResult };
  }, [user, txMonth, txCycleFilter, txCategoryFilter, txMerchantFilter, budgetCycleId]);

  useEffect(() => {
    if (!authLoading && user) {
      void refresh();
      logAnalyticsEvent("personal_dashboard_view");
    }
  }, [authLoading, user, refresh]);

  useEffect(() => {
    if (!budgetCycleId && cycles.length > 0) {
      setBudgetCycleId(cycles[0].cycle_id);
    }
  }, [cycles, budgetCycleId]);

  useEffect(() => {
    if (!user?.uid || txnCategories.length === 0) return;
    try {
      const raw = localStorage.getItem(`momentra:lastTxnPicker:${user.uid}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { categoryId?: string; subcategoryId?: string };
      const cid = parsed.categoryId;
      const sid = parsed.subcategoryId;
      if (cid && txnCategories.some((x) => x.category_id === cid)) {
        setCategoryId(cid);
        if (sid) {
          const subs = txnCategories.find((x) => x.category_id === cid)?.subcategories ?? [];
          if (subs.some((s) => s.subcategory_id === sid)) {
            setSubcategoryId(sid);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, [user?.uid, txnCategories]);

  const planUsedPct = useMemo(() => {
    if (!summary) return 0;
    const envelope = Number(summary.planned_monthly_envelope ?? (Number(summary.total_allocated) + Number(summary.savings_target ?? 0)));
    const spent = Number(summary.total_spent_period);
    if (envelope <= 0) return spent > 0 ? 100 : 0;
    return Math.min(100, Math.round((spent / envelope) * 100));
  }, [summary]);

  const lifestyleBudget = useMemo(
    () => (summary ? Number(summary.lifestyle_budget ?? summary.total_allocated) : 0),
    [summary],
  );
  const savingsMonthlyTarget = useMemo(
    () => (summary ? Number(summary.savings_target ?? 0) : 0),
    [summary],
  );
  const plannedEnvelope = useMemo(
    () => (summary ? Number(summary.planned_monthly_envelope ?? lifestyleBudget + savingsMonthlyTarget) : 0),
    [summary, lifestyleBudget, savingsMonthlyTarget],
  );
  const spentThisPeriod = useMemo(() => (summary ? Number(summary.total_spent_period) : 0), [summary]);
  const planRemaining = useMemo(
    () => (summary ? Number(summary.plan_remaining ?? summary.money_left ?? (plannedEnvelope - spentThisPeriod)) : 0),
    [summary, plannedEnvelope, spentThisPeriod],
  );
  const savingsContributed = useMemo(
    () => (summary ? Number(summary.savings_contributed ?? 0) : 0),
    [summary],
  );
  const moneyStory = useMemo(() => moneyLeftStory(planUsedPct, planRemaining), [planUsedPct, planRemaining]);

  const spendingHint = useMemo(() => {
    if (lifestyleBudget <= 0) return "No budget set";
    const pct = (spentThisPeriod / lifestyleBudget) * 100;
    if (pct < 40) return "Plenty of room";
    if (pct < 75) return "On track";
    if (pct < 90) return "Watch spending";
    return "At limit";
  }, [spentThisPeriod, lifestyleBudget]);

  const savingsHint = useMemo(() => {
    if (savingsMonthlyTarget <= 0) return "No target set";
    if (savingsContributed <= 0) return "Yet to start";
    const pct = (savingsContributed / savingsMonthlyTarget) * 100;
    if (pct >= 100) return "Target met";
    if (pct >= 75) return "Almost there";
    return "In progress";
  }, [savingsContributed, savingsMonthlyTarget]);
  const todaySnapshot = useMemo(() => computeTodaySnapshot(transactions), [transactions]);
  const pace = useMemo(
    () => computeMonthlyPace(summary, txMonth || currentMonthStr()),
    [summary, txMonth],
  );
  const weekCmp = useMemo(() => weekSpendComparison(transactions, txMonth), [transactions, txMonth]);
  const trigger = useMemo(
    () =>
      buildPersonalTrigger({
        summary,
        today: todaySnapshot,
        pace,
        weekCmp,
        breakdown,
        budgets,
      }),
    [summary, todaySnapshot, pace, weekCmp, breakdown, budgets],
  );

  useEffect(() => {
    if (!txnFeedback) return;
    const t = window.setTimeout(() => setTxnFeedback(null), 6000);
    return () => window.clearTimeout(t);
  }, [txnFeedback]);

  function fillFormFromTransaction(t: PersonalTransaction) {
    setEditingTransaction(t);
    setAmount(String(t.amount));
    setTxDate(t.transaction_date.slice(0, 10));
    setMerchant(t.merchant ?? "");
    setCycleId(t.cycle_id ?? "");
    if (txnCategories.length > 0) {
      setCategoryId(t.category_id ?? "");
      setSubcategoryId(t.subcategory_id ?? "");
      setFreeCategory("");
      setFreeSubcategory("");
    } else {
      setFreeCategory(t.category ?? "");
      setFreeSubcategory(t.subcategory ?? "");
      setCategoryId("");
      setSubcategoryId("");
    }
    // Scroll to form — use both scrollIntoView and window.scrollTo for mobile reliability
    const el = txnFormRef.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const top = el.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  function cancelTransactionEdit() {
    setEditingTransaction(null);
    setAmount("");
    setCategoryId("");
    setSubcategoryId("");
    setFreeCategory("");
    setFreeSubcategory("");
    setMerchant("");
    setTxDate(todayIso());
    setCycleId("");
  }

  async function onAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const wasEdit = !!editingTransaction;
    const fbCatId = categoryId;
    const fbSubId = subcategoryId;
    const fbFree = freeCategory.trim();
    try {
      const token = await user.getIdToken();
      const amt = parseFloat(amount);
      if (Number.isNaN(amt) || amt <= 0) throw new Error("Enter a valid amount");
      const body: Parameters<typeof createTransaction>[1] = {
        amount: amt,
        merchant: merchant.trim() || null,
        transaction_date: txDate,
        cycle_id: cycleId || null,
      };
      if (txnCategories.length > 0) {
        if (subcategoryId) body.subcategory_id = subcategoryId;
        else if (categoryId) body.category_id = categoryId;
      } else {
        body.category = freeCategory.trim() || null;
        body.subcategory = freeSubcategory.trim() || null;
      }
      if (editingTransaction) {
        const patch: Parameters<typeof updateTransaction>[2] = {
          amount: amt,
          merchant: merchant.trim() || null,
          transaction_date: txDate,
          cycle_id: cycleId || null,
        };
        if (txnCategories.length > 0) {
          if (subcategoryId) patch.subcategory_id = subcategoryId;
          else {
            patch.subcategory_id = null;
            patch.category_id = categoryId || null;
          }
        } else {
          patch.category = freeCategory.trim() || null;
          patch.subcategory = freeSubcategory.trim() || null;
        }
        await updateTransaction(token, editingTransaction.transaction_id, patch);
        logAnalyticsEvent("personal_transaction_updated", {});
      } else {
        await createTransaction(token, body);
        if (user.uid && txnCategories.length > 0 && (categoryId || subcategoryId)) {
          localStorage.setItem(
            `momentra:lastTxnPicker:${user.uid}`,
            JSON.stringify({ categoryId, subcategoryId }),
          );
        }
        logAnalyticsEvent("personal_transaction_added", { has_cycle: !!cycleId });
      }
      cancelTransactionEdit();
      const snap = await refresh();
      if (snap.summary) {
        const alloc = Number(
          snap.summary.planned_monthly_envelope ??
            (Number(snap.summary.total_allocated) + Number(snap.summary.savings_target ?? 0)),
        );
        const spent = Number(snap.summary.total_spent_period);
        const pct = alloc <= 0 ? (spent > 0 ? 100 : 0) : Math.min(100, Math.round((spent / alloc) * 100));
        if (!wasEdit) {
          let catLabel: string | null = null;
          if (txnCategories.length > 0) {
            const c = txnCategories.find((x) => x.category_id === fbCatId);
            const subs = c?.subcategories ?? [];
            const s = subs.find((x) => x.subcategory_id === fbSubId);
            catLabel = s?.label ?? c?.label ?? null;
          } else if (fbFree) {
            catLabel = fbFree;
          }
              setTxnFeedback(txnAddFeedback(pct, catLabel, snap.budgets, fbCatId || null, fbSubId || null));
        } else {
          setTxnFeedback("Changes saved.");
        }
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not save transaction");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteTransaction(t: PersonalTransaction) {
    if (!user) return;
    if (!window.confirm("Delete this transaction?")) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      await deleteTransaction(token, t.transaction_id);
      if (editingTransaction?.transaction_id === t.transaction_id) cancelTransactionEdit();
      await refresh();
      logAnalyticsEvent("personal_transaction_deleted", {});
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  async function onAddBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !budgetCycleId) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const alloc = parseFloat(budgetAmount);
      if (Number.isNaN(alloc) || alloc <= 0) throw new Error("Enter a valid budget amount");
      if (txnCategories.length > 0) {
        if (!budgetSubcategoryId && !budgetCategoryId) {
          throw new Error("Pick a category (or subcategory) for this budget line");
        }
        await createBudget(token, {
          cycle_id: budgetCycleId,
          allocated_amount: alloc,
          ...(budgetSubcategoryId
            ? { subcategory_id: budgetSubcategoryId }
            : { category_id: budgetCategoryId }),
        });
      } else {
        const cat = budgetFreeCategory.trim();
        if (!cat) throw new Error("Enter a category name");
        await createBudget(token, {
          cycle_id: budgetCycleId,
          allocated_amount: alloc,
          category: cat,
        });
      }
      setBudgetAmount("");
      setBudgetCategoryId("");
      setBudgetSubcategoryId("");
      setBudgetFreeCategory("");
      await refresh();
      logAnalyticsEvent("personal_budget_created", {});
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not create budget");
    } finally {
      setBusy(false);
    }
  }

  function downloadTransactionsCsv() {
    const blob = new Blob([transactionsToCsv(transactions)], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `momentra-transactions-${txMonth || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function onAddGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const target = parseFloat(goalTarget);
      const saved = parseFloat(goalSaved);
      if (Number.isNaN(target) || target <= 0) throw new Error("Enter a valid target amount");
      if (Number.isNaN(saved) || saved < 0) throw new Error("Saved amount must be zero or more");
      await createGoal(token, {
        title: goalTitle.trim() || "Goal",
        target_amount: target,
        saved_amount: saved,
        target_date: goalTargetDate.trim() || null,
      });
      setGoalTitle("My savings goal");
      setGoalTarget("100000");
      setGoalSaved("0");
      setGoalTargetDate("");
      setGoalTemplateId(GOAL_TEMPLATE_CUSTOM);
      await refresh();
      logAnalyticsEvent("personal_goal_created");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not create goal");
    } finally {
      setBusy(false);
    }
  }

  async function onQuickSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const lifestyle = parseFloat(allocated) || 0;
      const savings = parseFloat(savingsTarget) || 0;
      const m = await createMoment(token, {
        title: momentTitle,
        moment_type: "budget",
        duration_type: "ongoing",
        target_amount: savings > 0 ? savings : null,
        status: "active",
      });
      const start = new Date();
      start.setDate(1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      await createCycle(token, {
        moment_id: m.moment_id,
        label: cycleLabel,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        allocated_budget: lifestyle,
      });
      await refresh();
      logAnalyticsEvent("personal_moment_created", {
        type: "budget",
        lifestyle_budget: lifestyle,
        savings_target: savings,
        savings_style: savingsStyleId,
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteMoment(momentId: string) {
    if (!user) return;
    if (!confirm("Delete this moment and all its cycles? This cannot be undone.")) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      await deleteMoment(token, momentId);
      await refresh();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function onEvaluate() {
    if (!user) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      await evaluateSignals(token);
      await refresh();
      logAnalyticsEvent("personal_signals_evaluated");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Evaluate failed");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-m-4 bg-bg px-m-4">
        <div className="h-10 w-10 animate-pulse rounded-full border-2 border-ctx-accent/25 border-t-ctx-accent" />
        <p className="text-[12px] font-medium uppercase tracking-wider text-ink-4">Loading personal…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-bg px-m-4">
        <div className={`${cardCls} max-w-md p-m-10 text-center`}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
            style={{
              background: "linear-gradient(90deg, transparent, var(--ctx-accent), transparent)",
            }}
          />
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ink/35">Personal</p>
          <h1 className="mt-m-3 text-[22px] font-bold tracking-[-0.3px] text-ink">Your financial cockpit</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink/65">
            Sign in to track Plan Remaining, cycles, and insights.
          </p>
          <Link
            href="/login?next=/personal"
            className="mt-m-8 inline-flex rounded-[14px] bg-gradient-to-br from-ctx-accent to-ctx-accent-end px-8 py-3 text-[11px] font-semibold uppercase tracking-wider text-white transition-opacity duration-fast hover:opacity-95"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-[20px] pt-[24px] pb-m-28 lg:px-[20px] lg:pt-[24px]">
        <div
          className="mb-m-8 h-px w-20 opacity-50 lg:mb-m-10 lg:w-28"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(245, 240, 255, 0.22), transparent)",
          }}
        />

        <header className="mb-m-8 flex flex-col gap-m-6 lg:mb-m-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-x-m-3 gap-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-ink/35">Personal · Module</p>
              <Link
                href="/group"
                className="text-[9px] font-semibold uppercase tracking-[0.22em] text-ink/35 transition-colors hover:text-ink/65"
              >
                Group →
              </Link>
            </div>
            <h1 className="mt-2 text-[32px] leading-none font-bold tracking-[-0.8px] text-ink md:text-[36px]">
              Your daily money rhythm
            </h1>
            <p className="mt-m-3 text-[14px] leading-relaxed text-ink-3">
              A quick pulse on <span className="text-ink2">today</span>, your month’s pace, and what to do next —
              not another static totals screen.
            </p>
          </div>
          <div className="flex flex-wrap gap-m-2">
            <span className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2 text-[11px] tabular-nums text-ink-3">
              Moments <span className="ml-1 font-semibold text-ink">{moments.length}</span>
            </span>
            <span className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2 text-[11px] tabular-nums text-ink-3">
              Cycles <span className="ml-1 font-semibold text-ink">{cycles.length}</span>
            </span>
            <span className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2 text-[11px] tabular-nums text-ink-3">
              Txn <span className="ml-1 font-semibold text-ink">{transactions.length}</span>
            </span>
            <span className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2 text-[11px] tabular-nums text-ink-3">
              Goals <span className="ml-1 font-semibold text-ink">{goals.length}</span>
            </span>
          </div>
        </header>

        {loadError ? (
          <div
            className="mb-m-8 rounded-m-card border border-urgency-high/35 bg-[#1C0808]/50 px-m-4 py-m-3 text-[13px] text-urgency-high"
            role="alert"
          >
            {loadError}
          </div>
        ) : null}

        <div className="mb-m-8">
          <PersonalTriggerBar
            trigger={trigger}
            onCta={
              trigger.cta
                ? () => signalsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                : undefined
            }
          />
        </div>

        {txnFeedback ? (
          <div
            className="mb-m-8 rounded-m-card border border-ctx-accent/35 bg-ctx-hero/60 px-m-4 py-m-3 text-[14px] leading-snug text-ink/65"
            role="status"
          >
            {txnFeedback}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-[28px] lg:grid-cols-12 lg:gap-[28px]">
          <div className="flex flex-col gap-m-4 lg:col-span-7">
            {summary?.top_category ? (
              <span className="w-fit rounded-m-badge border border-ctx-border/50 bg-ctx-hero/80 px-m-3 py-1.5 text-[10px] text-ink/35">
                Top this period: <span className="text-ink/65">{summary.top_category}</span>
              </span>
            ) : null}
            <PersonalMoneyHero
              planRemainingLabel={inr(planRemaining)}
              story={moneyStory}
              planUsedPct={planUsedPct}
              spendingLabel={inr(spentThisPeriod)}
              spendingTargetLabel={inr(lifestyleBudget)}
              spendingHint={spendingHint}
              savingsContributedLabel={inr(savingsContributed)}
              savingsTargetLabel={inr(savingsMonthlyTarget)}
              savingsHint={savingsHint}
              expectedSoFar={pace?.expectedSoFar ?? null}
              actualSoFar={pace?.actualSoFar ?? null}
              showPaceCompare={Boolean(summary && plannedEnvelope > 0 && pace)}
              formatInr={formatInrInsight}
            />
            <div className="grid gap-m-4 sm:grid-cols-2">
              <div className="rounded-m-card border border-ctx-border/40 bg-ctx-hero/50 p-m-4">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-ink/35">
                  Lifestyle budget
                </p>
                <p className="mt-2 text-[22px] font-bold tabular-nums text-ink">
                  {summary ? inr(lifestyleBudget) : "—"}
                </p>
              </div>
              <div className="rounded-m-card border border-ctx-border/40 bg-ctx-hero/50 p-m-4">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-ink/35">
                  Savings target
                </p>
                <p className="mt-2 text-[22px] font-bold tabular-nums text-ink">
                  {summary ? inr(savingsMonthlyTarget) : "—"}
                </p>
              </div>
            </div>
            <div className="rounded-m-card border border-ctx-border/35 bg-ctx-hero/35 px-m-4 py-m-3 text-[12px] text-ink-3">
              Planned monthly envelope: <span className="font-semibold text-ink">{summary ? inr(plannedEnvelope) : "—"}</span>
            </div>
          </div>

          <aside className="flex flex-col gap-m-6 lg:col-span-5">
            <PersonalTodaySnapshot snapshot={todaySnapshot} formatInr={formatInrInsight} />
            {pace ? (
              <PersonalSpendPaceCard
                pace={pace}
                periodLabel={summary?.period_label ?? "This period"}
                formatInr={formatInrInsight}
              />
            ) : (
              <div className={`${cardCls} p-m-6`}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ink/35">Spending pace</p>
                <p className="mt-m-3 text-[13px] leading-relaxed text-ink-4">
                  Set an active cycle with a monthly allocation to unlock smooth-line pacing for this view.
                </p>
              </div>
            )}
          </aside>

          {breakdown && breakdown.rows.length > 0 ? (
            <div className="lg:col-span-12">
              <PersonalCategoryInsights breakdown={breakdown} formatInr={formatInrInsight} />
            </div>
          ) : null}

          {/* Savings goals — full width */}
          <section className="grid grid-cols-1 gap-[28px] lg:col-span-12 lg:grid-cols-12 lg:gap-[28px]">
            <div className={`${cardCls} p-m-6 md:p-m-8 lg:col-span-5`}>
              <SectionRule title="Your goals" />
              <p className="mb-m-4 text-[12px] leading-relaxed text-ink-4">
                Why it matters: visible progress and deadlines turn savings into a habit, not a vague intention.
              </p>
              <ul className="max-h-[min(420px,50vh)] space-y-m-4 overflow-y-auto pr-1">
                {goals.length === 0 ? (
                  <li className="rounded-m-card border border-dashed border-surface-300 bg-bg2/50 py-m-8 text-center text-[13px] text-ink-4">
                    <p>No goals yet — pick a template or add a custom goal.</p>
                    <button
                      type="button"
                      className="mt-m-4 min-h-[44px] touch-manipulation rounded-m-chip border border-surface-300 px-m-4 text-[11px] font-semibold uppercase tracking-wider text-ink/65 transition-colors hover:border-ink-4 hover:text-ink"
                      onClick={() => addGoalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    >
                      Go to add goal
                    </button>
                  </li>
                ) : (
                  goals.map((g) => {
                    const tgt = Number(g.target_amount);
                    const sv = Number(g.saved_amount);
                    const pct = tgt > 0 ? Math.min(100, Math.round((sv / tgt) * 100)) : 0;
                    const paceHint = goalPaceHint(g);
                    const cheer = goalEncouragement(sv, tgt, g.target_date);
                    const timeLeft = goalTimeLeftLabel(g.target_date);
                    return (
                      <li
                        key={g.goal_id}
                        className="rounded-m-card border border-ctx-border/35 bg-ctx-hero/40 p-m-4"
                      >
                        <div className="flex items-start justify-between gap-m-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink/65">{g.title}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-m-2 gap-y-0.5 text-[10px] uppercase tracking-wider text-ink/35">
                              {g.target_date ? <span>Target {g.target_date}</span> : null}
                              {timeLeft ? (
                                <span className="normal-case tracking-normal text-ink/65">
                                  · {timeLeft}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                            {pct}%
                          </span>
                        </div>
                        <div className="mt-m-3 h-1.5 overflow-hidden rounded-m-cta bg-ctx-surface/90">
                          <div
                            className="h-full rounded-m-cta bg-gradient-to-r from-ctx-accent to-ctx-accent-end transition-[width] duration-medium"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-m-2 text-[11px] tabular-nums">
                          <span className="text-ink">{inr(sv)}</span>
                          <span className="mx-1 text-ink/35">/</span>
                          <span className="text-ink">{inr(tgt)}</span>
                        </p>
                        <p className="mt-m-2 text-[12px] leading-snug text-ink-3">{cheer}</p>
                        {paceHint ? (
                          <p className="mt-m-2 text-[11px] leading-snug text-ink/35">{paceHint}</p>
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            <div ref={addGoalRef} className={`${cardCls} p-m-6 md:p-m-8 lg:col-span-7`}>
              <SectionRule title="Add goal" />
              <p className="mb-m-4 text-[12px] leading-relaxed text-ink-4">
                Goal templates pre-fill title, target, saved so far, and an optional target date—edit anything
                before saving.
              </p>
              <form onSubmit={(e) => void onAddGoal(e)} className="grid gap-m-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                    Goal template
                  </label>
                  <select
                    value={goalTemplateId}
                    onChange={(e) => selectGoalTemplate(e.target.value)}
                    className={inputCls}
                  >
                    <option value={GOAL_TEMPLATE_CUSTOM}>Custom — my own goal below</option>
                    {GOAL_TEMPLATES.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({inr(g.targetAmount)} target)
                      </option>
                    ))}
                  </select>
                  {activeGoalTemplate ? (
                    <p className="mt-m-2 text-[11px] leading-relaxed text-ink-3">{activeGoalTemplate.blurb}</p>
                  ) : (
                    <p className="mt-m-2 text-[11px] leading-relaxed text-ink-4">
                      Adjust title, amounts, or deadline anytime—fields switch to Custom when you type.
                    </p>
                  )}
                </div>
                <input
                  value={goalTitle}
                  onChange={(e) => {
                    setGoalTemplateId(GOAL_TEMPLATE_CUSTOM);
                    setGoalTitle(e.target.value);
                  }}
                  className={inputCls}
                  placeholder="Goal title"
                />
                <div className="grid gap-m-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                      Target (₹)
                    </label>
                    <input
                      value={goalTarget}
                      onChange={(e) => {
                        setGoalTemplateId(GOAL_TEMPLATE_CUSTOM);
                        setGoalTarget(e.target.value);
                      }}
                      className={inputCls}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Target amount"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                      Already saved (₹)
                    </label>
                    <input
                      value={goalSaved}
                      onChange={(e) => {
                        setGoalTemplateId(GOAL_TEMPLATE_CUSTOM);
                        setGoalSaved(e.target.value);
                      }}
                      className={inputCls}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                    Target date (optional)
                  </label>
                  <input
                    value={goalTargetDate}
                    onChange={(e) => {
                      setGoalTemplateId(GOAL_TEMPLATE_CUSTOM);
                      setGoalTargetDate(e.target.value);
                    }}
                    className={inputCls}
                    type="date"
                  />
                </div>
                <button type="submit" disabled={busy} className={`${btnPrimaryCls} mt-m-1`}>
                  Save goal
                </button>
              </form>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-[28px] lg:col-span-12 lg:grid-cols-12 lg:gap-[28px]">
            <div ref={signalsRef} className={`${cardCls} flex flex-col p-m-6 lg:col-span-5`}>
              <div className="mb-m-4 flex items-center gap-m-3">
                <h3 className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink/35">
                  Deeper signals
                </h3>
                <div className="h-px min-w-0 flex-1 bg-rule" />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onEvaluate()}
                  className="shrink-0 rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-ink/65 transition-colors duration-fast hover:border-ink-4 hover:text-ink disabled:opacity-40"
                >
                  Persist
                </button>
              </div>
              <p className="mb-m-3 text-[11px] leading-relaxed text-ink-4">
                Server-side signal rows and persisted chips — use when you want the ledger evaluated into
                stored alerts.
              </p>
              <div className="flex flex-1 flex-col gap-m-3">
                {summary?.insights.map((line, i) => (
                  <div
                    key={i}
                    className="rounded-m-chip border border-surface-300/80 bg-bg2/80 px-m-4 py-m-3 text-[13px] leading-snug text-ink2"
                  >
                    {line}
                  </div>
                ))}
                {summary?.recent_signals?.length ? (
                  <div className="flex flex-wrap gap-2 border-t border-rule pt-m-4">
                    {summary.recent_signals.map((s) => (
                      <span
                        key={s.signal_id}
                        className="max-w-full truncate rounded-m-badge border border-ctx-border/45 bg-ctx-tab-bg px-m-2 py-1 text-[10px] text-ink/65"
                        title={`${s.severity}: ${s.message}`}
                      >
                        {s.message}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className={`${cardCls} p-m-6 lg:col-span-7`}>
              <SectionRule title="Financial intent setup" />
              <p className="mb-m-4 text-[12px] leading-relaxed text-ink-4">
                Step 1 sets your lifestyle budget. Step 2 sets your savings discipline. Together they create your monthly
                plan envelope.
              </p>
              <form onSubmit={(e) => void onQuickSetup(e)} className="grid gap-m-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                    Step 1 · Primary budget (lifestyle)
                  </label>
                  <select
                    value={budgetTemplateId}
                    onChange={(e) => selectBudgetTemplate(e.target.value)}
                    className={inputCls}
                  >
                    <option value={BUDGET_TEMPLATE_CUSTOM}>Use my own lifestyle budget</option>
                    {BUDGET_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} ({inr(t.lifestyleBudget)}/mo)
                      </option>
                    ))}
                  </select>
                  {activeBudgetTemplate ? (
                    <p className="mt-m-2 text-[11px] leading-relaxed text-ink-3">
                      Typical monthly spend for this lifestyle: {inr(activeBudgetTemplate.lifestyleBudget)} ·{" "}
                      {activeBudgetTemplate.positioning}
                    </p>
                  ) : (
                    <p className="mt-m-2 text-[11px] leading-relaxed text-ink-4">
                      All fields stay editable — set your own lifestyle budget and naming.
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                    Step 2 · Savings style (discipline layer)
                  </label>
                  <select
                    value={savingsStyleId}
                    onChange={(e) => selectSavingsStyle(e.target.value)}
                    className={inputCls}
                  >
                    {SAVINGS_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                    <option value={SAVINGS_STYLE_CUSTOM}>Set my own target</option>
                  </select>
                  {activeSavingsStyle ? (
                    <p className="mt-m-2 text-[11px] leading-relaxed text-ink-3">
                      {savingsStyleHint(activeSavingsStyle)} {activeSavingsStyle.behavior}.
                    </p>
                  ) : (
                    <p className="mt-m-2 text-[11px] leading-relaxed text-ink-4">
                      Set your own savings target in ₹.
                    </p>
                  )}
                </div>
                <input
                  value={momentTitle}
                  onChange={(e) => {
                    setBudgetTemplateId(BUDGET_TEMPLATE_CUSTOM);
                    setMomentTitle(e.target.value);
                  }}
                  className={inputCls}
                  placeholder="Moment title"
                />
                <div className="grid gap-m-3 sm:grid-cols-2">
                  <input
                    value={cycleLabel}
                    onChange={(e) => {
                      setBudgetTemplateId(BUDGET_TEMPLATE_CUSTOM);
                      setCycleLabel(e.target.value);
                    }}
                    className={inputCls}
                    placeholder="Cycle label"
                  />
                  <input
                    value={allocated}
                    onChange={(e) => {
                      setBudgetTemplateId(BUDGET_TEMPLATE_CUSTOM);
                      setAllocated(e.target.value);
                      if (savingsStyleId !== SAVINGS_STYLE_CUSTOM) {
                        const style = SAVINGS_STYLES.find((x) => x.id === savingsStyleId);
                        if (style) {
                          setSavingsTarget(String(suggestSavingsTarget(parseFloat(e.target.value) || 0, style)));
                        }
                      }
                    }}
                    className={inputCls}
                    placeholder="Lifestyle budget (₹)"
                    type="number"
                    min={0}
                  />
                </div>
                <div className="grid gap-m-3 sm:grid-cols-2">
                  <input
                    value={savingsTarget}
                    onChange={(e) => {
                      setSavingsStyleId(SAVINGS_STYLE_CUSTOM);
                      setSavingsTarget(e.target.value);
                    }}
                    className={inputCls}
                    placeholder="Savings target (₹)"
                    type="number"
                    min={0}
                  />
                  <div className="rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[12px] text-ink-3">
                    Planned envelope:{" "}
                    <span className="font-semibold text-ink">
                      {inr((parseFloat(allocated) || 0) + (parseFloat(savingsTarget) || 0))}
                    </span>
                  </div>
                </div>
                <button type="submit" disabled={busy} className={btnPrimaryCls}>
                  Create financial plan
                </button>
              </form>
              {moments.length > 0 ? (
                <div className="mt-m-6 border-t border-rule pt-m-4">
                  <p className="mb-m-3 text-[10px] font-semibold uppercase tracking-wider text-ink/35">
                    Existing moments
                  </p>
                  <ul className="flex flex-col gap-m-2">
                    {moments.map((m) => {
                      const mCycles = cycles.filter((c) => c.moment_id === m.moment_id);
                      return (
                        <li
                          key={m.moment_id}
                          className="flex items-center justify-between gap-m-3 rounded-m-chip border border-surface-300/60 bg-bg2/60 px-m-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13px] text-ink/80">{m.title}</p>
                            <p className="text-[10px] text-ink/35">
                              {mCycles.length} cycle{mCycles.length !== 1 ? "s" : ""}
                              {mCycles.length > 0
                                ? ` · ${inr(mCycles.reduce((s, c) => s + c.allocated_budget, 0))}/period`
                                : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onDeleteMoment(m.moment_id)}
                            className="shrink-0 rounded-m-chip border border-urgency-high/30 px-m-3 py-1.5 text-[10px] font-medium text-urgency-high/70 transition-colors duration-fast hover:border-urgency-high/60 hover:text-urgency-high disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>


          <section className={`${cardCls} p-m-6 md:p-m-8 lg:col-span-12`}>
            <SectionRule title="Category budgets" />
            <p className="mb-m-4 text-[12px] leading-relaxed text-ink-4">
              Caps per category (or subcategory) for one cycle. Spent rolls up from transactions linked to that
              cycle.
            </p>
            <form
              onSubmit={(e) => void onAddBudget(e)}
              className="mb-m-6 grid gap-m-3 border-b border-rule pb-m-6 sm:grid-cols-2 lg:grid-cols-12 lg:gap-m-4"
            >
              <div className="lg:col-span-3">
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                  Cycle
                </label>
                <select
                  value={budgetCycleId}
                  onChange={(e) => setBudgetCycleId(e.target.value)}
                  className={inputCls}
                  required
                >
                  <option value="" disabled>
                    Select cycle
                  </option>
                  {cycles.map((c) => (
                    <option key={c.cycle_id} value={c.cycle_id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              {txnCategories.length > 0 ? (
                <>
                  <div className="lg:col-span-3">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                      Category
                    </label>
                    <select
                      value={budgetCategoryId}
                      onChange={(e) => {
                        setBudgetCategoryId(e.target.value);
                        setBudgetSubcategoryId("");
                      }}
                      className={inputCls}
                    >
                      <option value="">—</option>
                      {txnCategories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="lg:col-span-3">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                      Subcategory (optional)
                    </label>
                    <select
                      value={budgetSubcategoryId}
                      onChange={(e) => setBudgetSubcategoryId(e.target.value)}
                      disabled={!budgetCategoryId}
                      className={`${inputCls} disabled:opacity-50`}
                    >
                      <option value="">Whole category</option>
                      {subcategoriesForBudgetCategory.map((s) => (
                        <option key={s.subcategory_id} value={s.subcategory_id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="lg:col-span-6">
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                    Category name
                  </label>
                  <input
                    value={budgetFreeCategory}
                    onChange={(e) => setBudgetFreeCategory(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Food"
                  />
                </div>
              )}
              <div className="lg:col-span-2">
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                  Cap (₹)
                </label>
                <input
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputCls}
                  placeholder="5000"
                />
              </div>
              <div className="flex items-end lg:col-span-1">
                <button
                  type="submit"
                  disabled={busy || !budgetCycleId}
                  className={`${btnPrimaryCls} min-h-[44px] w-full rounded-m-chip py-3 text-[10px]`}
                >
                  Add
                </button>
              </div>
            </form>
            <ul className="max-h-[min(320px,40vh)] space-y-0 overflow-y-auto">
              {budgets.length === 0 ? (
                <li className="py-m-6 text-center text-[13px] text-ink-4">
                  No budget lines for this cycle — add a cap above.
                </li>
              ) : (
                budgets.map((b) => {
                  const cap = Number(b.allocated_amount);
                  const sp = Number(b.spent_amount);
                  const pct = cap > 0 ? Math.min(100, (sp / cap) * 100) : 0;
                  const label = b.subcategory ? `${b.category} › ${b.subcategory}` : b.category;
                  return (
                    <li
                      key={b.budget_id}
                      className="flex flex-col gap-m-2 border-b border-rule py-m-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{label}</p>
                        <p className="text-[11px] tabular-nums text-ink-4">
                          {inr(sp)} of {inr(cap)}
                        </p>
                      </div>
                      <div className="h-2 w-full max-w-xs overflow-hidden rounded-m-cta bg-ctx-surface/90 sm:w-40">
                        <div
                          className="h-full rounded-m-cta bg-gradient-to-r from-ctx-accent to-ctx-accent-end"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          {/* Bottom row: form + ledger */}
          <div className="grid grid-cols-1 gap-[28px] lg:col-span-12 lg:grid-cols-12 lg:gap-[28px]">
            <div
              ref={txnFormRef}
              className={`${cardCls} p-m-6 md:p-m-8 lg:col-span-5 transition-shadow duration-300 ${editingTransaction ? "ring-2 ring-ctx-accent/50 shadow-[0_0_32px_-8px_var(--ctx-accent)]" : ""}`}
            >
              <SectionRule title={editingTransaction ? "Edit transaction" : "Add transaction"} />
              {editingTransaction ? (
                <p className="mb-m-2 rounded-m-chip bg-ctx-accent/10 px-m-3 py-1.5 text-[11px] font-medium text-ctx-accent">
                  Editing: {editingTransaction.merchant || editingTransaction.category || "transaction"} · {inr(editingTransaction.amount)}
                </p>
              ) : null}
              <form onSubmit={(e) => void onAddTransaction(e)} className="mt-m-2 grid gap-m-3">
                <div className="grid gap-m-3 sm:grid-cols-2">
                  <input
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                    className={inputCls}
                  />
                  <input
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    type="date"
                    className={`${inputCls} [color-scheme:dark]`}
                  />
                </div>
                <div className="grid gap-m-3 sm:grid-cols-2">
                  {txnCategories.length > 0 ? (
                    <>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                          Category
                        </label>
                        <select
                          value={categoryId}
                          onChange={(e) => {
                            setCategoryId(e.target.value);
                            setSubcategoryId("");
                          }}
                          className={inputCls}
                        >
                          <option value="">— Optional —</option>
                          {txnCategories.map((c) => (
                            <option key={c.category_id} value={c.category_id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                          Subcategory
                        </label>
                        <select
                          value={subcategoryId}
                          onChange={(e) => setSubcategoryId(e.target.value)}
                          disabled={!categoryId}
                          className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <option value="">
                            {categoryId ? "— Optional —" : "Pick a category first"}
                          </option>
                          {subcategoriesForCategory.map((s) => (
                            <option key={s.subcategory_id} value={s.subcategory_id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        value={freeCategory}
                        onChange={(e) => setFreeCategory(e.target.value)}
                        placeholder="Category"
                        className={inputCls}
                      />
                      <input
                        value={freeSubcategory}
                        onChange={(e) => setFreeSubcategory(e.target.value)}
                        placeholder="Subcategory"
                        className={inputCls}
                      />
                    </>
                  )}
                </div>
                <input
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="Merchant"
                  className={inputCls}
                />
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                    Cycle (optional)
                  </label>
                  <select value={cycleId} onChange={(e) => setCycleId(e.target.value)} className={inputCls}>
                    <option value="">— None —</option>
                    {cycles.map((c) => (
                      <option key={c.cycle_id} value={c.cycle_id}>
                        {c.label} · {inr(c.allocated_budget)} · spent {inr(c.spent_amount)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-m-2 flex flex-col gap-m-2 sm:flex-row sm:items-center">
                  <button type="submit" disabled={busy} className={`${btnPrimaryCls} flex-1`}>
                    {editingTransaction ? "Save changes" : "Add transaction"}
                  </button>
                  {editingTransaction ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => cancelTransactionEdit()}
                      className="min-h-[44px] touch-manipulation rounded-m-chip border border-surface-300 px-m-4 text-[11px] font-semibold uppercase tracking-wider text-ink-3 transition-colors hover:border-ink-4"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </div>

            <div className={`${cardCls} p-m-6 md:p-m-8 lg:col-span-7`}>
              <SectionRule title="Recent transactions" />
              <div className="mb-m-3 flex justify-end">
                <button
                  type="button"
                  disabled={transactions.length === 0}
                  onClick={() => downloadTransactionsCsv()}
                  className="min-h-[44px] touch-manipulation rounded-m-chip border border-surface-300 px-m-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-3 transition-colors hover:border-ink-4 disabled:opacity-40"
                >
                  Export CSV
                </button>
              </div>
              <ul className="mt-m-2 divide-y divide-rule">
                {transactions.length === 0 ? (
                  <li className="py-m-8 text-center text-[13px] text-ink-4">
                    <p>No transactions match these filters.</p>
                    <button
                      type="button"
                      className="mt-m-4 min-h-[44px] touch-manipulation rounded-m-chip border border-surface-300 px-m-4 text-[11px] font-semibold uppercase tracking-wider text-ink/65 transition-colors hover:border-ink-4 hover:text-ink"
                      onClick={() =>
                        txnFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
                      }
                    >
                      Add a transaction
                    </button>
                  </li>
                ) : (
                  transactions.map((t) => {
                    const catLine = transactionCategoryLabel(t);
                    const title = t.merchant || catLine || "Transaction";
                    const showCatInMeta = Boolean(t.merchant && catLine);
                    return (
                    <li
                      key={t.transaction_id}
                      className="flex items-center justify-between gap-m-4 py-m-4 transition-colors duration-fast first:pt-0 hover:bg-surface-200/20"
                    >
                      <div className="min-w-0 flex items-start gap-m-4">
                        <div className="hidden w-12 shrink-0 pt-0.5 text-center sm:block">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-4">
                            {t.transaction_date.slice(5, 7)}
                          </p>
                          <p className="text-lg leading-none font-semibold text-ink-3">
                            {t.transaction_date.slice(8, 10)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-ink">{title}</p>
                          <p className="mt-0.5 text-[11px] text-ink-4">
                            {showCatInMeta ? (
                              <span className="text-ink-3">{catLine} · </span>
                            ) : null}
                            <span className="sm:hidden">{t.transaction_date}</span>
                            {t.description ? (
                              <span className="mt-1 block truncate text-ink-4/80">{t.description}</span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-m-2">
                        <span className="text-lg font-semibold tabular-nums text-ink">{inr(t.amount)}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => fillFormFromTransaction(t)}
                            className="rounded-m-chip border border-surface-300 px-m-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-ink-3 transition-colors hover:border-ink-4 hover:text-ink disabled:opacity-40"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onDeleteTransaction(t)}
                            className="rounded-m-chip border border-urgency-high/40 px-m-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-urgency-high transition-colors hover:bg-urgency-high/10 disabled:opacity-40"
                          >
                            Del
                          </button>
                        </div>
                      </div>
                    </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="fixed bottom-8 right-6 z-40 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-ctx-accent to-ctx-accent-end text-[28px] font-light leading-none text-white shadow-[0_0_36px_-8px_var(--ctx-accent)] transition-transform duration-fast hover:scale-[1.04] active:scale-[0.98] lg:right-10"
        aria-label="Add transaction"
        onClick={() => txnFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
      >
        +
      </button>
    </div>
  );
}
