-- Attach the original AIA pay-application PDF and preserve the full G702 figures.
ALTER TABLE public.prime_contract_pay_apps
  ADD COLUMN IF NOT EXISTS pdf_path text,
  ADD COLUMN IF NOT EXISTS pay_app_data jsonb;
