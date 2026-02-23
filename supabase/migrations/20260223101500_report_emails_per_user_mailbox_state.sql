-- Per-user mailbox state so archive/trash are account-specific
ALTER TABLE public.report_emails
  ADD COLUMN IF NOT EXISTS archived_by_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS deleted_by_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Backfill existing global state as a best-effort (sender gets the state)
UPDATE public.report_emails
SET archived_by_user_ids = ARRAY[sent_by]::uuid[]
WHERE is_archived = true
  AND sent_by IS NOT NULL
  AND cardinality(archived_by_user_ids) = 0;

UPDATE public.report_emails
SET deleted_by_user_ids = ARRAY[sent_by]::uuid[]
WHERE is_deleted = true
  AND sent_by IS NOT NULL
  AND cardinality(deleted_by_user_ids) = 0;

CREATE INDEX IF NOT EXISTS idx_report_emails_archived_by_user_ids
  ON public.report_emails USING GIN (archived_by_user_ids);

CREATE INDEX IF NOT EXISTS idx_report_emails_deleted_by_user_ids
  ON public.report_emails USING GIN (deleted_by_user_ids);
