-- =====================================================================
-- PHASE 3 — MULTIPLE TRACKERS
-- =====================================================================
-- PREREQUISITE: run 00, 01, 02, 03 and 04 first, in that order.
--
-- RUN 00-backup.sql AGAIN BEFORE THIS ONE. This is the first script
-- that changes the progress table, where all your actual values live.
-- Everything before this deliberately left it alone.
--
-- What this does, in plain English:
--   You already have a trackers table, and stages, columns and modules
--   each know which tracker they belong to. progress does not. Every
--   progress row says only "this user, this module, this column".
--
--   So if you made a second tracker today, both trackers would read and
--   write the SAME values. Setting Onboarding/Build to 50% in one would
--   silently change it in the other, because it is literally one row.
--
--   This gives every progress row a tracker, points all your existing
--   rows at your current tracker, and changes the uniqueness rule to
--   match. After this, two trackers are genuinely independent.
--
-- ORDER OF OPERATIONS — important, and the opposite of Phase 1:
--   Run this script BEFORE deploying the new website code.
--
--   Step 4 replaces the uniqueness rule. Saving uses that rule by name
--   ("on conflict"), so the old code stops being able to save the moment
--   step 4 runs. The new code expects the new rule and cannot work until
--   it exists. There is no ordering that avoids a brief gap, so run this
--   and merge the website change straight afterwards. Reading is
--   unaffected either way — only saving is.
--
-- Everything is inside begin/commit — a single transaction. If any
-- statement fails, the whole thing undoes itself and nothing changes.
-- =====================================================================

begin;


-- ---------------------------------------------------------------------
-- Step 1: Give progress rows somewhere to record their tracker.
--
-- Nullable for now, because the existing rows have no value yet.
-- Step 3 makes it mandatory once they all do.
--
-- No default here on purpose. auth.uid() works as a default for user_id
-- because the database knows who is signed in — but it has no idea which
-- tracker you are looking at. The website must say so explicitly.
-- ---------------------------------------------------------------------
alter table public.progress
  add column if not exists tracker_id uuid references public.trackers(id) on delete cascade;


-- ---------------------------------------------------------------------
-- Step 2: Point every existing row at the tracker it already belongs to.
--
-- Each user's rows go to that user's first tracker — the same one
-- loadStructure() has been opening all along with "order by position
-- limit 1". So nothing moves anywhere it wasn't already.
--
-- This is written per-user rather than hardcoding your account, so it
-- stays correct if anyone else has signed in and made a tracker.
-- ---------------------------------------------------------------------
do $$
declare
  r        record;
  updated  int;
  total    int := 0;
begin
  for r in
    select distinct p.user_id
    from public.progress p
    where p.tracker_id is null
  loop
    update public.progress p
    set tracker_id = (
      select t.id
      from public.trackers t
      where t.user_id = r.user_id
      order by t.position, t.created_at
      limit 1
    )
    where p.user_id = r.user_id
      and p.tracker_id is null;

    get diagnostics updated = row_count;
    total := total + updated;
    raise notice 'Assigned % progress rows for user %', updated, r.user_id;
  end loop;

  raise notice 'Total progress rows assigned: %', total;
end $$;


-- ---------------------------------------------------------------------
-- Step 3: Refuse to continue if anything was left behind.
--
-- A row with no tracker would vanish from the site: every query filters
-- by tracker_id from here on. Better to fail loudly now and roll the
-- whole thing back than to lose values quietly.
--
-- The usual cause is a user who has progress rows but no tracker row —
-- which would mean 02-header-tables.sql was never run for them.
-- ---------------------------------------------------------------------
do $$
declare
  orphans int;
begin
  select count(*) into orphans from public.progress where tracker_id is null;

  if orphans > 0 then
    raise exception
      '% progress rows could not be assigned to a tracker. Every user with progress must have at least one row in trackers. Nothing has been changed.', orphans;
  end if;
end $$;

alter table public.progress
  alter column tracker_id set not null;


-- ---------------------------------------------------------------------
-- Step 4: Replace the uniqueness rule.  <-- the step that matters
--
-- Today:  one row per (user, module, column)
--         => a user can only ever hold ONE value for Onboarding/Build,
--            no matter how many trackers they own.
--
-- After:  one row per (tracker, module, column)
--         => each tracker holds its own value. The user is still
--            implied, because a tracker belongs to exactly one user.
--
-- The website's save uses this rule by name, so the new code says
-- onConflict: 'tracker_id,module,col_key' to match.
-- ---------------------------------------------------------------------
drop index if exists public.progress_owner_module_col_uniq;

-- Belt and braces: drop any other uniqueness rule still sitting on
-- progress, whatever it happens to be called. The primary key is a
-- different kind of constraint and is left alone.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.progress'::regclass
      and contype = 'u'
  loop
    execute format('alter table public.progress drop constraint %I', c.conname);
    raise notice 'Dropped old uniqueness rule: %', c.conname;
  end loop;
end $$;

create unique index if not exists progress_tracker_module_col_uniq
  on public.progress (tracker_id, module, col_key);


-- ---------------------------------------------------------------------
-- Step 5: Make lookups by tracker fast.
--
-- Every page load now asks "give me the progress for this tracker".
-- Without an index that means reading every row you own and discarding
-- most of them. Barely noticeable at 198 rows; worth having before it
-- becomes thousands.
-- ---------------------------------------------------------------------
create index if not exists progress_tracker_idx
  on public.progress (tracker_id);


-- ---------------------------------------------------------------------
-- Step 6: Security is unchanged, and still correct.
--
-- The existing "own rows only" policy checks user_id = auth.uid(), and
-- user_id is still on every row. A tracker belongs to one user, so
-- there is no way to reach another person's tracker through this.
--
-- Stated explicitly here only so the next person reading this file does
-- not have to go and check.
-- ---------------------------------------------------------------------


commit;


-- =====================================================================
-- VERIFICATION — run these separately AFTER the commit above succeeds.
-- =====================================================================

-- 1) Every progress row must have a tracker. rows_without_tracker must
--    be 0. total_rows should match what you saw in 00-backup.sql.
select count(*)                                        as total_rows,
       count(*) filter (where tracker_id is null)       as rows_without_tracker,
       count(distinct tracker_id)                       as distinct_trackers
from public.progress;


-- 2) Every row's tracker must belong to the same person as the row.
--    Expect 0. Anything here would be a genuine security problem.
select count(*) as mismatched_owner
from public.progress p
join public.trackers t on t.id = p.tracker_id
where t.user_id <> p.user_id;


-- 3) The new uniqueness rule should be present, the old one gone.
--    Expect exactly one row: progress_tracker_module_col_uniq.
select indexname
from pg_indexes
where schemaname = 'public'
  and tablename  = 'progress'
  and indexdef like '%UNIQUE%';


-- 4) A per-tracker summary — how many values each tracker holds.
select t.title, t.name, count(p.*) as progress_values
from public.trackers t
left join public.progress p on p.tracker_id = t.id
group by t.id, t.title, t.name
order by t.title;


-- NOTE: these run as the database owner, which bypasses the security
-- rules — that is why every row is visible here. The real test is the
-- website: open your tracker and confirm all your percentages are
-- present and unchanged, then create a second tracker and confirm it
-- starts empty and editing it does not affect the first.
-- =====================================================================
