-- Optional subcategory label for group expenses (category already exists).

alter table public.group_expenses
  add column if not exists subcategory varchar(80);

alter table public.group_recurring_expenses
  add column if not exists subcategory varchar(80);
