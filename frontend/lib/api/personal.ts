import { getApiBaseUrl } from "@/lib/api/client";

async function headersJson(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  } as const;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (text) {
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        if (typeof json.detail === "string") throw new Error(json.detail);
        if (typeof json.message === "string") throw new Error(json.message);
      } catch (e) {
        if (e instanceof Error && e.message !== text) throw e;
      }
    }
    throw new Error(text || `${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type PersonalSummary = {
  money_left: string | number;
  total_allocated: string | number;
  total_spent_period: string | number;
  period_label: string;
  insights: string[];
  top_category: string | null;
  recent_signals: {
    signal_id: string;
    user_id: string;
    signal_type: string;
    severity: string;
    message: string;
    created_at?: string | null;
  }[];
};

export type PersonalMoment = {
  moment_id: string;
  user_id: string;
  title: string;
  moment_type: string;
  duration_type: string;
  target_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at?: string | null;
};

export type PersonalCycle = {
  cycle_id: string;
  moment_id: string;
  label: string;
  start_date: string;
  end_date: string;
  allocated_budget: number;
  spent_amount: number;
};

export type PersonalGoal = {
  goal_id: string;
  user_id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
};

export type PersonalBudget = {
  budget_id: string;
  cycle_id: string;
  category: string;
  subcategory?: string | null;
  allocated_amount: number;
  spent_amount: number;
  category_id?: string | null;
  subcategory_id?: string | null;
};

export type PersonalTxnSubcategory = {
  subcategory_id: string;
  slug: string;
  label: string;
  sort_order: number;
};

export type PersonalTxnCategory = {
  category_id: string;
  slug: string;
  label: string;
  sort_order: number;
  subcategories: PersonalTxnSubcategory[];
};

export type PersonalTransaction = {
  transaction_id: string;
  user_id: string;
  moment_id: string | null;
  cycle_id: string | null;
  amount: number;
  category: string | null;
  subcategory?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  merchant: string | null;
  description: string | null;
  transaction_date: string;
  created_at?: string | null;
};

export type SpendBreakdown = {
  rows: { label: string; category_id: string | null; amount: string | number }[];
  total: string | number;
};

export async function fetchPersonalSummary(token: string): Promise<PersonalSummary> {
  const res = await fetch(`${getApiBaseUrl()}/personal/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<PersonalSummary>(res);
}

