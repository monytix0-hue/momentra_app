  -- Recurring expense templates: one row per cycle materialized into group_expenses with source_recurring_id.

  create table if not exists public.group_recurring_expenses (
    recurring_id uuid primary key default gen_random_uuid(),
    group_id uuid not null references public.group_moments (group_id) on delete cascade,
    title varchar(255) not null,
    amount numeric(14, 2) not null,
    paid_by_participant_id uuid not null references public.group_participants (participant_id) on delete restrict,
    category varchar(80),
    description text,
    split_rule varchar(24) not null default 'equal'
      check (split_rule in ('equal', 'custom_amounts', 'percentages')),
    shares_json jsonb not null default '[]'::jsonb,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create index if not exists group_recurring_expenses_group_idx
    on public.group_recurring_expenses (group_id);

  alter table public.group_expenses
    add column if not exists source_recurring_id uuid references public.group_recurring_expenses (recurring_id) on delete set null;

  create unique index if not exists group_expenses_recurring_cycle_uidx
    on public.group_expenses (source_recurring_id, cycle_id)
    where source_recurring_id is not null and cycle_id is not null;

  alter table public.group_recurring_expenses enable row level security;

  drop trigger if exists group_recurring_expenses_updated_at on public.group_recurring_expenses;
  create trigger group_recurring_expenses_updated_at
    before update on public.group_recurring_expenses
    for each row execute function public.group_set_updated_at();
