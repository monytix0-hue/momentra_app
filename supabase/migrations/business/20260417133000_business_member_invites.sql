create table if not exists public.business_member_invites (
  invite_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (workspace_id) on delete cascade,
  email varchar(320) not null,
  role varchar(24) not null
    check (role in ('admin', 'manager', 'approver', 'member', 'viewer')),
  unit_id uuid references public.business_units (unit_id) on delete set null,
  invite_token varchar(128) not null,
  invited_by text not null references public.profiles (id) on delete restrict,
  accepted_by text references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  unique (invite_token)
);

create index if not exists business_member_invites_workspace_idx
  on public.business_member_invites (workspace_id);
create index if not exists business_member_invites_email_idx
  on public.business_member_invites (workspace_id, email);

alter table public.business_member_invites enable row level security;
