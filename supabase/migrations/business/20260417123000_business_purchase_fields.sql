-- Purchase detail fields for business_spends while keeping amount as canonical total.

alter table public.business_spends
  add column if not exists price_per_unit numeric(14, 2),
  add column if not exists quantity numeric(14, 3),
  add column if not exists measurement_unit varchar(32);

alter table public.business_spends
  drop constraint if exists business_spends_purchase_non_negative_chk;

alter table public.business_spends
  add constraint business_spends_purchase_non_negative_chk
  check (
    (price_per_unit is null or price_per_unit >= 0)
    and (quantity is null or quantity >= 0)
    and amount >= 0
  );

