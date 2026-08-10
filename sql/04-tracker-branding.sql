-- =====================================================================
-- PHASE 2c — EDITABLE APP TITLE AND DESCRIPTION
-- =====================================================================
-- PREREQUISITE: run 00, 01, 02 and 03 first, in that order.
--
-- What this does, in plain English:
--   The "InsightAccess" title and the "Cross-team progress tracker · V2
--   delivery" line next to it are currently typed into the HTML, so
--   every user sees YOUR product name. This makes both editable and
--   stored per tracker.
--
--   New accounts get:
--       Title:       My Project Tracker
--       Description: Create your own progress tracker
--
--   Your own tracker keeps saying InsightAccess — Step 2 below copies
--   your current wording in, so nothing changes on your screen.
--
-- This script does NOT touch progress, modules, columns or stages.
-- =====================================================================

begin;


-- ---------------------------------------------------------------------
-- Step 1: Two new fields on the tracker.
--
-- The defaults here are what a brand new account will see, because a
-- new row that doesn't specify a title gets the default automatically.
-- ---------------------------------------------------------------------
alter table public.trackers
  add column if not exists title text not null default 'My Project Tracker';

alter table public.trackers
  add column if not exists subtitle text not null default 'Create your own progress tracker';


-- ---------------------------------------------------------------------
-- Step 2: Keep YOUR tracker looking exactly as it does today.
--
-- Without this, your tracker would pick up the new default and suddenly
-- rename itself to "My Project Tracker". This only touches rows that
-- are still on the default, so it's safe to run more than once and it
-- won't overwrite a title you've since edited yourself.
-- ---------------------------------------------------------------------
do $$
declare
  owner_id uuid;
  touched  int;
begin
  select id into owner_id from auth.users where email = 'zarifah1710@gmail.com';
  if owner_id is null then
    raise exception 'No account found for zarifah1710@gmail.com. Sign in once, then re-run.';
  end if;

  update public.trackers
  set title    = 'InsightAccess',
      subtitle = 'Cross-team progress tracker · V2 delivery'
  where user_id = owner_id
    and title  = 'My Project Tracker'
    and subtitle = 'Create your own progress tracker';

  get diagnostics touched = row_count;
  raise notice 'Restored original wording on % tracker(s)', touched;
end $$;


commit;


-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Your tracker should read InsightAccess / Cross-team progress tracker.
select u.email, t.title, t.subtitle, t.row_header_name
from public.trackers t
join auth.users u on u.id = t.user_id
order by u.email;

-- Any OTHER account listed above should show the new defaults:
--   My Project Tracker / Create your own progress tracker
-- =====================================================================
