-- Daily Log is now a draft-first, two-panel workflow (DailyLogPage.tsx):
-- "New report" creates a bare row ({project_id, report_date}) that the
-- superintendent fills in field-by-field with debounced autosave, then submits.
--
-- The original daily_reports schema (20260130004833) declared
--   work_performed TEXT NOT NULL
-- for the old "everything required up front" dialog. Under the new flow that
-- constraint breaks two things:
--   1. Creating a report — the bare insert omits work_performed -> NOT NULL
--      violation, so no draft is ever created.
--   2. Saving photos — Save Draft / Submit send one combined patch that
--      includes `work_performed: <value> || null`; an empty field makes the
--      whole UPDATE (photos included) fail, so photos never persist.
--
-- Relax the column to nullable. work_performed is optional at draft time and
-- the read-only view already renders "None recorded." for an empty value.
-- Idempotent: DROP NOT NULL is a no-op if already dropped.
ALTER TABLE public.daily_reports
  ALTER COLUMN work_performed DROP NOT NULL;
