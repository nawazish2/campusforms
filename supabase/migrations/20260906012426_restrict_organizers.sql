-- Who is allowed to sign in and create forms.
--
-- Students never authenticate — they open a link — so this restricts
-- organizers only. A domain check would be neater, but the wardens and club
-- heads running these forms sign in with personal Gmail accounts, so the
-- allowlist is by address.
--
-- RUN THIS ONE AND WATCH THE RESULT. `auth.users` is owned by supabase_admin
-- and the SQL editor runs as `postgres`, so the trigger may fail with "must
-- be owner of relation users". If it does, the fallback is to keep the Google
-- app restricted to test users and check the allowlist in the app instead.
-- Don't assume the guard is live because the file ran — confirm the trigger
-- exists with the query at the bottom.

create table if not exists allowed_organizers (
  email      text primary key,
  note       text,
  added_at   timestamptz not null default now()
);

-- RLS on with no policies at all: this table is unreadable and unwritable
-- through the API by anyone, including a signed-in organizer. It is managed
-- from the SQL editor. The trigger below is security definer, so it can still
-- read the table even though nothing else can.
alter table allowed_organizers enable row level security;

-- Seed the first organizer. Add the rest the same way:
--   insert into allowed_organizers (email, note)
--   values ('warden.hostelb@gmail.com', 'Hostel B warden');
insert into allowed_organizers (email, note)
values ('knawazish153@gmail.com', 'Project owner')
on conflict (email) do nothing;

create or replace function enforce_organizer_allowlist() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from allowed_organizers
    where lower(email) = lower(coalesce(new.email, ''))
  ) then
    raise exception 'This account is not on the organizer list'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_organizer_allowlist_on_signup on auth.users;

-- Before insert, so a rejected account is never created at all: an account
-- that exists but can't do anything is worse than one that was refused.
create trigger enforce_organizer_allowlist_on_signup
  before insert on auth.users
  for each row execute function enforce_organizer_allowlist();

-- Confirm it survived:
--   select tgname from pg_trigger
--   where tgname = 'enforce_organizer_allowlist_on_signup';
