-- The inspection-review flow (useInspectionReview) writes review_status /
-- reviewer_notes / reviewed_by / reviewed_at to daily_inspections, but those
-- columns never existed — so reviewing an inspection failed at runtime
-- ("column daily_inspections.review_status does not exist"). Add them.
ALTER TABLE public.daily_inspections
  ADD COLUMN IF NOT EXISTS review_status  text,
  ADD COLUMN IF NOT EXISTS reviewer_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by    uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at    timestamptz;
