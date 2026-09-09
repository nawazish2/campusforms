-- CampusForms schema.
--
-- Two tables. A form's questions and a response's answers are both jsonb,
-- because nothing in the app ever queries a question on its own: the builder
-- rewrites the whole array on every edit, and every summary iterates the
-- array in JS. Keeping them as documents makes a save one upsert and keeps
-- question ids — which answers are keyed by — stable for free.

-- gen_random_bytes lives in pgcrypto; Supabase ships it, but be explicit.
create extension if not exists pgcrypto with schema extensions;

create type form_category as enum ('hostel', 'mess', 'event', 'academics', 'general');
create type form_status   as enum ('draft', 'open', 'closed');
create type response_status as enum ('new', 'in-progress', 'done');

-- Short, URL-shaped ids: these end up in the share link and the QR code, so
-- they're generated here rather than accepted from the browser.
create or replace function gen_form_id() returns text
language sql volatile as $$
  select 'f' || encode(extensions.gen_random_bytes(6), 'hex');
$$;

create table forms (
  id           text primary key default gen_form_id(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  title        text not null default '',
  description  text not null default '',
  category     form_category not null default 'general',
  status       form_status   not null default 'draft',
  anonymous    boolean not null default false,

  -- Deliberately text, not timestamptz. A deadline is either "2026-09-25"
  -- (meaning the end of that local day) or "2026-09-25T18:00" (a local wall
  -- clock with no offset). A timestamp column would collapse the two and
  -- lose the distinction the app depends on.
  deadline     text check (
    deadline is null
    or deadline ~ '^\d{4}-\d{2}-\d{2}$'
    or deadline ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'
  ),

  questions    jsonb not null default '[]'::jsonb
                 check (jsonb_typeof(questions) = 'array'),

  -- Denormalised so the public browse page can show "6 responses" without
  -- being able to read the responses themselves. Maintained by trigger.
  response_count integer not null default 0,

  created_at   timestamptz not null default now()
);

create index forms_owner_idx on forms (owner_id, created_at desc);
create index forms_open_idx  on forms (status) where status = 'open';

create table responses (
  -- Supplied by the client so a submitter learns their own reference number
  -- without needing read access to the row afterwards.
  id               text primary key,
  form_id          text not null references forms(id) on delete cascade,
  respondent_name  text,
  respondent_email text,
  answers          jsonb not null default '{}'::jsonb
                     check (jsonb_typeof(answers) = 'object'),
  status           response_status not null default 'new',
  submitted_at     timestamptz not null default now()
);

create index responses_form_idx on responses (form_id, submitted_at desc);

-- There is deliberately no submitted_by and no ip column. An anonymous form
-- has to be anonymous in the database, not only in the UI.

-- ---------------------------------------------------------------------------
-- Anonymity, enforced where it can't be bypassed
-- ---------------------------------------------------------------------------
create or replace function strip_identity_when_anonymous() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select anonymous from forms where id = new.form_id) then
    new.respondent_name  := null;
    new.respondent_email := null;
  end if;
  return new;
end;
$$;

create trigger responses_strip_identity
  before insert on responses
  for each row execute function strip_identity_when_anonymous();

-- ---------------------------------------------------------------------------
-- Response counter
-- ---------------------------------------------------------------------------
create or replace function bump_response_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update forms set response_count = response_count + 1 where id = new.form_id;
  else
    update forms set response_count = greatest(response_count - 1, 0) where id = old.form_id;
  end if;
  return null;
end;
$$;

create trigger responses_count_ins after insert on responses
  for each row execute function bump_response_count();
create trigger responses_count_del after delete on responses
  for each row execute function bump_response_count();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table forms     enable row level security;
alter table responses enable row level security;

-- Anyone can read any form, in any status. Draft and closed forms have to be
-- readable for /f/[id] to explain *why* it isn't accepting responses; a
-- form definition holds nothing confidential, and /browse lists them anyway.
create policy forms_read_all on forms
  for select using (true);

create policy forms_insert_own on forms
  for insert with check (owner_id = auth.uid());

create policy forms_update_own on forms
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy forms_delete_own on forms
  for delete using (owner_id = auth.uid());

-- Students submit without an account. The form must exist and be open —
-- otherwise "Close form" would only ever be a suggestion. The deadline is
-- checked in the app instead: the dual-format text column makes it awkward
-- here, and a stale deadline is a far smaller hole than an open POST.
create policy responses_insert_public on responses
  for insert with check (
    exists (select 1 from forms f where f.id = form_id and f.status = 'open')
  );

-- Only the organizer reads, triages or deletes responses.
create policy responses_read_owner on responses
  for select using (
    exists (select 1 from forms f where f.id = form_id and f.owner_id = auth.uid())
  );

create policy responses_update_owner on responses
  for update using (
    exists (select 1 from forms f where f.id = form_id and f.owner_id = auth.uid())
  );

create policy responses_delete_owner on responses
  for delete using (
    exists (select 1 from forms f where f.id = form_id and f.owner_id = auth.uid())
  );
