-- Group commitment lifecycle: distinguish planned / active / final commitment
-- and track origin (admin_set, expense_split, auto_seeded, participant_set).
--
-- Terminology per Momentra model:
--   Planned Commitment   — initial expected share assigned at moment setup
--   Active Commitment    — current expected share (adjusts mid-moment)
--   Final Commitment     — post-expense calculated share
--
--   source = how the commitment row was created:
--     auto_seeded      — system-generated equal split when group was created
--     admin_set        — admin explicitly created/edited this line
--     expense_split    — derived from a recorded expense share
--     participant_set  — participant self-assigned

alter table public.group_commitments
  add column if not exists commitment_type varchar(24) not null default 'planned'
    check (commitment_type in ('planned', 'active', 'final'));

alter table public.group_commitments
  add column if not exists source varchar(32) not null default 'auto_seeded'
    check (source in ('admin_set', 'expense_split', 'auto_seeded', 'participant_set'));

alter table public.group_commitments
  add column if not exists expense_id uuid
    references public.group_expenses (expense_id) on delete set null;

-- Back-fill: rows inserted before this migration were all admin_set or auto_seeded;
-- we treat them as 'auto_seeded' (the safe default already set above).
-- No data-destructive change — existing rows keep their committed_amount and paid_amount.

create index if not exists group_commitments_type_idx
  on public.group_commitments (group_id, commitment_type);

create index if not exists group_commitments_expense_idx
  on public.group_commitments (expense_id)
  where expense_id is not null;
