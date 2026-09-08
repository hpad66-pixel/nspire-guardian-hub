-- Client-ready documents are sent from several project modules that do not use
-- the legacy daily report tables. Keep every authorized delivery auditable by
-- accepting any supported scoped record reference.
ALTER TABLE public.report_emails
  DROP CONSTRAINT IF EXISTS report_reference_check;

ALTER TABLE public.report_emails
  ADD CONSTRAINT report_reference_check
  CHECK (
    source_module = 'mailbox'
    OR report_id IS NOT NULL
    OR daily_inspection_id IS NOT NULL
    OR project_id IS NOT NULL
    OR property_id IS NOT NULL
    OR proposal_id IS NOT NULL
    OR work_order_id IS NOT NULL
  );
