-- Change-order generation + e-sign + send workflow.
-- spec drives the generated document; once contractor-signed the row LOCKS
-- (the signed version is immutable) except for the owner counter-sign fields.
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS spec jsonb,
  ADD COLUMN IF NOT EXISTS docx_path text,
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted_signature_path text,
  ADD COLUMN IF NOT EXISTS submitted_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_signed_by uuid,
  ADD COLUMN IF NOT EXISTS accepted_signature_path text,
  ADD COLUMN IF NOT EXISTS accepted_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_signed_name text,
  ADD COLUMN IF NOT EXISTS sent_to_client_at timestamptz,
  ADD COLUMN IF NOT EXISTS sign_token uuid DEFAULT gen_random_uuid();

-- Lock guard: once locked, the signed content is immutable. Owner counter-sign
-- fields, status, send timestamp and the unlock flag itself remain editable so
-- the client can accept the already-signed document.
CREATE OR REPLACE FUNCTION public.guard_change_order_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.locked AND NEW.locked THEN
    IF NEW.spec IS DISTINCT FROM OLD.spec
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.pdf_path IS DISTINCT FROM OLD.pdf_path
       OR NEW.docx_path IS DISTINCT FROM OLD.docx_path
       OR NEW.submitted_signature_path IS DISTINCT FROM OLD.submitted_signature_path THEN
      RAISE EXCEPTION 'LOCKED: this change order is signed and locked; create a new CO to change signed content';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_co_lock_guard ON public.change_orders;
CREATE TRIGGER trg_co_lock_guard
  BEFORE UPDATE ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_change_order_lock();
