-- Submit failed with: "Could not find the 'submitted_at' column of
-- 'daily_inspections' in the schema cache". The wizard writes submitted_at (and
-- review_status) on completion, but no migration ever added submitted_at, so the
-- update was rejected. Add it — and re-assert the review columns idempotently in
-- case 20260625190000 never reached this environment — then reload PostgREST's
-- schema cache so the columns are visible to the API immediately.
ALTER TABLE public.daily_inspections
  ADD COLUMN IF NOT EXISTS submitted_at   timestamptz,
  ADD COLUMN IF NOT EXISTS review_status  text,
  ADD COLUMN IF NOT EXISTS reviewer_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by    uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at    timestamptz;

NOTIFY pgrst, 'reload schema';
