-- ============================================================
-- WS-2 · #7 · Repair garbage project start_date years.
-- ============================================================
-- A bare <input type="date"> accepted mistyped 2-digit years, so
-- some projects stored ISO year 0025 ("0025-..."). Null out any
-- start_date / target_end_date that predates 1900; the dialog now
-- bounds input to 1900-2100 (min/max + zod refine) so no new bad
-- rows can be written.
-- ============================================================

BEGIN;

UPDATE public.projects
   SET start_date = NULL
 WHERE start_date IS NOT NULL
   AND start_date < DATE '1900-01-01';

UPDATE public.projects
   SET target_end_date = NULL
 WHERE target_end_date IS NOT NULL
   AND target_end_date < DATE '1900-01-01';

COMMIT;
