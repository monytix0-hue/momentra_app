-- Personal module: user_id references profiles.id (Firebase uid), not a separate users UUID table.
create table if not exists public.personal_moments (
  moment_id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  title varchar(255) not null,
  moment_type varchar(50) not null,
  duration_type varchar(20) not null,
  target_amount numeric(12, 2),
  start_date date,
  end_date date,
  status varchar(20) not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.personal_cycles (
  cycle_id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.personal_moments (moment_id) on delete cascade,
  label varchar(50) not null,
  start_date date not null,
  end_date date not null,
  allocated_budget numeric(12, 2) not null default 0,
  spent_amount numeric(12, 2) not null default 0
);

create table if not exists public.personal_transactions (
  transaction_id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  moment_id uuid references public.personal_moments (moment_id) on delete set null,
  cycle_id uuid references public.personal_cycles (cycle_id) on delete set null,
  amount numeric(12, 2) not null,
  category varchar(50),
  merchant varchar(255),
  description text,
  transaction_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.personal_budgets (
  budget_id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.personal_cycles (cycle_id) on delete cascade,
  category varchar(50) not null,
  allocated_amount numeric(12, 2) not null default 0,
  spent_amount numeric(12, 2) not null default 0
);

create table if not exists public.personal_goals (
  goal_id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  title varchar(255) not null,
  target_amount numeric(12, 2) not null,
  saved_amount numeric(12, 2) not null default 0,
  target_date date
);

create table if not exists public.personal_signals (
  signal_id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  signal_type varchar(50) not null,
  severity varchar(10) not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists personal_moments_user_idx on public.personal_moments (user_id);
create index if not exists personal_cycles_moment_idx on public.personal_cycles (moment_id);
create index if not exists personal_transactions_user_idx on public.personal_transactions (user_id);
create index if not exists personal_transactions_cycle_idx on public.personal_transactions (cycle_id);
create index if not exists personal_transactions_date_idx on public.personal_transactions (transaction_date);
create index if not exists personal_budgets_cycle_idx on public.personal_budgets (cycle_id);
create index if not exists personal_goals_user_idx on public.personal_goals (user_id);
create index if not exists personal_signals_user_idx on public.personal_signals (user_id);

alter table public.personal_moments enable row level security;
alter table public.personal_cycles enable row level security;
alter table public.personal_transactions enable row level security;
alter table public.personal_budgets enable row level security;
alter table public.personal_goals enable row level security;
alter table public.personal_signals enable row level security;
