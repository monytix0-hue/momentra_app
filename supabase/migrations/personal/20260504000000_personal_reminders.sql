-- Bill & Recharge Reminders: daily-use feature for tracking upcoming payments
-- Categories: mobile_recharge, electricity, water, gas, internet, dth, insurance, emi, subscription, rent, other
create table if not exists public.personal_reminders (
  reminder_id    uuid primary key default gen_random_uuid(),
  user_id        text not null references public.profiles (id) on delete cascade,
  title          varchar(255) not null,           -- e.g. "Jio Recharge", "Electricity Bill"
  category       varchar(50) not null default 'other',  -- mobile_recharge, electricity, etc.
  amount         numeric(12, 2) not null,         -- expected amount
  due_date       date not null,                    -- when it's due
  is_paid        boolean not null default false,   -- marked paid by user
  recurring      varchar(20),                       -- null = one-time, or 'monthly', 'quarterly', 'yearly'
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists personal_reminders_user_idx on public.personal_reminders (user_id);
create index if not exists personal_reminders_due_date_idx on public.personal_reminders (due_date);
create index if not exists personal_reminders_paid_idx on public.personal_reminders (user_id, is_paid);

alter table public.personal_reminders enable row level security;
