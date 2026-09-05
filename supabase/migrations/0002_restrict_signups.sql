-- Only university accounts get to be organizers.
--
-- RUN THIS ONE FIRST AND WATCH THE RESULT. `auth.users` is owned by
-- supabase_admin, and the dashboard's SQL editor runs as `postgres`, so this
-- may fail with "must be owner of relation users". If it does, the supported
-- route is Authentication -> Providers -> Google -> Restrict to a domain,
-- plus the same check in the app when a session is established. Don't assume
-- the guard is active because the file exists — confirm the trigger was
-- created.
--
-- Google's `hd` claim is the reliable signal (an email suffix can be spoofed
-- on providers that don't verify it), but it's only present for Workspace
-- accounts, so this checks both and rejects anything else at sign-up. Set the
-- domain once here; Supabase's dashboard allow-list is a second layer, not a
-- replacement, because it doesn't apply to every auth path.

create or replace function enforce_university_domain() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  allowed_domain constant text := 'ptu.ac.in';  -- CHANGE ME
  hosted_domain  text := new.raw_user_meta_data ->> 'hd';
begin
  if hosted_domain is distinct from allowed_domain
     and split_part(coalesce(new.email, ''), '@', 2) <> allowed_domain then
    raise exception 'Only % accounts can sign in', allowed_domain
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger enforce_university_domain_on_signup
  before insert on auth.users
  for each row execute function enforce_university_domain();
