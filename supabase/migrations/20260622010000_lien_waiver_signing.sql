-- ============================================================
-- Lien-waiver signing: turn lien_releases into a fillable, signable,
-- notarizable branded waiver. Allows standalone waivers (not tied to a
-- specific invoice/pay app yet) and adds the spec + token + signature +
-- notarized-upload + execution fields, mirroring the change-order flow.
-- ============================================================

-- Relax the parent constraints so a waiver can stand alone (0 or 1 parent),
-- while keeping direction alignment when a parent IS set.
ALTER TABLE public.lien_releases DROP CONSTRAINT IF EXISTS lien_one_parent;
ALTER TABLE public.lien_releases DROP CONSTRAINT IF EXISTS lien_direction_parent;
ALTER TABLE public.lien_releases ADD CONSTRAINT lien_one_parent CHECK (
  (commitment_invoice_id IS NOT NULL)::int + (pay_app_id IS NOT NULL)::int <= 1
);
ALTER TABLE public.lien_releases ADD CONSTRAINT lien_direction_parent CHECK (
  (commitment_invoice_id IS NULL OR direction = 'inbound') AND
  (pay_app_id IS NULL OR direction = 'outbound')
);

ALTER TABLE public.lien_releases
  ADD COLUMN IF NOT EXISTS spec jsonb,
  ADD COLUMN IF NOT EXISTS waiver_no text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS claimant_name text,
  ADD COLUMN IF NOT EXISTS claimant_email text,
  ADD COLUMN IF NOT EXISTS sign_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_path text,
  ADD COLUMN IF NOT EXISTS claimant_signature_path text,
  ADD COLUMN IF NOT EXISTS claimant_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimant_signed_name text,
  ADD COLUMN IF NOT EXISTS notarized_path text,
  ADD COLUMN IF NOT EXISTS notarized_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS executed_at timestamptz,
  ADD COLUMN IF NOT EXISTS executed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

UPDATE public.lien_releases SET sign_token = gen_random_uuid() WHERE sign_token IS NULL;
CREATE INDEX IF NOT EXISTS idx_lien_sign_token ON public.lien_releases(sign_token);

-- Lock guard: once executed/locked, signed content is immutable.
CREATE OR REPLACE FUNCTION public.guard_lien_release_lock()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.locked AND NEW.locked THEN
    IF NEW.spec IS DISTINCT FROM OLD.spec
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.claimant_signature_path IS DISTINCT FROM OLD.claimant_signature_path
       OR NEW.notarized_path IS DISTINCT FROM OLD.notarized_path
       OR NEW.pdf_path IS DISTINCT FROM OLD.pdf_path THEN
      RAISE EXCEPTION 'LOCKED: this lien waiver is executed and locked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lien_lock_guard ON public.lien_releases;
CREATE TRIGGER trg_lien_lock_guard
  BEFORE UPDATE ON public.lien_releases
  FOR EACH ROW EXECUTE FUNCTION public.guard_lien_release_lock();
