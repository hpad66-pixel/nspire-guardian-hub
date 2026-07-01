-- Structured capture for the Daily Grounds Inspection so the paper "Manhole and
-- Cleanout Inspection Report" fields are recorded as discrete, reportable values
-- (not free-text notes).
--
-- General Observations on the day-level record:
ALTER TABLE public.daily_inspections
  ADD COLUMN IF NOT EXISTS property_condition text,        -- excellent | good | fair | poor
  ADD COLUMN IF NOT EXISTS unusual_activity boolean,       -- Any unusual activities/issues? (Y/N)
  ADD COLUMN IF NOT EXISTS unusual_activity_detail text,   -- description when Yes
  ADD COLUMN IF NOT EXISTS weather_other text;             -- free-text when weather = "Other"

-- Per-asset structured checklist answers, keyed by field id (templates live in
-- src/lib/inspections/checklistTemplates.ts, one set per asset type). JSONB keeps
-- it flexible across asset types (cleanout / manhole / catch basin / by-pass).
ALTER TABLE public.daily_inspection_items
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '{}'::jsonb;

-- RLS is inherited from the existing daily_inspections / daily_inspection_items
-- policies (column adds only).
