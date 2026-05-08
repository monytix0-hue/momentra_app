-- Align budgets with transaction taxonomy (optional FKs + subcategory label).

alter table public.personal_budgets
  add column if not exists subcategory varchar(80),
  add column if not exists category_id uuid references public.personal_transaction_categories (category_id) on delete set null,
  add column if not exists subcategory_id uuid references public.personal_transaction_subcategories (subcategory_id) on delete set null;

create index if not exists personal_budgets_category_id_idx on public.personal_budgets (category_id);
