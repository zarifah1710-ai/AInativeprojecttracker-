-- =====================================================================
-- PHASE 1 — MULTI-TENANCY (Part A)
-- =====================================================================
-- PREREQUISITE: you must have run 00-backup.sql and confirmed the row
-- counts matched. Do not run this otherwise.
--
-- What this does, in plain English:
--   Right now every row in your tables belongs to nobody, and the
--   security rules say "anyone may read and write everything". This
--   script gives every row an owner, assigns all your existing rows to
--   you, and then changes the rules to "you may only touch your own
--   rows".
--
--   After this, the database itself enforces privacy. Even if someone
--   took your public key out of the HTML and wrote their own program,
--   they could not read your data.
--
-- IMPORTANT — ORDER OF OPERATIONS:
--   Push the Phase 1 website changes to GitHub BEFORE running this.
--   The new website code works under both the old rules and the new
--   ones, so pushing first means zero downtime. Running this first
--   would briefly break the live site.
--
-- Everything is inside begin/commit — a single transaction. If any
-- statement fails, the whole thing undoes itself and nothing changes.
-- =====================================================================

begin;


-- ---------------------------------------------------------------------
-- Step 1: Add an owner column to each table.
--
-- "uuid" is a long unique id. "references auth.users(id)" means this
-- must point at a real signed-in account. "on delete cascade" means if
-- an account is ever deleted, that person's rows go with it.
--
-- It is nullable for now, because the existing rows don't have a value
-- yet. Step 3 makes it mandatory once they do.
-- ---------------------------------------------------------------------
alter table public.progress
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.comments
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.nps_responses
  add column if not exists user_id uuid references auth.users(id) on delete cascade;


-- ---------------------------------------------------------------------
-- Step 2: Assign every existing row to your account.
--
-- Your account is looked up by email rather than pasting a long id, so
-- there is no chance of a typo pointing your data at the wrong person.
-- If the account isn't found, this deliberately fails and rolls the
-- whole script back rather than guessing.
-- ---------------------------------------------------------------------
do $$
declare
  owner_id uuid;
begin
  select id into owner_id
  from auth.users
  where email = 'zarifah1710@gmail.com';

  if owner_id is null then
    raise exception
      'No account found for zarifah1710@gmail.com. Sign in to the tracker once with that Google account, then re-run this script.';
  end if;

  update public.progress      set user_id = owner_id where user_id is null;
  update public.comments      set user_id = owner_id where user_id is null;
  update public.nps_responses set user_id = owner_id where user_id is null;

  raise notice 'Existing rows assigned to %', owner_id;
end $$;


-- ---------------------------------------------------------------------
-- Step 3: Make ownership mandatory and automatic.
--
-- "set not null"        = a row without an owner is now rejected.
-- "default auth.uid()"  = if the website doesn't say who the owner is,
--                         Postgres fills in whoever is signed in.
--
-- That default is the important safety net: the website code cannot
-- accidentally create an unowned row, even if someone edits it later
-- and forgets.
-- ---------------------------------------------------------------------
alter table public.progress
  alter column user_id set not null,
  alter column user_id set default auth.uid();
alter table public.comments
  alter column user_id set not null,
  alter column user_id set default auth.uid();
alter table public.nps_responses
  alter column user_id set not null,
  alter column user_id set default auth.uid();


-- ---------------------------------------------------------------------
-- Step 4: Fix the uniqueness rule on progress.  <-- easy to miss, and
-- the site would break without it.
--
-- Today progress has a rule: "no two rows may share the same module +
-- column". That was correct when there was one shared grid. Now that
-- each person has their own grid, it would mean the FIRST person to
-- create a 'Build' value for 'Onboarding' blocks everyone else from
-- ever having one.
--
-- So the rule becomes "no two rows may share the same OWNER + module +
-- column", which is what we actually want.
-- ---------------------------------------------------------------------
do $$
declare
  c record;
begin
  -- Remove any existing uniqueness rule on progress, leaving the
  -- primary key alone. The rule's auto-generated name can vary, so it
  -- is found by inspection rather than assumed.
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

create unique index if not exists progress_owner_module_col_uniq
  on public.progress (user_id, module, col_key);


-- ---------------------------------------------------------------------
-- Step 5: Replace the "everyone welcome" rules with per-user rules.
--
-- First remove all existing policies. Their names are unknown, so they
-- are found and dropped by inspection. This is why the backup matters:
-- this step is the destructive one.
-- ---------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('progress', 'comments', 'nps_responses')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
    raise notice 'Dropped old policy: % on %', p.policyname, p.tablename;
  end loop;
end $$;


-- Make sure the rules are actually being enforced on each table.
alter table public.progress      enable row level security;
alter table public.comments      enable row level security;
alter table public.nps_responses enable row level security;


-- The new rule, one per table.
--
--   "for all"          = covers reading, creating, updating, deleting.
--   "to authenticated" = signed-out visitors get nothing at all.
--   "using"            = which existing rows you are allowed to see/change.
--   "with check"       = what you are allowed to create; stops anyone
--                        creating a row owned by someone else.
create policy "own rows only" on public.progress
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own rows only" on public.comments
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own rows only" on public.nps_responses
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


commit;


-- =====================================================================
-- VERIFICATION — run these separately AFTER the commit above succeeds.
-- =====================================================================

-- 1) Every row should have an owner, and it should be yours.
--    unowned_rows must be 0 on all three lines.
select 'progress' as table_name,
       count(*) as total_rows,
       count(*) filter (where user_id is null) as unowned_rows,
       count(distinct user_id) as distinct_owners
from public.progress
union all
select 'comments', count(*), count(*) filter (where user_id is null), count(distinct user_id)
from public.comments
union all
select 'nps_responses', count(*), count(*) filter (where user_id is null), count(distinct user_id)
from public.nps_responses;


-- 2) Each table should have exactly one policy, named "own rows only",
--    and rls_enabled should be true.
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       count(p.policyname) as policy_count,
       string_agg(p.policyname, ', ') as policies
from pg_class c
left join pg_policies p
  on p.tablename = c.relname and p.schemaname = 'public'
where c.relname in ('progress', 'comments', 'nps_responses')
group by c.relname, c.relrowsecurity;


-- NOTE: these verification queries run as the database owner, which
-- deliberately bypasses the security rules — that is why you can still
-- see every row here. The real test is the website itself: sign in as
-- yourself (all 22 modules present), then sign in with a different
-- Google account (empty tracker).
-- =====================================================================