export async function fetchMoments(token: string): Promise<PersonalMoment[]> {
  const res = await fetch(`${getApiBaseUrl()}/personal/moments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<PersonalMoment[]>(res);
}

export async function fetchCycles(token: string, momentId?: string): Promise<PersonalCycle[]> {
  const q = momentId ? `?moment_id=${encodeURIComponent(momentId)}` : "";
  const res = await fetch(`${getApiBaseUrl()}/personal/cycles${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<PersonalCycle[]>(res);
}

export type FetchTransactionsOpts = {
  limit?: number;
  month?: string;
  cycle_id?: string;
  category_id?: string;
  merchant?: string;
};

export async function fetchTransactions(
  token: string,
  opts?: FetchTransactionsOpts,
): Promise<PersonalTransaction[]> {
  const q = new URLSearchParams();
  q.set("limit", String(opts?.limit ?? 100));
  if (opts?.month) q.set("month", opts.month);
  if (opts?.cycle_id) q.set("cycle_id", opts.cycle_id);
  if (opts?.category_id) q.set("category_id", opts.category_id);
  if (opts?.merchant?.trim()) q.set("merchant", opts.merchant.trim());
  const res = await fetch(`${getApiBaseUrl()}/personal/transactions?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<PersonalTransaction[]>(res);
}

export async function fetchSpendBreakdown(
  token: string,
  opts?: { cycle_id?: string; month?: string },
): Promise<SpendBreakdown> {
  const q = new URLSearchParams();
  if (opts?.month) q.set("month", opts.month);
  if (opts?.cycle_id) q.set("cycle_id", opts.cycle_id);
  const qs = q.toString();
  const res = await fetch(
    `${getApiBaseUrl()}/personal/spend-breakdown${qs ? `?${qs}` : ""}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return parseJson<SpendBreakdown>(res);
}

export async function fetchTransactionCategories(
  token: string,
): Promise<PersonalTxnCategory[]> {
  const res = await fetch(`${getApiBaseUrl()}/personal/transaction-categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<PersonalTxnCategory[]>(res);
}

export async function createTransaction(
  token: string,
  body: {
    amount: number;
    category?: string | null;
    subcategory?: string | null;
    category_id?: string | null;
    subcategory_id?: string | null;
    merchant?: string | null;
    description?: string | null;
    transaction_date: string;
    moment_id?: string | null;
    cycle_id?: string | null;
  },
): Promise<PersonalTransaction> {
  const res = await fetch(`${getApiBaseUrl()}/personal/transactions`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<PersonalTransaction>(res);
}

export async function updateTransaction(
  token: string,
  transactionId: string,
  body: Partial<{
    amount: number;
    category: string | null;
    subcategory: string | null;
    category_id: string | null;
    subcategory_id: string | null;
    merchant: string | null;
    description: string | null;
    transaction_date: string;
    moment_id: string | null;
    cycle_id: string | null;
  }>,
): Promise<PersonalTransaction> {
  const res = await fetch(`${getApiBaseUrl()}/personal/transactions/${transactionId}`, {
    method: "PATCH",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<PersonalTransaction>(res);
}

export async function deleteTransaction(token: string, transactionId: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/personal/transactions/${transactionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return parseJson<void>(res);
  }
}

export async function fetchBudgets(token: string, cycleId: string): Promise<PersonalBudget[]> {
  const q = new URLSearchParams({ cycle_id: cycleId });
  const res = await fetch(`${getApiBaseUrl()}/personal/budgets?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<PersonalBudget[]>(res);
}

export async function createBudget(
  token: string,
  body: {
    cycle_id: string;
    allocated_amount: number;
    category?: string | null;
    category_id?: string | null;
    subcategory_id?: string | null;
  },
): Promise<PersonalBudget> {
  const res = await fetch(`${getApiBaseUrl()}/personal/budgets`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<PersonalBudget>(res);
}

export async function createCycle(
  token: string,
  body: {
    moment_id: string;
    label: string;
    start_date: string;
    end_date: string;
    allocated_budget: number;
  },
): Promise<PersonalCycle> {
  const res = await fetch(`${getApiBaseUrl()}/personal/cycles`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<PersonalCycle>(res);
}

export async function createMoment(
  token: string,
  body: {
    title: string;
    moment_type: string;
    duration_type: string;
    target_amount?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    status?: string;
  },
): Promise<PersonalMoment> {
  const res = await fetch(`${getApiBaseUrl()}/personal/moments`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<PersonalMoment>(res);
}

export async function fetchGoals(token: string): Promise<PersonalGoal[]> {
  const res = await fetch(`${getApiBaseUrl()}/personal/goals`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<PersonalGoal[]>(res);
}

export async function createGoal(
  token: string,
  body: {
    title: string;
    target_amount: number;
    saved_amount?: number;
    target_date?: string | null;
  },
): Promise<PersonalGoal> {
  const res = await fetch(`${getApiBaseUrl()}/personal/goals`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify({
      title: body.title,
      target_amount: body.target_amount,
      saved_amount: body.saved_amount ?? 0,
      target_date: body.target_date ?? undefined,
    }),
  });
  return parseJson<PersonalGoal>(res);
}

export async function evaluateSignals(token: string): Promise<{ insights: number }> {
  const res = await fetch(`${getApiBaseUrl()}/personal/signals/evaluate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<{ insights: number }>(res);
}

export function transactionsToCsv(rows: PersonalTransaction[]): string {
  const header = [
    "transaction_id",
    "transaction_date",
    "amount",
    "category",
    "subcategory",
    "merchant",
    "description",
    "cycle_id",
  ];
  const esc = (s: string | null | undefined) => {
    const v = (s ?? "").replace(/"/g, '""');
    return `"${v}"`;
  };
  const lines = [header.join(",")];
  for (const t of rows) {
    lines.push(
      [
        esc(t.transaction_id),
        esc(t.transaction_date),
        String(t.amount),
        esc(t.category),
        esc(t.subcategory ?? ""),
        esc(t.merchant),
        esc(t.description),
        esc(t.cycle_id),
      ].join(","),
    );
  }
  return lines.join("\n");
}
