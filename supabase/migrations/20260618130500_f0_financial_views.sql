-- ============================================================
-- F0 · Unified financial views on the cost-code cascade.
-- All security_invoker = on so tenant RLS applies through the views.
-- ============================================================

-- ── Per prime pay app: billed vs received (AR) ──────────────
DROP VIEW IF EXISTS public.v_pay_app_balances;
CREATE VIEW public.v_pay_app_balances WITH (security_invoker = on) AS
SELECT
  pa.id                                              AS pay_app_id,
  pa.tenant_id,
  pa.prime_contract_id,
  pc.project_id,
  pa.pay_app_no,
  pa.status,
  COALESCE(pa.approved_amount, pa.submitted_amount, 0) AS billed_amount,
  COALESCE(pa.retainage_held, 0)                     AS retainage_held,
  COALESCE(r.received_to_date, 0)                    AS received_to_date,
  COALESCE(pa.approved_amount, pa.submitted_amount, 0) - COALESCE(r.received_to_date, 0) AS balance_due,
  COALESCE(r.payment_count, 0)                       AS payment_count
FROM public.prime_contract_pay_apps pa
JOIN public.prime_contracts pc ON pc.id = pa.prime_contract_id
LEFT JOIN (
  SELECT pay_app_id, SUM(amount) AS received_to_date, COUNT(*) AS payment_count
  FROM public.prime_contract_payments GROUP BY pay_app_id
) r ON r.pay_app_id = pa.id;

-- ── Per commitment invoice: billed vs paid + lien status (AP) ──
DROP VIEW IF EXISTS public.v_commitment_invoice_balances;
CREATE VIEW public.v_commitment_invoice_balances WITH (security_invoker = on) AS
SELECT
  ci.id                                              AS commitment_invoice_id,
  ci.tenant_id,
  ci.commitment_id,
  cm.project_id,
  ci.invoice_no,
  ci.status,
  COALESCE(ci.approved_amount, ci.submitted_amount, 0) AS billed_amount,
  COALESCE(ci.retainage_held, 0)                     AS retainage_held,
  COALESCE(p.paid_to_date, 0)                        AS paid_to_date,
  COALESCE(ci.approved_amount, ci.submitted_amount, 0) - COALESCE(p.paid_to_date, 0) AS balance_due,
  COALESCE(p.payment_count, 0)                       AS payment_count,
  EXISTS (
    SELECT 1 FROM public.lien_releases lr
    WHERE lr.commitment_invoice_id = ci.id
      AND lr.direction = 'inbound' AND lr.status = 'approved'
  )                                                  AS lien_satisfied
FROM public.commitment_invoices ci
JOIN public.commitments cm ON cm.id = ci.commitment_id
LEFT JOIN (
  SELECT commitment_invoice_id, SUM(amount) AS paid_to_date, COUNT(*) AS payment_count
  FROM public.commitment_payments GROUP BY commitment_invoice_id
) p ON p.commitment_invoice_id = ci.id;

-- ── Unified ledger: one row per event, cost-code-keyed where determinate ──
DROP VIEW IF EXISTS public.v_project_financial_ledger;
CREATE VIEW public.v_project_financial_ledger WITH (security_invoker = on) AS
-- prime contract (receivable)
SELECT
  ('prime_contract:' || pc.id)        AS ledger_id,
  pc.tenant_id, pc.project_id,
  (SELECT CASE WHEN COUNT(DISTINCT sl.cost_code_id) = 1 THEN (array_agg(DISTINCT sl.cost_code_id))[1] END
     FROM public.prime_contract_sov_lines sl WHERE sl.prime_contract_id = pc.id) AS cost_code_id,
  'receivable'::text AS direction,
  'prime_contract'::text AS entry_type,
  pc.executed_date AS entry_date,
  o.name AS party_name,
  pc.contract_no AS reference,
  pc.title AS description,
  pc.original_value AS amount,
  pc.status, NULL::uuid AS artifact_id, pc.created_at
FROM public.prime_contracts pc
LEFT JOIN public.organizations o ON o.id = pc.owner_org_id

UNION ALL
-- change orders (receivable if prime, payable if commitment)
SELECT
  ('change_order:' || co.id),
  co.tenant_id, co.project_id,
  (SELECT CASE WHEN COUNT(DISTINCT col.cost_code_id) = 1 THEN (array_agg(DISTINCT col.cost_code_id))[1] END
     FROM public.change_order_lines col WHERE col.change_order_id = co.id),
  CASE WHEN co.commitment_id IS NOT NULL THEN 'payable' ELSE 'receivable' END,
  'change_order',
  COALESCE(co.executed_date, co.created_at::date),
  NULL,
  COALESCE(co.co_type, 'CO') || '-' || COALESCE(co.co_no::text, ''),
  co.title,
  co.amount, co.status, NULL::uuid, co.created_at
