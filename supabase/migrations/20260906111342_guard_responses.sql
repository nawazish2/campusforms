-- The insert policy only ever checked that the form was open, so everything
-- else a submission had to satisfy lived in the browser. The publishable key
-- is in the page source of every form, which makes "the app checks it" the
-- same as "nothing checks it" for anyone willing to POST directly.
--
-- One BEFORE INSERT trigger, three checks: the deadline, a flood limit, and
-- the shape of `answers`.

create or replace function guard_response() returns trigger
language plpgsql security definer set search_path = public as $$
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
$$;

-- Runs before responses_strip_identity: both are BEFORE INSERT, and Postgres
-- fires same-timing triggers in name order. Rejecting a bad row before the
-- anonymity trigger touches it keeps the order of events easy to reason about.
drop trigger if exists responses_guard on responses;
create trigger responses_guard
  before insert on responses
  for each row execute function guard_response();
