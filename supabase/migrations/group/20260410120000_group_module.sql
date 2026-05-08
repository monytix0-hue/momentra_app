-- Group module: commitment-first social financial coordination.
-- created_by / user_id reference Firebase uid in profiles.id (text).

create table if not exists public.group_moments (
  group_id uuid primary key default gen_random_uuid(),
  created_by text not null references public.profiles (id) on delete restrict,
  title varchar(255) not null,
  group_type varchar(32) not null
    check (group_type in ('trip', 'roommates', 'event', 'family', 'couple', 'custom')),
  duration_type varchar(16) not null
    check (duration_type in ('one_time', 'ongoing')),
  cycle_type varchar(16) not null default 'none'
    check (cycle_type in ('none', 'monthly', 'weekly', 'custom')),
  funding_model varchar(24) not null
    check (funding_model in ('pooled', 'split_expenses', 'hybrid')),
  split_rule_type varchar(24) not null default 'equal'
    check (split_rule_type in ('equal', 'custom_amounts', 'percentages')),
  target_amount numeric(14, 2),
  start_date date,
  end_date date,
  status varchar(16) not null default 'draft'
    check (status in ('draft', 'active', 'completed', 'archived')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_cycles (
  cycle_id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_moments (group_id) on delete cascade,
  label varchar(80) not null,
  start_date date not null,
  end_date date not null,
  target_amount numeric(14, 2) not null default 0,
  collected_amount numeric(14, 2) not null default 0,
  status varchar(16) not null default 'active'
    check (status in ('draft', 'active', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.group_participants (
  participant_id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_moments (group_id) on delete cascade,
  user_id text references public.profiles (id) on delete set null,
  display_name varchar(120) not null,
  role varchar(16) not null default 'member'
    check (role in ('admin', 'member')),
  status varchar(16) not null default 'active'
    check (status in ('active', 'invited', 'removed')),
  joined_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists group_participants_group_user_uidx
  on public.group_participants (group_id, user_id)
  where user_id is not null;

create table if not exists public.group_commitments (
  commitment_id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_moments (group_id) on delete cascade,
  cycle_id uuid references public.group_cycles (cycle_id) on delete cascade,
  participant_id uuid not null references public.group_participants (participant_id) on delete cascade,
  committed_amount numeric(14, 2) not null default 0,
  paid_amount numeric(14, 2) not null default 0,
  due_date date,
  status varchar(16) not null default 'pending'
    check (status in ('pending', 'partial', 'fulfilled', 'overdue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_expenses (
  expense_id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_moments (group_id) on delete cascade,
  cycle_id uuid references public.group_cycles (cycle_id) on delete set null,
  title varchar(255) not null,
  amount numeric(14, 2) not null,
  paid_by_participant_id uuid not null references public.group_participants (participant_id) on delete restrict,
  category varchar(80),
  description text,
  expense_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_expense_shares (
  share_id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.group_expenses (expense_id) on delete cascade,
  participant_id uuid not null references public.group_participants (participant_id) on delete cascade,
  owed_amount numeric(14, 2) not null default 0,
  settled_amount numeric(14, 2) not null default 0,
  status varchar(16) not null default 'pending'
    check (status in ('pending', 'partial', 'settled')),
  created_at timestamptz not null default now(),
  unique (expense_id, participant_id)
);

create table if not exists public.group_settlements (
  settlement_id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_moments (group_id) on delete cascade,
  cycle_id uuid references public.group_cycles (cycle_id) on delete set null,
  from_participant_id uuid not null references public.group_participants (participant_id) on delete restrict,
  to_participant_id uuid not null references public.group_participants (participant_id) on delete restrict,
  amount numeric(14, 2) not null,
  status varchar(16) not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled')),
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  check (from_participant_id <> to_participant_id)
);

create table if not exists public.group_reminders (
  reminder_id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_moments (group_id) on delete cascade,
  cycle_id uuid references public.group_cycles (cycle_id) on delete set null,
  participant_id uuid not null references public.group_participants (participant_id) on delete cascade,
  reminder_type varchar(32) not null
    check (reminder_type in ('commitment_due', 'overdue', 'settlement_due')),
  message text not null,
  sent_by text references public.profiles (id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.group_activity (
  activity_id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_moments (group_id) on delete cascade,
  cycle_id uuid references public.group_cycles (cycle_id) on delete set null,
  actor_id text references public.profiles (id) on delete set null,
  event_type varchar(64) not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_signals (
  signal_id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_moments (group_id) on delete cascade,
  cycle_id uuid references public.group_cycles (cycle_id) on delete set null,
  signal_type varchar(48) not null,
  severity varchar(12) not null default 'medium'
    check (severity in ('low', 'medium', 'high')),
  message text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists group_cycles_group_idx on public.group_cycles (group_id);
create index if not exists group_participants_group_idx on public.group_participants (group_id);
create index if not exists group_participants_user_idx on public.group_participants (user_id);
create index if not exists group_commitments_group_idx on public.group_commitments (group_id);
create index if not exists group_commitments_cycle_idx on public.group_commitments (cycle_id);
create index if not exists group_commitments_group_status_idx on public.group_commitments (group_id, status);
create index if not exists group_expenses_group_idx on public.group_expenses (group_id);
create index if not exists group_expenses_group_date_idx on public.group_expenses (group_id, expense_date desc);
create index if not exists group_expense_shares_expense_idx on public.group_expense_shares (expense_id);
create index if not exists group_settlements_group_idx on public.group_settlements (group_id);
create index if not exists group_reminders_group_idx on public.group_reminders (group_id);
create index if not exists group_activity_group_idx on public.group_activity (group_id, created_at desc);
create index if not exists group_signals_group_idx on public.group_signals (group_id);
create index if not exists group_signals_unresolved_idx on public.group_signals (group_id) where resolved = false;

-- updated_at
create or replace function public.group_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists group_moments_updated_at on public.group_moments;
create trigger group_moments_updated_at
  before update on public.group_moments
  for each row execute function public.group_set_updated_at();

drop trigger if exists group_commitments_updated_at on public.group_commitments;
create trigger group_commitments_updated_at
  before update on public.group_commitments
  for each row execute function public.group_set_updated_at();

alter table public.group_moments enable row level security;
alter table public.group_cycles enable row level security;
alter table public.group_participants enable row level security;
alter table public.group_commitments enable row level security;
alter table public.group_expenses enable row level security;
alter table public.group_expense_shares enable row level security;
alter table public.group_settlements enable row level security;
alter table public.group_reminders enable row level security;
alter table public.group_activity enable row level security;
alter table public.group_signals enable row level security;