FROM public.change_orders co
WHERE co.co_type IS NOT NULL

UNION ALL
-- prime pay apps (receivable)
SELECT
  ('pay_app:' || pa.id),
  pa.tenant_id, pc.project_id,
  (SELECT CASE WHEN COUNT(DISTINCT sl.cost_code_id) = 1 THEN (array_agg(DISTINCT sl.cost_code_id))[1] END
     FROM public.prime_contract_pay_app_lines pal
     JOIN public.prime_contract_sov_lines sl ON sl.id = pal.sov_line_id
     WHERE pal.pay_app_id = pa.id),
  'receivable', 'pay_app',
  COALESCE(pa.approved_date, pa.period_end),
  o.name,
  COALESCE(pa.invoice_no, 'Pay App #' || pa.pay_app_no),
  'Pay Application #' || pa.pay_app_no,
  COALESCE(pa.approved_amount, pa.submitted_amount, 0), pa.status, pa.artifact_id, pa.created_at
FROM public.prime_contract_pay_apps pa
JOIN public.prime_contracts pc ON pc.id = pa.prime_contract_id
LEFT JOIN public.organizations o ON o.id = pc.owner_org_id

UNION ALL
-- AR receipts (receivable)
SELECT
  ('prime_payment:' || pp.id),
  pp.tenant_id, pc.project_id, NULL::uuid,
  'receivable', 'payment',
  pp.received_date, o.name,
  COALESCE(pp.reference, pp.method, 'Receipt'),
  'Payment received', pp.amount, 'received', pp.artifact_id, pp.created_at
FROM public.prime_contract_payments pp
JOIN public.prime_contracts pc ON pc.id = pp.prime_contract_id
LEFT JOIN public.organizations o ON o.id = pc.owner_org_id

UNION ALL
-- commitments (payable)
SELECT
  ('commitment:' || cm.id),
  cm.tenant_id, cm.project_id,
  (SELECT CASE WHEN COUNT(DISTINCT sl.cost_code_id) = 1 THEN (array_agg(DISTINCT sl.cost_code_id))[1] END
     FROM public.commitment_sov_lines sl WHERE sl.commitment_id = cm.id),
  'payable', 'commitment',
  cm.executed_date, o.name, cm.commitment_no, cm.title,
  cm.original_value, cm.status, NULL::uuid, cm.created_at
FROM public.commitments cm
LEFT JOIN public.organizations o ON o.id = cm.vendor_org_id

UNION ALL
-- commitment invoices (payable)
SELECT
  ('commitment_invoice:' || ci.id),
  ci.tenant_id, cm.project_id,
  (SELECT CASE WHEN COUNT(DISTINCT sl.cost_code_id) = 1 THEN (array_agg(DISTINCT sl.cost_code_id))[1] END
     FROM public.commitment_invoice_lines cil
     JOIN public.commitment_sov_lines sl ON sl.id = cil.sov_line_id
     WHERE cil.invoice_id = ci.id),
  'payable', 'invoice',
  ci.period_end, o.name, ci.invoice_no, 'Vendor invoice ' || ci.invoice_no,
  COALESCE(ci.approved_amount, ci.submitted_amount, 0), ci.status, ci.artifact_id, ci.created_at
FROM public.commitment_invoices ci
JOIN public.commitments cm ON cm.id = ci.commitment_id
LEFT JOIN public.organizations o ON o.id = cm.vendor_org_id

UNION ALL
-- AP disbursements (payable)
SELECT
  ('commitment_payment:' || cp.id),
  cp.tenant_id, cm.project_id, NULL::uuid,
  'payable', 'payment',
  cp.paid_date, o.name,
  COALESCE(cp.reference, cp.method, 'Payment'),
  'Payment to vendor', cp.amount, 'paid', cp.artifact_id, cp.created_at
FROM public.commitment_payments cp
JOIN public.commitments cm ON cm.id = cp.commitment_id
LEFT JOIN public.organizations o ON o.id = cm.vendor_org_id

UNION ALL
-- lien releases (informational; inbound=payable side, outbound=receivable side)
SELECT
  ('lien_release:' || lr.id),
  lr.tenant_id, lr.project_id, NULL::uuid,
  CASE WHEN lr.direction = 'inbound' THEN 'payable' ELSE 'receivable' END,
  'lien_release',
  COALESCE(lr.through_date, lr.created_at::date), NULL,
  lr.release_type, 'Lien release (' || lr.direction || ')',
  COALESCE(lr.amount, 0), lr.status, lr.artifact_id, lr.created_at
