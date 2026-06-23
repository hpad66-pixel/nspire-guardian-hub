-- ─────────────────────────────────────────────────────────────────────────────
-- Pay-app electronic signature + "send to client as draft for review".
--
-- The contractor (us) can e-sign the G702 certification and email the signed
-- DRAFT to the owner for review before formal submission. These columns hold the
-- signature + the send audit. No status change is implied — a draft stays a draft;
-- sent_for_review_at simply records that a review copy went out.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.prime_contract_pay_apps
  ADD COLUMN IF NOT EXISTS signed_name         text,
  ADD COLUMN IF NOT EXISTS signed_at           timestamptz,
  ADD COLUMN IF NOT EXISTS signature_data      text,        -- PNG data URL of the typed signature
  ADD COLUMN IF NOT EXISTS sent_for_review_at  timestamptz,
  ADD COLUMN IF NOT EXISTS sent_for_review_to  text;        -- recipient email(s) the draft went to

COMMENT ON COLUMN public.prime_contract_pay_apps.signature_data IS
  'Contractor e-signature PNG (data URL), stamped into the G702 certification on the PDF.';
COMMENT ON COLUMN public.prime_contract_pay_apps.sent_for_review_at IS
  'When a DRAFT review copy was last emailed to the owner (informational; does not change status).';
