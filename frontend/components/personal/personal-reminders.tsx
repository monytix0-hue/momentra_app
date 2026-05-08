"use client";

import type { PersonalReminder } from "@/lib/api/personal";
import { useMemo } from "react";

const cardCls =
  "relative overflow-hidden rounded-m-hero border border-surface-300 bg-surface-100 shadow-[inset_0_1px_0_0_rgba(201,168,76,0.06)]";

const btnSmallCls =
  "min-h-[36px] touch-manipulation rounded-m-chip border border-surface-300 px-m-3 text-[10px] font-semibold uppercase tracking-wider transition-colors duration-fast";

const CATEGORY_ICONS: Record<string, string> = {
  mobile_recharge: "📱",
  electricity: "💡",
  water: "🚰",
  gas: "🔥",
  internet: "🌐",
  dth: "📺",
  insurance: "🛡️",
  emi: "🏦",
  subscription: "🎵",
  rent: "🏠",
  other: "📋",
};

const CATEGORY_LABELS: Record<string, string> = {
  mobile_recharge: "Mobile Recharge",
  electricity: "Electricity",
  water: "Water",
  gas: "Gas",
  internet: "Internet",
  dth: "DTH",
  insurance: "Insurance",
  emi: "EMI",
  subscription: "Subscription",
  rent: "Rent",
  other: "Other",
};

