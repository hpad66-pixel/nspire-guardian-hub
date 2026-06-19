-- Full structured Procore daily-log payload (weather observations, manpower
-- breakdown, inspector, completed-at, photo filenames) preserved per report.
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS procore_data jsonb;
