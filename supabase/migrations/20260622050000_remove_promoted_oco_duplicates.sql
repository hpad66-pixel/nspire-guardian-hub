-- ─────────────────────────────────────────────────────────────────────────────
-- Remove duplicate OCO change orders created by the (now-removed) "Promote to
-- OCO" action.
--
-- In this app a prime change order is a SINGLE change_orders row: a PCO while
-- pending, a "PCCO" once signed/executed. The executed contract value counts each
-- executed prime CO once. The old "Promote to OCO" created a SECOND executed row
-- (co_type='OCO', parent_pco_id = the source PCO) with the same amount — so a
-- promoted-and-signed PCO was double-counted. These OCO rows are exact copies
-- with no independent value; delete them (and their copied lines) so totals
-- de-duplicate everywhere (the CO list AND v_project_financial_summary, which
-- sums any executed prime-linked CO). The source PCOs are untouched.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM public.change_order_lines
WHERE change_order_id IN (
  SELECT id FROM public.change_orders
  WHERE co_type = 'OCO' AND parent_pco_id IS NOT NULL
);

DELETE FROM public.change_orders
WHERE co_type = 'OCO' AND parent_pco_id IS NOT NULL;
