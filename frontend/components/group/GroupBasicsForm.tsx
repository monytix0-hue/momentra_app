"use client";

const inputCls =
  "w-full rounded-m-chip border border-surface-300 bg-surface-100 px-m-3 py-2.5 text-[14px] text-ink placeholder:text-ink-4 focus:border-ctx-accent focus:outline-none focus:ring-1 focus:ring-ctx-accent/35";

export function GroupBasicsForm({
  title,
  description,
  targetAmount,
  dueDate,
  monthlyRhythm,
  onTitle,
  onDescription,
  onTargetAmount,
  onDueDate,
  onMonthlyRhythm,
  showMonthlyHint,
}: {
  title: string;
  description: string;
  targetAmount: string;
  dueDate: string;
  monthlyRhythm: boolean;
  onTitle: (v: string) => void;
  onDescription: (v: string) => void;
  onTargetAmount: (v: string) => void;
  onDueDate: (v: string) => void;
  onMonthlyRhythm: (v: boolean) => void;
  showMonthlyHint: boolean;
}) {
  return (
    <div className="space-y-m-5">
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">Group name</span>
        <input
          className={`${inputCls} mt-1.5`}
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Goa weekend, Flat 4B…"
          autoComplete="off"
        />
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
          Description <span className="font-normal text-ink-4">(optional)</span>
        </span>
        <textarea
          className={`${inputCls} mt-1.5 min-h-[88px] resize-y`}
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          placeholder="A line or two so everyone knows what this is for."
        />
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
          Target amount (₹) <span className="font-normal text-ink-4">(optional)</span>
        </span>
        <input
          className={`${inputCls} mt-1.5`}
          inputMode="decimal"
          value={targetAmount}
          onChange={(e) => onTargetAmount(e.target.value)}
          placeholder="Rough shared budget — you can refine later"
        />
        <p className="mt-1.5 text-[12px] text-ink-4">Helpful for pooled trips and shared goals. Skip if you’re not sure yet.</p>
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
          Wrap-up or next check-in <span className="font-normal text-ink-4">(optional)</span>
        </span>
        <input type="date" className={`${inputCls} mt-1.5`} value={dueDate} onChange={(e) => onDueDate(e.target.value)} />
        <p className="mt-1.5 text-[12px] text-ink-4">e.g. trip end date or when you’ll review the pot together.</p>
      </label>
      <label className="flex cursor-pointer items-start gap-m-3 rounded-m-card border border-surface-300 bg-bg2/50 p-m-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-ctx-accent"
          checked={monthlyRhythm}
          onChange={(e) => onMonthlyRhythm(e.target.checked)}
        />
        <span className="min-w-0">
          <span className="block text-[14px] font-medium text-ink">Repeats monthly</span>
          <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-3">
            {showMonthlyHint
              ? "Turn on for rent-style rhythms or any group that settles every month."
              : "Creates an ongoing monthly cycle — great alongside pooled or hybrid setups."}
          </span>
        </span>
      </label>
    </div>
  );
}
