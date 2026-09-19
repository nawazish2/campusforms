-- Ticket notes the student can see via REF, a per-form response cap, photo
-- uploads on complaints, and a public "request organizer access" inbox.
--
-- Dollar-quoted function bodies use tagged delimiters so the Supabase SQL
-- editor doesn't split the script on a bare $$.

-- ---------------------------------------------------------------------------
-- Forms: a seat cap. Null means unlimited. The write trigger is the lock.
-- ---------------------------------------------------------------------------
alter table forms
  add column if not exists max_responses integer
  check (max_responses is null or max_responses > 0);

grant update (max_responses) on table public.forms to authenticated;

-- ---------------------------------------------------------------------------
-- Responses: a short public note. Status-only updates grow by this column.
-- ---------------------------------------------------------------------------
alter table responses
  add column if not exists public_note text not null default ''
  check (char_length(public_note) <= 280);

create or replace function responses_update_status_only() returns trigger
language plpgsql security definer set search_path = public as $status$
begin
  new.id := old.id;
  new.form_id := old.form_id;
  new.ref := old.ref;
  new.answers := old.answers;
  new.submitted_at := old.submitted_at;
  new.public_note := coalesce(new.public_note, '');
  if char_length(new.public_note) > 280 then
    raise exception 'That note is too long'
      using errcode = 'check_violation';
  end if;
  if (select anonymous from forms where id = new.form_id) then
    new.respondent_name := null;
    new.respondent_email := null;
  else
    new.respondent_name := old.respondent_name;
    new.respondent_email := old.respondent_email;
  end if;
  return new;
end;
$status$;

revoke update on table public.responses from anon, authenticated;
grant update (status, public_note) on table public.responses to authenticated;

-- ---------------------------------------------------------------------------
-- Lookup: still status only — plus the note, never answers
-- ---------------------------------------------------------------------------
drop function if exists public.lookup_response_by_ref(text);

create function public.lookup_response_by_ref(p_ref text)
returns table (
  form_title      text,
  form_category   form_category,
  response_status response_status,
  submitted_at    timestamptz,
  is_anonymous    boolean,
  public_note     text
)
language sql stable security definer set search_path = public as $lookup$
  select
    f.title,
    f.category,
    r.status,
    r.submitted_at,
    f.anonymous,
    r.public_note
  from responses r
  join forms f on f.id = r.form_id
  where r.ref = lower(btrim(p_ref));
$lookup$;

