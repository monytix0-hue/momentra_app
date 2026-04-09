-- Group intelligence: richer signals, recommendations, optional daily/cycle snapshots.

alter table public.group_signals
  add column if not exists title text,
  add column if not exists action_type varchar(64),
  add column if not exists action_target_type varchar(64),
  add column if not exists action_target_id uuid;

create table if not exists public.group_recommendations (
  recommendation_id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_moments (group_id) on delete cascade,
  cycle_id uuid references public.group_cycles (cycle_id) on delete set null,
  recommendation_type varchar(48) not null,
  priority int not null default 3,
  title text not null,
  message text not null,
  action_type varchar(64) not null,
  action_target_type varchar(64) not null,
  action_target_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.group_summary_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_moments (group_id) on delete cascade,
  cycle_id uuid references public.group_cycles (cycle_id) on delete set null,
  date_key date not null,
  target_amount numeric(14, 2),
  committed_amount numeric(14, 2) not null default 0,
  paid_amount numeric(14, 2) not null default 0,
  pending_count int not null default 0,
  overdue_count int not null default 0,
  open_balance numeric(14, 2) not null default 0,
  health_state varchar(24) not null,
  created_at timestamptz not null default now(),
  unique (group_id, date_key)
);

create table if not exists public.group_participant_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_moments (group_id) on delete cascade,
  cycle_id uuid references public.group_cycles (cycle_id) on delete set null,
  participant_id uuid not null references public.group_participants (participant_id) on delete cascade,
  date_key date not null,
  committed_amount numeric(14, 2) not null default 0,
  paid_amount numeric(14, 2) not null default 0,
  remaining_amount numeric(14, 2) not null default 0,
  status varchar(16) not null,
  created_at timestamptz not null default now(),
  unique (group_id, participant_id, date_key)
);

create index if not exists group_recommendations_group_idx
  on public.group_recommendations (group_id, priority, created_at desc);
create index if not exists group_summary_snapshots_group_date_idx
  on public.group_summary_snapshots (group_id, date_key desc);
create index if not exists group_participant_snapshots_group_date_idx
  on public.group_participant_snapshots (group_id, date_key desc);

alter table public.group_recommendations enable row level security;
alter table public.group_summary_snapshots enable row level security;
alter table public.group_participant_snapshots enable row level security;
