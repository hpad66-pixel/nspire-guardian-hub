-- ============================================================
-- Owner CO amendment -> vendor-margin review regression coverage.
-- Run via: supabase test db
-- ============================================================

BEGIN;
SELECT plan(8);

INSERT INTO public.workspaces (id, name)
VALUES ('91000000-0000-4000-8000-000000000001', 'CO Margin Revision Test');

INSERT INTO public.projects (id, workspace_id, name)
VALUES (
  '91000000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000001',
  'CO Margin Revision Project'
);

INSERT INTO public.prime_contracts (
  id, tenant_id, project_id, contract_no, title, original_value, status
) VALUES (
  '91000000-0000-4000-8000-000000000003',
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000002',
  'PC-REVISION-TEST', 'Prime contract', 1000, 'executed'
);

INSERT INTO public.change_orders (
  id, tenant_id, project_id, prime_contract_id, co_type, co_no,
  title, amount, status, amendment_history
) VALUES (
  '91000000-0000-4000-8000-000000000004',
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000003',
  'PCO', 1, 'Amended owner scope', 100, 'draft',
  '[{"at":"2026-08-01T12:00:00Z","reason":"First amendment"}]'::jsonb
);

INSERT INTO public.co_margin_links (
  id, tenant_id, project_id, prime_co_id, treatment, sub_cost, sub_label
) VALUES (
  '91000000-0000-4000-8000-000000000005',
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000004',
  'markup', 75, 'Test Vendor'
);

SELECT is(
  (SELECT source_amount FROM public.co_margin_links WHERE id = '91000000-0000-4000-8000-000000000005'),
  100::numeric,
  'saving a classification snapshots the current owner CO amount'
);

SELECT is(
  (SELECT source_amendment_count FROM public.co_margin_links WHERE id = '91000000-0000-4000-8000-000000000005'),
  1,
  'saving a classification snapshots the current amendment revision'
);

UPDATE public.change_orders
SET amount = 125,
    amendment_history = amendment_history ||
      '[{"at":"2026-08-24T20:00:00Z","reason":"Executed CO reopened"}]'::jsonb
WHERE id = '91000000-0000-4000-8000-000000000004';

SELECT is(
  (SELECT source_amount FROM public.co_margin_links WHERE id = '91000000-0000-4000-8000-000000000005'),
  100::numeric,
  'amending the CO does not silently certify the old vendor classification'
);

SELECT is(
  (SELECT source_amendment_count FROM public.co_margin_links WHERE id = '91000000-0000-4000-8000-000000000005'),
  1,
  'amending the CO leaves the saved revision available for review comparison'
);

UPDATE public.co_margin_links
SET note = 'review note only'
WHERE id = '91000000-0000-4000-8000-000000000005';

SELECT is(
  (SELECT source_amount FROM public.co_margin_links WHERE id = '91000000-0000-4000-8000-000000000005'),
  100::numeric,
  'non-classification metadata does not clear the review requirement'
);

UPDATE public.co_margin_links
SET sub_cost = 90
WHERE id = '91000000-0000-4000-8000-000000000005';

SELECT is(
  (SELECT source_amount FROM public.co_margin_links WHERE id = '91000000-0000-4000-8000-000000000005'),
  125::numeric,
  're-saving the vendor classification captures the amended amount'
);

SELECT is(
  (SELECT source_amendment_count FROM public.co_margin_links WHERE id = '91000000-0000-4000-8000-000000000005'),
  2,
  're-saving the vendor classification captures the amended revision'
);

SELECT is(
  (SELECT sub_cost FROM public.co_margin_links WHERE id = '91000000-0000-4000-8000-000000000005'),
  90::numeric,
  'the reviewed vendor amount is preserved with the refreshed source snapshot'
);

SELECT * FROM finish();
ROLLBACK;
