-- Device tokens for push notifications (FCM)
create table if not exists public.personal_device_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references public.profiles (id) on delete cascade,
  token         text not null,
  platform      varchar(20) not null default 'ios',  -- 'ios' | 'android'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(token)
);

create index if not exists personal_device_tokens_user_idx on public.personal_device_tokens (user_id);

alter table public.personal_device_tokens enable row level security;
