-- 0006 checks that an answer is present, belongs to the form and isn't
-- oversized, but never what it is: a rating could arrive as 'banana', a
-- single-choice answer as an option the form doesn't offer. `validateFill`
-- covers only email and number, and it runs in the browser, which is not
-- where the row lands.
--
-- This replaces guard_response with the same function plus a type check per
-- question. Everything else in it is 0006's, unchanged.
--
-- The checks are deliberately permissive where the client has been known to
-- vary — a rating or number may arrive as a JSON number or a numeric string —
-- because rejecting a real student's submission is worse than storing a
-- slightly loose value.

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

    -- Type checks. An absent optional answer is fine; one that is present has
    -- to be the shape the question asked for. The browser only enforces this
    -- for email and number, and the browser is not where the row lands.
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
