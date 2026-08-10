-- =====================================================================
-- PHASE 2b — EDITABLE MODULES: the row names and the "Module" heading
-- =====================================================================
-- PREREQUISITE: run 00, 01 and 02 first, in that order.
--
-- What this does, in plain English:
--   Your 22 module names down the left-hand side are currently typed
--   into the HTML. This creates a modules table so they become editable,
--   and adds a setting for the "Module" heading above them.
--
-- THE IMPORTANT BIT — why this is safe:
--   The progress table identifies each row by the module's NAME. A row
--   literally says module = 'Onboarding'. So if we simply renamed things,
--   every value under 'Onboarding' would be orphaned.
--
--   Instead, each module gets TWO fields:
--       module_key  the stable identifier, set to the current name.
--                   progress rows point at this. It NEVER changes.
--       name        the display name you can edit freely.
--
--   Renaming 'Onboarding' to 'Employee Onboarding' changes only `name`.
--   module_key stays 'Onboarding', so all 9 of its values stay attached.
--   This is the same approach used for columns in 02, where col_key
--   plays the same role.
--
-- This script does NOT modify the progress table.
-- =====================================================================

begin;


-- ---------------------------------------------------------------------
-- Step 1: A place to store the "Module" heading.
-- It sits on trackers because there is one heading per grid.
-- ---------------------------------------------------------------------
alter table public.trackers
  add column if not exists row_header_name text not null default 'Module';


-- ---------------------------------------------------------------------
-- Step 2: The modules table. Same shape and same security pattern as
-- the stages and columns tables from 02.
-- ---------------------------------------------------------------------
create table if not exists public.modules (
  id         uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references public.trackers(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Stable identifier that progress rows are stored against.
  -- Must NOT change when a module is renamed.
  module_key text not null,
  -- The editable display name shown down the left-hand side.
  name       text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  unique (tracker_id, module_key)
);

alter table public.modules enable row level security;

drop policy if exists "own rows only" on public.modules;

create policy "own rows only" on public.modules
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- Step 3: Fill in your 22 modules, in their current top-to-bottom order.
--
-- Both module_key and name start out the same. They only diverge once
-- you rename something.
--
-- Safe to run more than once — it stops if modules already exist.
-- ---------------------------------------------------------------------
do $$
declare
  owner_id   uuid;
  my_tracker uuid;
  existing   int;
begin
  select id into owner_id from auth.users where email = 'zarifah1710@gmail.com';
  if owner_id is null then
    raise exception 'No account found for zarifah1710@gmail.com. Sign in once, then re-run.';
  end if;

  select id into my_tracker
  from public.trackers
  where user_id = owner_id
  order by position
  limit 1;

  if my_tracker is null then
    raise exception 'No tracker found. Run 02-header-tables.sql first.';
  end if;

  select count(*) into existing from public.modules where tracker_id = my_tracker;
  if existing > 0 then
    raise notice 'Modules already exist (% rows) — nothing to do.', existing;
    return;
  end if;

  insert into public.modules (tracker_id, user_id, module_key, name, position)
  select my_tracker, owner_id, m.key, m.key, m.pos
  from (values
    ('Super Admin',        0),
    ('Onboarding',         1),
    ('Talent Acquisition', 2),
    ('JD Management',      3),
    ('Org Chart',          4),
    ('Assessment',         5),
    ('Strategy',           6),
    ('Skills',             7),
    ('BSC',                8),
    ('IDP',                9),
    ('Career Pathing',    10),
    ('Succession',        11),
    ('Performance',       12),
    ('Survey Management', 13),
    ('HRIS',              14),
    ('Financial',         15),
    ('AI Token',          16),
    ('Metric Library',    17),
    ('Workflow Engine',   18),
    ('AI Chatbot',        19),
    ('Subsidiaries',      20),
    ('Integrations',      21)
  ) as m(key, pos);

  raise notice 'Created 22 modules for tracker %', my_tracker;
end $$;


commit;


-- =====================================================================
-- VERIFICATION — run after the commit above succeeds.
-- =====================================================================

-- 1) Expect 22 rows, in order, with module_key and name identical.
select position, module_key, name
from public.modules m
join auth.users u on u.id = m.user_id
where u.email = 'zarifah1710@gmail.com'
order by position;


-- 2) THE CRITICAL CHECK: every module named in progress must exist in
--    the modules table. Anything listed here has values but no row to
--    display them in. Expect 0 rows.
select distinct p.module as orphaned_module
from public.progress p
where p.module not in (select module_key from public.modules);


-- 3) And the reverse — modules with no progress values yet. This is
--    only informational; rows here are harmless (they just show as "—").
select m.name as module_without_values
from public.modules m
where m.module_key not in (select distinct module from public.progress)
order by m.position;
-- =====================================================================
