-- Daily field reports: a "Reviewed/Approved" seal an admin applies after a report
-- is submitted, plus a richer photo store that carries a caption per image.
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS reviewed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by      uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by_name text,
  -- [{ url, caption }] — preferred over the legacy text[] `photos` (urls only).
  ADD COLUMN IF NOT EXISTS photos_meta      jsonb NOT NULL DEFAULT '[]'::jsonb;
