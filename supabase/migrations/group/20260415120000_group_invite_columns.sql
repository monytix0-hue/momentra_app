-- Invite links and optional email for pending group_participants (status = invited)

alter table public.group_participants
  add column if not exists invite_email varchar(255),
  add column if not exists invite_token text,
  add column if not exists invite_sent_at timestamptz;

create unique index if not exists group_participants_invite_token_uidx
  on public.group_participants (invite_token)
  where invite_token is not null;
