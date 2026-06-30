-- Provenance: tag a prime pay application to the subcontractor commitment whose
-- work (and retainage) it carries. This is the link that routes each pay app's
-- retainage to the right vendor dashboard instead of every vendor inheriting the
-- latest prime pay app's retainage.
ALTER TABLE public.prime_contract_pay_apps
  ADD COLUMN IF NOT EXISTS commitment_id uuid REFERENCES public.commitments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payapp_commitment ON public.prime_contract_pay_apps(commitment_id);
