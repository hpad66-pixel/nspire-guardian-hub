-- ────────────────────────────────────────────────────────────────────────────
-- Three corrections the D'SHIN payment reconciliation exposed.
--
-- 1) `method` could not represent how the money actually moved. Roughly a third
--    of the disbursements on the Glorieta sewer job went out over Zelle, which
--    previously had to be flattened to 'other' — so the ledger could not
--    distinguish a Zelle transfer from a cash payment or an unclassified one.
--    Widening the CHECK is additive: every existing value stays valid.
--
-- 2) commitment_totals fanned out. It joined change_orders AND
--    commitment_invoices onto commitments in a single query, so the two joins
--    multiplied each other: with M change orders and N invoices the query
--    produced M×N rows, inflating executed_cco_value by a factor of N and
--    billed_to_date by a factor of M. On D'SHIN (3 CCOs, 4 invoices) that read
--    $611,270.76 of change orders against a true $152,817.69 — 4× — and the
--    error grew with every invoice added. Both aggregates now come from
--    independent subqueries, so neither can multiply the other.
--
-- 3) billed_to_date counted only invoices in status 'approved'. Paying an
--    invoice flips it to 'paid' (see sync_commitment_invoice_paid_status), at
--    which point it silently dropped out of the total — so a fully paid vendor
--    reported $0.00 billed, which is exactly backwards. Billed is cumulative:
--    once billed, always billed.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.commitment_payments
  DROP CONSTRAINT IF EXISTS commitment_payments_method_check;

ALTER TABLE public.commitment_payments
  ADD CONSTRAINT commitment_payments_method_check
  CHECK (method IN ('check', 'ach', 'wire', 'zelle', 'card', 'cash', 'other'));

CREATE OR REPLACE VIEW public.commitment_totals AS
SELECT
  c.id AS commitment_id,
  c.original_value,
  COALESCE(co.executed_cco_value, 0) AS executed_cco_value,
  c.original_value + COALESCE(co.executed_cco_value, 0) AS revised_commitment_value,
  COALESCE(inv.billed_to_date, 0) AS billed_to_date
FROM public.commitments c
LEFT JOIN LATERAL (
  SELECT SUM(cco.amount) AS executed_cco_value
  FROM public.change_orders cco
  WHERE cco.commitment_id = c.id
    AND cco.status IN ('approved', 'executed')
    AND cco.co_type = 'CCO'
) co ON TRUE
LEFT JOIN LATERAL (
  -- 'paid' included: a paid invoice is still a billed invoice.
  SELECT SUM(COALESCE(ci.approved_amount, ci.submitted_amount)) AS billed_to_date
  FROM public.commitment_invoices ci
  WHERE ci.commitment_id = c.id
    AND ci.status IN ('approved', 'paid')
) inv ON TRUE;

GRANT SELECT ON public.commitment_totals TO authenticated;