FROM public.lien_releases lr;

COMMENT ON VIEW public.v_project_financial_ledger IS
  'F0 unified AR/AP event ledger across the cost-code cascade. One row per event.';

-- ── Per-project dashboard header summary ────────────────────
DROP VIEW IF EXISTS public.v_project_financial_summary;
CREATE VIEW public.v_project_financial_summary WITH (security_invoker = on) AS
WITH prime AS (
  SELECT project_id, tenant_id, SUM(original_value) AS original_contract
  FROM public.prime_contracts GROUP BY project_id, tenant_id
),
prime_co AS (
  SELECT project_id, SUM(amount) AS approved_co_value
  FROM public.change_orders
  WHERE prime_contract_id IS NOT NULL AND status = 'executed'
  GROUP BY project_id
),
billed AS (
  SELECT pc.project_id,
         SUM(COALESCE(pa.approved_amount, pa.submitted_amount, 0)) AS billed_to_date,
         SUM(COALESCE(pa.retainage_held, 0)) AS ar_retainage_held
  FROM public.prime_contract_pay_apps pa
  JOIN public.prime_contracts pc ON pc.id = pa.prime_contract_id
  GROUP BY pc.project_id
),
received AS (
  SELECT pc.project_id, SUM(pp.amount) AS received_to_date
  FROM public.prime_contract_payments pp
  JOIN public.prime_contracts pc ON pc.id = pp.prime_contract_id
  GROUP BY pc.project_id
),
committed AS (
  SELECT project_id, SUM(original_value) AS committed_base
  FROM public.commitments GROUP BY project_id
),
commit_co AS (
  SELECT project_id, SUM(amount) AS committed_co
  FROM public.change_orders
  WHERE commitment_id IS NOT NULL AND status = 'executed'
  GROUP BY project_id
),
invoiced AS (
  SELECT cm.project_id,
         SUM(COALESCE(ci.approved_amount, ci.submitted_amount, 0)) AS commitment_invoiced,
         SUM(COALESCE(ci.retainage_held, 0)) AS ap_retainage_held
  FROM public.commitment_invoices ci
  JOIN public.commitments cm ON cm.id = ci.commitment_id
  GROUP BY cm.project_id
),
paid AS (
  SELECT cm.project_id, SUM(cp.amount) AS paid_to_subs
  FROM public.commitment_payments cp
  JOIN public.commitments cm ON cm.id = cp.commitment_id
  GROUP BY cm.project_id
)
SELECT
  prime.project_id,
  prime.tenant_id,
  COALESCE(prime.original_contract, 0)                              AS original_contract,
  COALESCE(prime_co.approved_co_value, 0)                          AS approved_co_value,
  COALESCE(prime.original_contract, 0) + COALESCE(prime_co.approved_co_value, 0) AS revised_contract,
  COALESCE(billed.billed_to_date, 0)                               AS billed_to_date,
  COALESCE(received.received_to_date, 0)                           AS received_to_date,
  COALESCE(billed.billed_to_date, 0) - COALESCE(received.received_to_date, 0) AS ar_outstanding,
  COALESCE(billed.ar_retainage_held, 0)                            AS ar_retainage_held,
  COALESCE(committed.committed_base, 0) + COALESCE(commit_co.committed_co, 0) AS committed_total,
  COALESCE(invoiced.commitment_invoiced, 0)                        AS commitment_invoiced,
  COALESCE(paid.paid_to_subs, 0)                                   AS paid_to_subs,
  COALESCE(invoiced.commitment_invoiced, 0) - COALESCE(paid.paid_to_subs, 0) AS ap_outstanding,
  COALESCE(invoiced.ap_retainage_held, 0)                          AS ap_retainage_held,
  COALESCE(received.received_to_date, 0) - COALESCE(paid.paid_to_subs, 0) AS net_cash_position
FROM prime
LEFT JOIN prime_co  ON prime_co.project_id  = prime.project_id
LEFT JOIN billed    ON billed.project_id    = prime.project_id
LEFT JOIN received  ON received.project_id  = prime.project_id
LEFT JOIN committed ON committed.project_id = prime.project_id
LEFT JOIN commit_co ON commit_co.project_id = prime.project_id
LEFT JOIN invoiced  ON invoiced.project_id  = prime.project_id
LEFT JOIN paid      ON paid.project_id      = prime.project_id;
