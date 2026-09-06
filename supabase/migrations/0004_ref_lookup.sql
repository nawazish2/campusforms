-- Students get a REF code (the last six characters of the response id) on the
-- success screen, but RLS gives response reads to organizers only — so the
-- code was a receipt, not a tracker. This function lets the public look up
-- exactly one response by that code and nothing else: no respondent names,
-- no emails, no scanning the table.
--
-- Anonymity cuts both ways here. For anonymous forms the answers are the
-- whole point of being anonymous, so the function returns them as null and
-- the caller sees the status only. A named complaint keeps its answers, since
-- the person holding the REF wrote them.
--
-- The join to forms also means a deleted form takes its lookups with it.

create function public.lookup_response_by_ref(p_ref text)
returns table (
  form_title      text,
  form_category   form_category,
  response_status response_status,
  submitted_at    timestamptz,
  answers         jsonb,
  form_questions  jsonb,
  is_anonymous    boolean
)
language sql stable security definer set search_path = public as $$
  select
    f.title,
    f.category,
    r.status,
    r.submitted_at,
    case when f.anonymous then null else r.answers end,
    case when f.anonymous then null else f.questions end,
    f.anonymous
  from responses r
  join forms f on f.id = r.form_id
  where upper(right(r.id, 6)) = upper(p_ref)
  order by r.submitted_at desc
  limit 1;
$$;

-- Supabase grants function execution to public by default; say it anyway so
-- the lookup survives any project-level default-privilege changes.
grant execute on function public.lookup_response_by_ref(text) to anon, authenticated;
