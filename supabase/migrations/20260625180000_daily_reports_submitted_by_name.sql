-- Show WHO filed a daily report. submitted_by is a uuid; cache the person's display
-- name so it renders on the report / PDF without a per-row profile lookup.
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS submitted_by_name text;

-- Backfill existing reports from the submitter's profile.
UPDATE public.daily_reports d
SET submitted_by_name = COALESCE(p.full_name, p.work_email, p.email)
FROM public.profiles p
WHERE p.user_id = d.submitted_by
  AND d.submitted_by IS NOT NULL
  AND (d.submitted_by_name IS NULL OR d.submitted_by_name = '');