grant execute on function public.lookup_response_by_ref(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Write guard: capacity + photo path, on top of 0007's type checks
-- ---------------------------------------------------------------------------
create or replace function guard_response() returns trigger
language plpgsql security definer set search_path = public as $guard$
declare
  f            forms%rowtype;
  deadline_ts  timestamp;
  recent       integer;
  q            jsonb;
  answer       jsonb;
  key          text;
  label        text;
  blank        boolean;
  num          numeric;
  expected     text;
begin
  select * into f from forms where id = new.form_id;
  if not found then
    raise exception 'That form does not exist'
      using errcode = 'foreign_key_violation';
  end if;

  new.submitted_at := now();
  new.status := 'new';
  new.public_note := '';

  if new.ref is null
     or char_length(new.ref) <> 16
     or new.ref !~ '^[0-9a-f]+$' then
    raise exception 'A response needs a 16-character reference code'
      using errcode = 'check_violation';
  end if;
  new.ref := lower(new.ref);

  if f.max_responses is not null and f.response_count >= f.max_responses then
    raise exception 'This form is full'
      using errcode = 'check_violation';
  end if;

  if f.deadline is not null then
    deadline_ts := case
      when f.deadline ~ '^\d{4}-\d{2}-\d{2}$' then (f.deadline::date + interval '1 day')::timestamp
      else replace(f.deadline, 'T', ' ')::timestamp
    end;
    if (now() at time zone 'utc') > deadline_ts + interval '14 hours' then
      raise exception 'This form closed on %', f.deadline
        using errcode = 'check_violation';
    end if;
  end if;

  select count(*) into recent
    from responses
   where form_id = new.form_id
     and submitted_at > now() - interval '1 minute';
  if recent >= 30 then
    raise exception 'This form is receiving too many responses right now. Try again in a minute.'
      using errcode = 'too_many_connections';
  end if;

  if jsonb_typeof(new.answers) is distinct from 'object' then
    raise exception 'Answers must be an object'
      using errcode = 'check_violation';
  end if;

  if octet_length(new.answers::text) > 20000 then
    raise exception 'That response is too long'
      using errcode = 'check_violation';
  end if;

  for key in select jsonb_object_keys(new.answers) loop
    if not exists (
      select 1 from jsonb_array_elements(f.questions) e where e->>'id' = key
    ) then
      raise exception 'This form has no question %', key
        using errcode = 'check_violation';
    end if;
  end loop;

  for q in select e from jsonb_array_elements(f.questions) e loop
    answer := new.answers -> (q->>'id');
    label  := coalesce(nullif(q->>'title', ''), 'untitled question');

    blank := answer is null
      or jsonb_typeof(answer) = 'null'
      or (jsonb_typeof(answer) = 'string' and btrim(answer #>> '{}') = '')
      or (jsonb_typeof(answer) = 'array' and jsonb_array_length(answer) = 0);

    if coalesce((q->>'required')::boolean, false) and blank then
      raise exception 'Answer required: %', label
        using errcode = 'check_violation';
    end if;

    if not blank then
      case q->>'type'

        when 'rating' then
          if jsonb_typeof(answer) = 'number' then
            num := (answer #>> '{}')::numeric;
          elsif jsonb_typeof(answer) = 'string' and (answer #>> '{}') ~ '^\d+$' then
            num := (answer #>> '{}')::numeric;
          else
            raise exception 'Not a rating: %', label using errcode = 'check_violation';
          end if;
          if num <> trunc(num)
             or num < 1
             or num > coalesce(nullif(q->>'maxRating', '')::numeric, 5) then
            raise exception 'Rating out of range: %', label using errcode = 'check_violation';
          end if;

        when 'number' then
          if not (jsonb_typeof(answer) = 'number'
                  or (jsonb_typeof(answer) = 'string'
                      and (answer #>> '{}') ~ '^-?\d+(\.\d+)?$')) then
            raise exception 'Not a number: %', label using errcode = 'check_violation';
          end if;

        when 'single-choice', 'dropdown' then
          if jsonb_typeof(answer) <> 'string'
             or not exists (
               select 1 from jsonb_array_elements_text(q->'options') o
                where o = answer #>> '{}'
             ) then
            raise exception 'Not one of the options: %', label using errcode = 'check_violation';
          end if;

        when 'multi-choice' then
          if jsonb_typeof(answer) <> 'array'
             or exists (
               select 1 from jsonb_array_elements(answer) a
                where jsonb_typeof(a) <> 'string'
                   or not exists (
                     select 1 from jsonb_array_elements_text(q->'options') o
                      where o = a #>> '{}'
                   )
             ) then
            raise exception 'Not one of the options: %', label using errcode = 'check_violation';
          end if;

        when 'email' then
          if jsonb_typeof(answer) <> 'string'
             or (answer #>> '{}') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
            raise exception 'Not an email address: %', label using errcode = 'check_violation';
          end if;

        when 'date' then
          if jsonb_typeof(answer) <> 'string'
             or (answer #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then
            raise exception 'Not a date: %', label using errcode = 'check_violation';
          end if;

        when 'file' then
          -- The file itself lives in Storage. The answer is the path the upload
          -- policy already constrained: {form_id}/{ref}/{question_id}.
          expected := f.id || '/' || new.ref || '/' || (q->>'id');
          if jsonb_typeof(answer) <> 'string'
             or (answer #>> '{}') is distinct from expected then
            raise exception 'Not a photo: %', label using errcode = 'check_violation';
          end if;

        else
          if jsonb_typeof(answer) <> 'string' then
            raise exception 'Not text: %', label using errcode = 'check_violation';
          end if;
      end case;
    end if;
  end loop;

  return new;
end;
$guard$;

-- ---------------------------------------------------------------------------
-- Organizer access requests. Unreadable through the API, like the allowlist.
-- ---------------------------------------------------------------------------
create table if not exists organizer_requests (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  note       text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  check (char_length(email) <= 200)
);

create unique index if not exists organizer_requests_email
  on organizer_requests (lower(email));

alter table organizer_requests enable row level security;

drop policy if exists organizer_requests_insert on organizer_requests;
create policy organizer_requests_insert on organizer_requests
  for insert to anon, authenticated
  with check (true);

create or replace function guard_organizer_request() returns trigger
language plpgsql security definer set search_path = public as $req$
declare
  recent integer;
begin
  new.email := lower(btrim(new.email));
  new.note := btrim(coalesce(new.note, ''));
  if new.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or char_length(new.email) > 200 then
    raise exception 'Enter a valid email address'
      using errcode = 'check_violation';
  end if;
  if char_length(new.note) > 500 then
    raise exception 'That note is too long'
      using errcode = 'check_violation';
  end if;
  select count(*) into recent
    from organizer_requests
   where created_at > now() - interval '10 minutes';
  if recent >= 10 then
    raise exception 'Too many requests right now. Try again in a few minutes.'
      using errcode = 'too_many_connections';
  end if;
  return new;
end;
$req$;

drop trigger if exists organizer_requests_guard on organizer_requests;
create trigger organizer_requests_guard
  before insert on organizer_requests
  for each row execute function guard_organizer_request();

grant insert (email, note) on table public.organizer_requests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Photos. Private bucket; students upload into {form_id}/{ref}/{question_id}
-- while the form is open. Only the form's owner can read or delete.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'response-files',
  'response-files',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

drop policy if exists "students upload photos to open forms" on storage.objects;
create policy "students upload photos to open forms"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'response-files'
    and exists (
      select 1 from public.forms f
      where f.id = (storage.foldername(name))[1]
        and f.status = 'open'
    )
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{16}$'
    and (storage.foldername(name))[3] is not null
    and (storage.foldername(name))[4] is null
  );

drop policy if exists "owners read response photos" on storage.objects;
create policy "owners read response photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'response-files'
    and exists (
      select 1 from public.forms f
      where f.id = (storage.foldername(name))[1]
        and f.owner_id = auth.uid()
    )
  );

drop policy if exists "owners delete response photos" on storage.objects;
create policy "owners delete response photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'response-files'
    and exists (
      select 1 from public.forms f
      where f.id = (storage.foldername(name))[1]
        and f.owner_id = auth.uid()
    )
  );
