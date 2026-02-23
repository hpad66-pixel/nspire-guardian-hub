-- Add per-user archive/delete tracking arrays to report_emails
ALTER TABLE public.report_emails
  ADD COLUMN IF NOT EXISTS archived_by_user_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deleted_by_user_ids uuid[] DEFAULT '{}';