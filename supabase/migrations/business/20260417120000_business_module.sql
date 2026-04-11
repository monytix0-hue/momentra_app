-- Business module: workspace-centered financial operations with approval flow.

create table if not exists public.business_workspaces (
  workspace_id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  business_type varchar(64) not null,
  total_budget numeric(14, 2),
  currency varchar(8) not null default 'INR',
  created_by text not null references public.profiles (id) on delete restrict,
  status varchar(16) not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_units (
  unit_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (workspace_id) on delete cascade,
  name varchar(160) not null,
  unit_type varchar(32) not null
    check (unit_type in ('store', 'factory', 'warehouse', 'branch', 'office', 'other')),
  location varchar(255),
  manager_user_id text references public.profiles (id) on delete set null,
  budget_limit numeric(14, 2),
  status varchar(16) not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.business_members (
  member_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (workspace_id) on delete cascade,
  user_id text not null references public.profiles (id) on delete cascade,
  role varchar(24) not null
    check (role in ('admin', 'manager', 'approver', 'member', 'viewer')),
  unit_id uuid references public.business_units (unit_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.business_cost_centers (
  cost_center_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (workspace_id) on delete cascade,
  name varchar(160) not null,
  budget_limit numeric(14, 2),
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists public.business_vendors (
  vendor_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (workspace_id) on delete cascade,
  name varchar(200) not null,
  vendor_type varchar(64) not null,
  contact_info text,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists public.business_spends (
  spend_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (workspace_id) on delete cascade,
  unit_id uuid not null references public.business_units (unit_id) on delete restrict,
  title varchar(255) not null,
  amount numeric(14, 2) not null,
  spend_type varchar(64) not null default 'operational',
  cost_center_id uuid references public.business_cost_centers (cost_center_id) on delete set null,
  vendor_id uuid references public.business_vendors (vendor_id) on delete set null,
  status varchar(16) not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_by text not null references public.profiles (id) on delete restrict,
  approved_by text references public.profiles (id) on delete set null,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.business_activity (
  activity_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (workspace_id) on delete cascade,
  unit_id uuid references public.business_units (unit_id) on delete set null,
  spend_id uuid references public.business_spends (spend_id) on delete set null,
  actor_id text references public.profiles (id) on delete set null,
  event_type varchar(64) not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.business_signals (
  signal_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (workspace_id) on delete cascade,
  unit_id uuid references public.business_units (unit_id) on delete set null,
  signal_type varchar(64) not null,
  severity varchar(16) not null default 'info'
    check (severity in ('info', 'warning', 'critical')),
  message text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists business_workspaces_created_by_idx on public.business_workspaces (created_by);
create index if not exists business_workspaces_status_idx on public.business_workspaces (status);
create index if not exists business_units_workspace_idx on public.business_units (workspace_id);
create index if not exists business_members_workspace_idx on public.business_members (workspace_id);
create index if not exists business_members_user_idx on public.business_members (user_id);
create index if not exists business_cost_centers_workspace_idx on public.business_cost_centers (workspace_id);
create index if not exists business_vendors_workspace_idx on public.business_vendors (workspace_id);
create index if not exists business_spends_workspace_idx on public.business_spends (workspace_id);
create index if not exists business_spends_unit_idx on public.business_spends (unit_id);
create index if not exists business_spends_workspace_status_idx on public.business_spends (workspace_id, status);
create index if not exists business_activity_workspace_created_idx on public.business_activity (workspace_id, created_at desc);
create index if not exists business_signals_workspace_idx on public.business_signals (workspace_id);
create index if not exists business_signals_workspace_unresolved_idx on public.business_signals (workspace_id) where resolved = false;

drop trigger if exists business_workspaces_updated_at on public.business_workspaces;
create trigger business_workspaces_updated_at
  before update on public.business_workspaces
  for each row execute function public.group_set_updated_at();

alter table public.business_workspaces enable row level security;
alter table public.business_units enable row level security;
alter table public.business_members enable row level security;
alter table public.business_cost_centers enable row level security;
alter table public.business_vendors enable row level security;
alter table public.business_spends enable row level security;
alter table public.business_activity enable row level security;
alter table public.business_signals enable row level security;
