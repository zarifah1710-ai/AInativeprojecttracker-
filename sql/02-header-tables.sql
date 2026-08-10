-- =====================================================================
-- PHASE 2a — EDITABLE HEADER: stage groups and column names
-- =====================================================================
-- PREREQUISITE: run 00-backup.sql and 01-multitenancy.sql first, and
-- confirm their verification queries looked right.
--
-- What this does, in plain English:
--   Your table header is currently typed into the HTML by hand. This
--   creates three tables so the header becomes real data you can edit:
--
--     trackers  — a named grid belonging to you (you'll have one for now)
--     stages    — the coloured group bands: BUILD, LOGIC & DESIGN, QA
--     columns   — the 9 sub-columns, each belonging to one stage
--
--   It then fills them in with your current structure, so nothing looks
--   different on screen afterwards. The names simply become editable.
--
-- IMPORTANT — this script does NOT touch the progress table.
--   Your 198 progress values are completely untouched. That is the whole
--   reason we're doing rename-only first: there is no way for this to
--   damage your data.
--
--   The link between the two is col_key. progress rows are stored
--   against col_key values like 'build' and 'qacheck'. The columns table
--   keeps those same keys, and adds a separate display name on top. So
--   renaming "QA Check" to "Testing" changes only what's shown — the
--   stored key stays 'qacheck' and every value stays attached to it.
--
-- This is also the final table shape we'll use later for add/delete, so
-- none of this work gets thrown away.
-- =====================================================================

begin;


-- ---------------------------------------------------------------------
-- Step 1: The three tables.
--
-- Notes on the repeated bits:
--   gen_random_uuid()      generates the unique id automatically
--   default auth.uid()     stamps the owner as whoever is signed in
--   on delete cascade      if a stage goes, its columns go with it
--   position               a plain number controlling left-to-right and
--                          top-to-bottom order, so we never rely on the
--                          order rows happen to come back in
--
-- user_id is repeated on all three tables even though it could be
-- worked out by following tracker_id upwards. That repetition is
-- deliberate: it keeps every security rule a simple "is this mine?"
-- check with no table joins, which is both faster and much easier to
-- read six months from now.
-- ---------------------------------------------------------------------
create table if not exists public.trackers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null default 'My Tracker',
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.stages (
  id         uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references public.trackers(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  -- Which of the three existing colour schemes this band uses. Keeping
  -- these exact words means the current CSS keeps working untouched.
  color_key  text not null default 'build' check (color_key in ('build','logic','qa')),
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.columns (
  id         uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references public.trackers(id) on delete cascade,
  stage_id   uuid not null references public.stages(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- The stable internal key that progress rows are stored against.
  -- This must NOT change when a column is renamed.
  col_key    text not null,
  -- The editable display name shown in the header.
  name       text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  -- Within one grid, a key can only be used once.
  unique (tracker_id, col_key)
);


-- ---------------------------------------------------------------------
-- Step 2: Security rules — same per-user pattern as Phase 1.
-- ---------------------------------------------------------------------
alter table public.trackers enable row level security;
alter table public.stages   enable row level security;
alter table public.columns  enable row level security;

drop policy if exists "own rows only" on public.trackers;
drop policy if exists "own rows only" on public.stages;
drop policy if exists "own rows only" on public.columns;

create policy "own rows only" on public.trackers
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows only" on public.stages
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows only" on public.columns
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- Step 3: Fill in YOUR current structure.
--
-- These names, their order, and which stage each column belongs to
-- currently exist only inside the JavaScript COLS array — not in the
-- database. If we didn't copy them across deliberately, that structure
-- would be lost.
--
-- Safe to run more than once: it checks whether you already have a
-- tracker and does nothing if so, rather than creating duplicates.
-- ---------------------------------------------------------------------
do $$
declare
  owner_id     uuid;
  my_tracker   uuid;
  stage_build  uuid;
  stage_logic  uuid;
  stage_qa     uuid;
begin
  select id into owner_id from auth.users where email = 'zarifah1710@gmail.com';
  if owner_id is null then
    raise exception 'No account found for zarifah1710@gmail.com. Sign in once, then re-run.';
  end if;

  -- Already set up? Then stop here.
  select id into my_tracker from public.trackers where user_id = owner_id order by position limit 1;
  if my_tracker is not null then
    raise notice 'Structure already exists for this account — nothing to do.';
    return;
  end if;

  insert into public.trackers (user_id, name, position)
  values (owner_id, 'V2 delivery', 0)
  returning id into my_tracker;

  -- The three stage bands, in their current left-to-right order.
  insert into public.stages (tracker_id, user_id, name, color_key, position)
  values (my_tracker, owner_id, 'BUILD', 'build', 0)
  returning id into stage_build;

  insert into public.stages (tracker_id, user_id, name, color_key, position)
  values (my_tracker, owner_id, 'LOGIC & DESIGN', 'logic', 1)
  returning id into stage_logic;

  insert into public.stages (tracker_id, user_id, name, color_key, position)
  values (my_tracker, owner_id, 'QA', 'qa', 2)
  returning id into stage_qa;

  -- The 9 columns. col_key values match what progress already stores.
  insert into public.columns (tracker_id, user_id, stage_id, col_key, name, position) values
    (my_tracker, owner_id, stage_build, 'build',    'Build',        0),
    (my_tracker, owner_id, stage_build, 'define',   'Define',       1),
    (my_tracker, owner_id, stage_logic, 'req',      'Requirements', 2),
    (my_tracker, owner_id, stage_logic, 'iterate',  'Iterate',      3),
    (my_tracker, owner_id, stage_logic, 'dep',      'Dependency',   4),
    (my_tracker, owner_id, stage_logic, 'design',   'Design',       5),
    (my_tracker, owner_id, stage_qa,    'qacheck',  'QA Check',     6),
    (my_tracker, owner_id, stage_qa,    'bugfix',   'Bug Fix',      7),
    (my_tracker, owner_id, stage_qa,    'handover', 'Handover',     8);

  raise notice 'Created tracker % with 3 stages and 9 columns', my_tracker;
end $$;


commit;


-- =====================================================================
-- VERIFICATION — run after the commit above succeeds.
-- =====================================================================

-- Should show your 9 columns, in order, each under the right stage band.
-- Expect: 2 under BUILD, 4 under LOGIC & DESIGN, 3 under QA.
select t.name  as tracker,
       s.position as stage_pos,
       s.name  as stage,
       s.color_key,
       c.position as col_pos,
       c.col_key,
       c.name  as column_name
from public.columns c
join public.stages   s on s.id = c.stage_id
join public.trackers t on t.id = c.tracker_id
join auth.users      u on u.id = c.user_id
where u.email = 'zarifah1710@gmail.com'
order by s.position, c.position;


-- Every col_key used by progress must exist in the columns table,
-- otherwise a column would have values but no header. Expect 0 rows.
select distinct p.col_key as orphaned_col_key
from public.progress p
where p.col_key not in (select col_key from public.columns);
-- =====================================================================
