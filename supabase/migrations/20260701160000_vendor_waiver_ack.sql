-- Vendor acknowledges they are using APAS's lien-waiver documents when they sign,
-- and records which waiver form (conditional/unconditional · progress/final).
ALTER TABLE public.vendor_payapp_submissions
  ADD COLUMN IF NOT EXISTS apas_waiver_ack boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS waiver_type     text NOT NULL DEFAULT 'conditional_progress'
    CHECK (waiver_type IN ('conditional_progress', 'unconditional_progress', 'conditional_final', 'unconditional_final'));
