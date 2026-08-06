-- =====================================================================
-- PHASE 0 — FULL BACKUP (run this FIRST, before anything else)
-- =====================================================================
-- What this does, in plain English:
--   It makes a complete copy of your three tables inside the database.
--   Nothing is changed, moved, or deleted. Your live site keeps working
--   exactly as before. This is purely a safety net.
--
-- Why do this when you already exported CSVs?
--   A CSV lives on your laptop and has to be manually re-imported to
--   restore. These copies live in the database, so restoring is one
--   command. Do BOTH — CSV export (Table Editor > three-dot menu >
--   Export as CSV) and this script.
--
-- How to run:
--   Supabase dashboard > SQL Editor > New query > paste > Run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Step 1: Copy each table to a dated backup table.
-- "create table X as select * from Y" means "make a new table X that is
-- a snapshot of everything in Y right now".
-- ---------------------------------------------------------------------
create table if not exists progress_backup_20260806      as select * from progress;
create table if not exists comments_backup_20260806      as select * from comments;
create table if not exists nps_responses_backup_20260806 as select * from nps_responses;


-- ---------------------------------------------------------------------
-- Step 2: Lock the backups so nothing can ever write to them.
-- Row Level Security with no policies at all = no access for anyone
-- except the database owner (you, via the SQL Editor). This makes sure
-- the backups can't be touched by the website.
-- ---------------------------------------------------------------------
alter table progress_backup_20260806      enable row level security;
alter table comments_backup_20260806      enable row level security;
alter table nps_responses_backup_20260806 enable row level security;


-- ---------------------------------------------------------------------
-- Step 3: Prove the backup worked.
-- The two numbers on each line MUST match. If any row shows a
-- mismatch, STOP and tell Claude before running anything else.
-- ---------------------------------------------------------------------
select 'progress'      as table_name,
       (select count(*) from progress)      as live_rows,
       (select count(*) from progress_backup_20260806)      as backed_up_rows
union all
select 'comments',
       (select count(*) from comments),
       (select count(*) from comments_backup_20260806)
union all
select 'nps_responses',
       (select count(*) from nps_responses),
       (select count(*) from nps_responses_backup_20260806);


-- =====================================================================
-- HOW TO RESTORE (only if something goes wrong later)
-- =====================================================================
-- Do NOT run this now. This is here so you have it if you need it.
--
--   begin;
--     delete from progress;
--     insert into progress select * from progress_backup_20260806;
--   commit;
--
-- Replace "progress" with whichever table you need to restore.
-- Note: after Phase 1 the live table has an extra user_id column, so a
-- restore would need: insert into progress (id, created_at, module,
-- col_key, value) select id, created_at, module, col_key, value from
-- progress_backup_20260806;
-- =====================================================================
