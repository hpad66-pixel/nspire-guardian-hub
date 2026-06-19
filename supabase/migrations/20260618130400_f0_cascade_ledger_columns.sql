-- ============================================================
-- F0 · Carry source-doc + AR/AP ledger semantics onto the cascade billing rows.
-- paid_to_date / balance are VIEWS (next migration), not columns, to avoid drift.
-- ============================================================

ALTER TABLE public.prime_contract_pay_apps
  ADD COLUMN IF NOT EXISTS approved_date date,
  ADD COLUMN IF NOT EXISTS invoice_no text,
  ADD COLUMN IF NOT EXISTS artifact_id uuid REFERENCES public.project_artifacts(id) ON DELETE SET NULL;

ALTER TABLE public.commitment_invoices
  ADD COLUMN IF NOT EXISTS artifact_id uuid REFERENCES public.project_artifacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_submission_id uuid REFERENCES public.vendor_submissions(id) ON DELETE SET NULL;