function daysUntil(dueDateStr: string): { label: string; urgent: boolean } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDateStr}T00:00:00`);
  const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return { label: `Overdue by ${Math.abs(diff)}d`, urgent: true };
  if (diff === 0) return { label: "Due today", urgent: true };
  if (diff === 1) return { label: "Due tomorrow", urgent: true };
  if (diff <= 3) return { label: `In ${diff} days`, urgent: true };
  if (diff <= 7) return { label: `In ${diff} days`, urgent: false };
  return { label: `${diff} days left`, urgent: false };
}

function formatInr(n: number | string): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
}

type ReminderCardProps = {
  reminders: PersonalReminder[];
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
  busy?: boolean;
};

export function ReminderCard({ reminders, onMarkPaid, onDelete, busy }: ReminderCardProps) {
  const upcoming = useMemo(
    () =>
      reminders.filter((r) => !r.is_paid).sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [reminders],
  );

  const totalUpcoming = useMemo(
    () => upcoming.reduce((sum, r) => sum + Number(r.amount), 0),
    [upcoming],
  );

  if (upcoming.length === 0) {
    return (
      <div className={`${cardCls} p-m-6 md:p-m-8`}>
        <div className="flex items-center gap-m-3">
          <h3 className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink/35">
            Upcoming payments
          </h3>
          <div className="h-px flex-1 bg-rule" />
        </div>
        <p className="mt-m-4 text-[13px] leading-relaxed text-ink-4">
          All paid up — no upcoming bills or recharges.
        </p>
      </div>
    );
  }

  return (
    <div className={`${cardCls} p-m-6 md:p-m-8`}>
      <div className="mb-m-3 flex items-center gap-m-3">
        <h3 className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink/35">
          Upcoming payments
        </h3>
        <div className="h-px flex-1 bg-rule" />
        <span className="rounded-m-badge bg-ctx-accent/15 px-m-2 py-1 text-[10px] font-semibold text-ctx-accent">
          {formatInr(totalUpcoming)}
        </span>
      </div>

      <ul className="space-y-m-2">
        {upcoming.slice(0, 10).map((r) => {
          const due = daysUntil(r.due_date);
          const icon = CATEGORY_ICONS[r.category] ?? CATEGORY_ICONS["other"];
          const catLabel = CATEGORY_LABELS[r.category] ?? r.category;

          return (
            <li
              key={r.reminder_id}
              className={`rounded-m-card border px-m-3 py-m-2 transition-colors ${
                due.urgent
                  ? "border-urgency-high/30 bg-urgency-high/5"
                  : "border-ctx-border/30 bg-ctx-hero/40"
              }`}
            >
              <div className="flex items-center justify-between gap-m-2">
                <div className="flex min-w-0 items-center gap-m-2">
                  <span className="shrink-0 text-[16px]">{icon}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">{r.title}</p>
                    <p className="text-[10px] text-ink-3">{catLabel}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-m-2">
                  <div className="text-right">
                    <p className="text-[14px] font-semibold tabular-nums text-ink">
                      {formatInr(r.amount)}
                    </p>
                    <p
                      className={`text-[10px] font-medium ${
                        due.urgent ? "text-urgency-high" : "text-ink-3"
                      }`}
                    >
                      {due.label}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onMarkPaid(r.reminder_id)}
                    className={`${btnSmallCls} border-ctx-accent/40 text-ctx-accent hover:bg-ctx-accent/10 disabled:opacity-30`}
                    title="Mark as paid"
                  >
                    ✓ Paid
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {upcoming.length > 10 && (
        <p className="mt-m-3 text-center text-[11px] text-ink-4">
          +{upcoming.length - 10} more payments
        </p>
      )}
    </div>
  );
}

export function AddReminderForm({
  onAdd,
  busy,
}: {
  onAdd: (body: { title: string; category: string; amount: number; due_date: string; recurring?: string }) => void;
  busy?: boolean;
}) {
  const todayIso = () => new Date().toISOString().slice(0, 10);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        const title = (data.get("title") as string)?.trim();
        const category = (data.get("category") as string) || "other";
        const amount = parseFloat(data.get("amount") as string);
        const due_date = data.get("due_date") as string;
        const recurring = (data.get("recurring") as string) || undefined;
        if (!title || Number.isNaN(amount) || amount <= 0 || !due_date) return;
        onAdd({ title, category, amount, due_date, recurring });
        form.reset();
      }}
      className="grid grid-cols-2 gap-m-2"
    >
      <input
        name="title"
        placeholder="Jio Recharge"
        required
        className="col-span-2 w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink placeholder:text-ink-4 transition-[border-color,box-shadow] duration-fast ease-standard focus:border-ctx-accent focus:outline-none focus:ring-1 focus:ring-ctx-accent/35"
      />
      <select
        name="category"
        className="w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink transition-[border-color,box-shadow] duration-fast ease-standard focus:border-ctx-accent focus:outline-none focus:ring-1 focus:ring-ctx-accent/35"
        defaultValue="other"
      >
        {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
          <option key={val} value={val}>
            {label}
          </option>
        ))}
      </select>
      <input
        name="amount"
        type="number"
        step="1"
        min="1"
        placeholder="Amount"
        required
        className="w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink placeholder:text-ink-4 transition-[border-color,box-shadow] duration-fast ease-standard focus:border-ctx-accent focus:outline-none focus:ring-1 focus:ring-ctx-accent/35"
      />
      <input
        name="due_date"
        type="date"
        defaultValue={todayIso()}
        required
        className="w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink transition-[border-color,box-shadow] duration-fast ease-standard focus:border-ctx-accent focus:outline-none focus:ring-1 focus:ring-ctx-accent/35"
      />
      <select
        name="recurring"
        className="w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink transition-[border-color,box-shadow] duration-fast ease-standard focus:border-ctx-accent focus:outline-none focus:ring-1 focus:ring-ctx-accent/35"
      >
        <option value="">One-time</option>
        <option value="monthly">Monthly</option>
        <option value="quarterly">Quarterly</option>
        <option value="yearly">Yearly</option>
      </select>
      <button
        type="submit"
        disabled={busy}
        className="min-h-[44px] touch-manipulation rounded-[14px] bg-gradient-to-br from-ctx-accent to-ctx-accent-end py-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_0_24px_-8px_var(--ctx-accent)] transition-[opacity,transform] duration-fast hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
      >
        {busy ? "Adding…" : "Add reminder"}
      </button>
    </form>
  );
}
