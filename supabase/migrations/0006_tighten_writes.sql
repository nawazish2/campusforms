-- Write paths that still trusted the client: insert defaults, a dedicated
-- REF receipt, status-only response updates, an immutable response_count,
-- and a lock on anonymity after the first response. The public lookup
-- returns queue status only — never answers.
--
-- Dollar-quoted function bodies use tagged delimiters ($guard$ etc.) so the
-- Supabase SQL editor doesn't split the script on a bare $$.

-- ---------------------------------------------------------------------------
-- REF: a 16-hex receipt the student already holds, unique and unguessable
-- ---------------------------------------------------------------------------
-- RLS still blocks RETURNING on insert, so the client supplies `ref` the
-- same way it supplies `id`. The database only accepts the right shape.

alter table responses add column if not exists ref text;

update responses
   set ref = encode(extensions.gen_random_bytes(8), 'hex')
 where ref is null;

alter table responses
  alter column ref set not null;

alter table responses drop constraint if exists responses_ref_format;
alter table responses
  add constraint responses_ref_format
  check (char_length(ref) = 16 and ref ~ '^[0-9a-f]+$');

create unique index if not exists responses_ref_key on responses (ref);

-- ---------------------------------------------------------------------------
-- Insert: force clocks and triage, reject a malformed receipt
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
begin
  select * into f from forms where id = new.form_id;
  if not found then
    raise exception 'That form does not exist'
      using errcode = 'foreign_key_violation';
  end if;

  -- The client may send anything for these; the row that lands is ours.
  new.submitted_at := now();
  new.status := 'new';

  if new.ref is null
     or char_length(new.ref) <> 16
     or new.ref !~ '^[0-9a-f]+$' then
    raise exception 'A response needs a 16-character reference code'
      using errcode = 'check_violation';
  end if;
  new.ref := lower(new.ref);

  -- The deadline column holds two shapes: '2026-09-25' means the end of that
  -- local day, '2026-09-25T18:00' a local wall clock. Neither carries a zone,
  -- and the browser reads them in the visitor's. So this only rejects a
  -- submission once the deadline has passed in *every* timezone — the app
  -- stays the precise gate, and this is the backstop that a script can't
  -- skip. Being late here is fine; being early would reject real students.
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

  -- Responses carry no IP and no submitter, by design, so the only thing
  -- countable is the form itself. A ceiling per form per minute stops a
  -- script writing thousands without touching a lecture hall filling the
  -- same form at once.
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

  -- A cap on the whole payload rather than per field: it is the total that
  -- costs storage, and one 20KB answer is as unreasonable as forty 500B ones.
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
    if coalesce((q->>'required')::boolean, false) then
      answer := new.answers -> (q->>'id');
      if answer is null
         or jsonb_typeof(answer) = 'null'
         or (jsonb_typeof(answer) = 'string' and btrim(answer #>> '{}') = '')
         or (jsonb_typeof(answer) = 'array' and jsonb_array_length(answer) = 0)
      then
        raise exception 'Answer required: %', coalesce(nullif(q->>'title', ''), 'untitled question')
          using errcode = 'check_violation';
      end if;
    end if;
  end loop;

  return new;
end;
$guard$;

-- ---------------------------------------------------------------------------
-- Update: organizers may triage. Everything else is frozen.
-- ---------------------------------------------------------------------------
create or replace function responses_update_status_only() returns trigger
language plpgsql security definer set search_path = public as $status$
begin
  new.id := old.id;
  new.form_id := old.form_id;
  new.ref := old.ref;
  new.answers := old.answers;
  new.submitted_at := old.submitted_at;
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

drop trigger if exists responses_update_status_only on responses;
create trigger responses_update_status_only
  before update on responses
  for each row execute function responses_update_status_only();

revoke update on table public.responses from anon, authenticated;
grant update (status) on table public.responses to authenticated;

-- ---------------------------------------------------------------------------
-- Forms: response_count is trigger-owned; anonymity locks after the first row
-- ---------------------------------------------------------------------------
-- bump_response_count updates this column, so the lock has to let that
-- security-definer write through. A transaction-local GUC is the signal.

create or replace function bump_response_count() returns trigger
language plpgsql security definer set search_path = public as $bump$
begin
  perform set_config('campusforms.counting', '1', true);
  if tg_op = 'INSERT' then
    update forms set response_count = response_count + 1 where id = new.form_id;
  else
    update forms set response_count = greatest(response_count - 1, 0) where id = old.form_id;
  end if;
  return null;
end;
$bump$;

create or replace function forms_protect_invariants() returns trigger
language plpgsql security definer set search_path = public as $protect$
begin
  if current_setting('campusforms.counting', true) is distinct from '1' then
    new.response_count := old.response_count;
  end if;
  if old.response_count > 0 and new.anonymous is distinct from old.anonymous then
    raise exception 'Anonymity cannot change after a form has responses'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$protect$;

drop trigger if exists forms_protect_invariants on forms;
create trigger forms_protect_invariants
  before update on forms
  for each row execute function forms_protect_invariants();

revoke update on table public.forms from anon, authenticated;
grant update (
  title, description, category, status, anonymous, deadline, questions, pinned
) on table public.forms to authenticated;

-- ---------------------------------------------------------------------------
-- Lookup: exact match on ref, status only — never answers
-- ---------------------------------------------------------------------------
drop function if exists public.lookup_response_by_ref(text);

create function public.lookup_response_by_ref(p_ref text)
returns table (
  form_title      text,
  form_category   form_category,
  response_status response_status,
  submitted_at    timestamptz,
  is_anonymous    boolean
)
language sql stable security definer set search_path = public as $lookup$
  select
    f.title,
    f.category,
    r.status,
    r.submitted_at,
    f.anonymous
  from responses r
  join forms f on f.id = r.form_id
  where r.ref = lower(btrim(p_ref));
$lookup$;

grant execute on function public.lookup_response_by_ref(text) to anon, authenticated;
