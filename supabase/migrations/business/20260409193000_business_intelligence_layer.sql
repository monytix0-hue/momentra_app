-- Business intelligence layer for decision-first console (signals/recommendations/snapshots)

alter table public.business_signals
  add column if not exists title text,
  add column if not exists action_type varchar(64),
  add column if not exists action_target_type varchar(64),
  add column if not exists action_target_id uuid;

alter table public.business_signals
  drop constraint if exists business_signals_severity_check;

alter table public.business_signals
  add constraint business_signals_severity_check
  check (severity in ('info', 'warning', 'critical', 'LOW', 'MEDIUM', 'HIGH'));

create table if not exists public.business_recommendations (
  recommendation_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (workspace_id) on delete cascade,
  recommendation_type varchar(64) not null,
  priority int not null default 3,
  title text not null,
  message text not null,
  action_type varchar(64) not null,
  action_target_type varchar(64) not null,
  action_target_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.business_control_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (workspace_id) on delete cascade,
  date_key date not null,
  total_budget numeric(14,2),
  approved_spend numeric(14,2) not null default 0,
  pending_spend numeric(14,2) not null default 0,
  remaining_budget numeric(14,2),
  approvals_count int not null default 0,
  control_score int,
  created_at timestamptz not null default now(),
  unique (workspace_id, date_key)
);

create table if not exists public.business_unit_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (workspace_id) on delete cascade,
  unit_id uuid not null references public.business_units (unit_id) on delete cascade,
  date_key date not null,
  budget_limit numeric(14,2),
  approved_spend numeric(14,2) not null default 0,
  pending_spend numeric(14,2) not null default 0,
  utilization_pct numeric(7,2),
  performance_state varchar(24),
  created_at timestamptz not null default now(),
  unique (workspace_id, unit_id, date_key)
);

create table if not exists public.business_cost_center_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (workspace_id) on delete cascade,
  cost_center_id uuid not null references public.business_cost_centers (cost_center_id) on delete cascade,
  date_key date not null,
  budget_limit numeric(14,2),
  approved_spend numeric(14,2) not null default 0,
  pending_spend numeric(14,2) not null default 0,
  utilization_pct numeric(7,2),
  created_at timestamptz not null default now(),
  unique (workspace_id, cost_center_id, date_key)
);

create index if not exists business_recommendations_workspace_idx
  on public.business_recommendations (workspace_id, priority, created_at);
create index if not exists business_control_snapshots_workspace_date_idx
  on public.business_control_snapshots (workspace_id, date_key desc);
create index if not exists business_unit_snapshots_workspace_date_idx
  on public.business_unit_snapshots (workspace_id, date_key desc);
create index if not exists business_cost_center_snapshots_workspace_date_idx
  on public.business_cost_center_snapshots (workspace_id, date_key desc);

alter table public.business_recommendations enable row level security;
alter table public.business_control_snapshots enable row level security;
alter table public.business_unit_snapshots enable row level security;
alter table public.business_cost_center_snapshots enable row level security;
