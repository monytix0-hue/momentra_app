-- Global spend taxonomy (small reference tables + seed rows). Run after 20260408120000_personal.sql.

create table if not exists public.personal_transaction_categories (
  category_id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null default 0
);

create table if not exists public.personal_transaction_subcategories (
  subcategory_id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.personal_transaction_categories (category_id) on delete cascade,
  slug text not null,
  label text not null,
  sort_order int not null default 0,
  unique (category_id, slug)
);

create index if not exists personal_txn_subcategories_category_idx
  on public.personal_transaction_subcategories (category_id);

insert into public.personal_transaction_categories (slug, label, sort_order)
values
  ('food', 'Food & dining', 10),
  ('transport', 'Transport', 20),
  ('shopping', 'Shopping', 30),
  ('bills', 'Bills & utilities', 40),
  ('health', 'Health & fitness', 50),
  ('entertainment', 'Entertainment', 60),
  ('travel', 'Travel', 70),
  ('education', 'Education', 80),
  ('transfers', 'Transfers & fees', 90),
  ('other', 'Other', 100)
on conflict (slug) do nothing;

insert into public.personal_transaction_subcategories (category_id, slug, label, sort_order)
select c.category_id, v.slug, v.label, v.ord
from public.personal_transaction_categories c
inner join (
  values
    ('food', 'groceries', 'Groceries', 10),
    ('food', 'restaurants', 'Restaurants & cafes', 20),
    ('food', 'delivery', 'Delivery & takeout', 30),
    ('transport', 'fuel', 'Fuel', 10),
    ('transport', 'transit', 'Public transit', 20),
    ('transport', 'rideshare', 'Rideshare & taxi', 30),
    ('transport', 'parking', 'Parking & tolls', 40),
    ('shopping', 'clothing', 'Clothing', 10),
    ('shopping', 'electronics', 'Electronics', 20),
    ('shopping', 'general', 'General retail', 30),
    ('bills', 'utilities', 'Utilities', 10),
    ('bills', 'rent', 'Rent / mortgage', 20),
    ('bills', 'subscriptions', 'Subscriptions', 30),
    ('bills', 'phone_internet', 'Phone & internet', 40),
    ('health', 'pharmacy', 'Pharmacy', 10),
    ('health', 'medical', 'Medical & dental', 20),
    ('health', 'fitness', 'Gym & fitness', 30),
    ('entertainment', 'streaming', 'Streaming & media', 10),
    ('entertainment', 'events', 'Events & outings', 20),
    ('entertainment', 'hobbies', 'Hobbies', 30),
    ('travel', 'flights', 'Flights', 10),
    ('travel', 'lodging', 'Hotels & lodging', 20),
    ('travel', 'local', 'Local travel', 30),
    ('education', 'courses', 'Courses & tuition', 10),
    ('education', 'books', 'Books & supplies', 20),
    ('transfers', 'bank_fees', 'Bank fees', 10),
    ('transfers', 'transfers', 'Account transfers', 20),
    ('other', 'misc', 'Miscellaneous', 10)
) as v(cat_slug, slug, label, ord) on c.slug = v.cat_slug
on conflict (category_id, slug) do nothing;

-- Denormalized text + optional FKs (budget code still matches category label).
alter table public.personal_transactions
  add column if not exists subcategory varchar(80),
  add column if not exists category_id uuid references public.personal_transaction_categories (category_id) on delete set null,
  add column if not exists subcategory_id uuid references public.personal_transaction_subcategories (subcategory_id) on delete set null;

comment on column public.personal_transactions.category is 'Label; auto-filled from category_id / subcategory_id when those are set.';
comment on column public.personal_transactions.subcategory is 'Sub-label; auto-filled when subcategory_id is set.';

create or replace function public.personal_transactions_sync_taxonomy_labels()
returns trigger
language plpgsql
as $$
declare
  v_cat_label text;
begin
  if tg_op = 'INSERT' then
    if new.subcategory_id is not null then
      select s.category_id, c.label, s.label
      into strict new.category_id, new.category, new.subcategory
      from public.personal_transaction_subcategories s
      join public.personal_transaction_categories c on c.category_id = s.category_id
      where s.subcategory_id = new.subcategory_id;
    elsif new.category_id is not null then
      select c.label into strict v_cat_label
      from public.personal_transaction_categories c
      where c.category_id = new.category_id;
      new.category := v_cat_label;
      new.subcategory_id := null;
      new.subcategory := null;
    end if;
  elsif tg_op = 'UPDATE' then
    if (new.subcategory_id is distinct from old.subcategory_id)
       or (new.category_id is distinct from old.category_id) then
      if new.subcategory_id is not null then
        select s.category_id, c.label, s.label
        into strict new.category_id, new.category, new.subcategory
        from public.personal_transaction_subcategories s
        join public.personal_transaction_categories c on c.category_id = s.category_id
        where s.subcategory_id = new.subcategory_id;
      elsif new.category_id is not null then
        select c.label into strict v_cat_label
        from public.personal_transaction_categories c
        where c.category_id = new.category_id;
        new.category := v_cat_label;
        new.subcategory_id := null;
        new.subcategory := null;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists personal_transactions_sync_taxonomy_labels on public.personal_transactions;
create trigger personal_transactions_sync_taxonomy_labels
  before insert or update on public.personal_transactions
  for each row
  execute function public.personal_transactions_sync_taxonomy_labels();

create index if not exists personal_transactions_user_date_desc_idx
  on public.personal_transactions (user_id, transaction_date desc);

create index if not exists personal_transactions_user_cat_sub_idx
  on public.personal_transactions (user_id, category, subcategory);

create index if not exists personal_transactions_user_category_id_idx
  on public.personal_transactions (user_id, category_id);

alter table public.personal_transaction_categories enable row level security;
alter table public.personal_transaction_subcategories enable row level security;
