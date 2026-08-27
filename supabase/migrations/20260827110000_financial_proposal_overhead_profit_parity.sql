-- Financial proposals use the same pricing structure as generated change
-- orders: cost-of-work subtotal + overhead % + profit %.  The percentages live
-- on the proposal header; they are calculated amounts, never fee line items.

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS overhead_pct numeric(20,12),
  ADD COLUMN IF NOT EXISTS profit_pct numeric(20,12);

-- Preserve the exact total of every existing proposal.  Legacy proposals could
-- carry a different markup on each line, so backfill the equivalent weighted
-- percentage as overhead and leave profit at zero.  Authors can split the
-- preserved percentage between overhead and profit the next time they amend.
WITH legacy_rates AS (
  SELECT
    p.id,
    CASE
      WHEN COALESCE(SUM(pl.quantity * pl.unit_cost), 0) = 0
        THEN COALESCE(p.markup_pct, 0)
      ELSE
        COALESCE(SUM(pl.quantity * pl.unit_cost * pl.markup_pct / 100.0), 0)
        / SUM(pl.quantity * pl.unit_cost) * 100.0
    END AS equivalent_overhead_pct
  FROM public.proposals p
  LEFT JOIN public.proposal_lines pl ON pl.proposal_id = p.id
  GROUP BY p.id, p.markup_pct
)
UPDATE public.proposals p
SET
  overhead_pct = ROUND(legacy_rates.equivalent_overhead_pct, 12),
  profit_pct = 0
FROM legacy_rates
WHERE p.id = legacy_rates.id
  AND (p.overhead_pct IS NULL OR p.profit_pct IS NULL);

ALTER TABLE public.proposals
  ALTER COLUMN overhead_pct SET DEFAULT 10,
  ALTER COLUMN overhead_pct SET NOT NULL,
  ALTER COLUMN profit_pct SET DEFAULT 5,
  ALTER COLUMN profit_pct SET NOT NULL;

ALTER TABLE public.proposals
  DROP CONSTRAINT IF EXISTS proposals_overhead_pct_range,
  ADD CONSTRAINT proposals_overhead_pct_range CHECK (overhead_pct >= 0),
  DROP CONSTRAINT IF EXISTS proposals_profit_pct_range,
  ADD CONSTRAINT proposals_profit_pct_range CHECK (profit_pct >= 0);

COMMENT ON COLUMN public.proposals.overhead_pct IS
  'Overhead percentage calculated against the proposal cost-of-work subtotal; not a line item.';
COMMENT ON COLUMN public.proposals.profit_pct IS
  'Profit percentage calculated against the proposal cost-of-work subtotal; not a line item.';

-- Keep the signed-record boundary complete: pricing percentages are commercial
-- content and cannot change until the explicit Amend workflow unlocks the row.
CREATE OR REPLACE FUNCTION public.guard_financial_proposal_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.locked AND NEW.locked THEN
    IF NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
       OR NEW.proposal_no IS DISTINCT FROM OLD.proposal_no
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.client_name IS DISTINCT FROM OLD.client_name
       OR NEW.client_email IS DISTINCT FROM OLD.client_email
       OR NEW.valid_until IS DISTINCT FROM OLD.valid_until
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.terms IS DISTINCT FROM OLD.terms
       OR NEW.scope_bullets IS DISTINCT FROM OLD.scope_bullets
       OR NEW.deliverables IS DISTINCT FROM OLD.deliverables
       OR NEW.markup_pct IS DISTINCT FROM OLD.markup_pct
       OR NEW.overhead_pct IS DISTINCT FROM OLD.overhead_pct
       OR NEW.profit_pct IS DISTINCT FROM OLD.profit_pct
       OR NEW.source_issue_id IS DISTINCT FROM OLD.source_issue_id
       OR NEW.submitted_signature_path IS DISTINCT FROM OLD.submitted_signature_path
       OR NEW.submitted_signed_at IS DISTINCT FROM OLD.submitted_signed_at
       OR NEW.submitted_signed_by IS DISTINCT FROM OLD.submitted_signed_by THEN
      RAISE EXCEPTION 'LOCKED: this proposal is signed; amend it before changing commercial content';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
