-- Allow a signed/approved change-order document (PDF) to be attached to a CO,
-- mirroring prime_contract_pay_apps.pdf_path. Public URL into daily-report-files.
ALTER TABLE public.change_orders ADD COLUMN IF NOT EXISTS pdf_path text;
COMMENT ON COLUMN public.change_orders.pdf_path IS 'Public URL of the attached change-order document (signed CO PDF).';
