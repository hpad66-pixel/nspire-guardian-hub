-- ============================================================
-- Financial Ledger + linked partial payments (Stack A · project_contracts)
--
-- Goal (per owner request):
--   • A high-level AR/AP ledger across a project: invoices submitted to the
--     owner (receivable) and invoices received from subs/vendors (payable),
--     plus every payment recorded against them.
--   • Payments may be PARTIAL and must link to a specific invoice/pay-app AND
--     optionally a specific change order, so reports reconcile correctly.
--   • Original source PDFs attach via project_artifacts (artifact_id refs).
--
-- Additive + idempotent. Touches only the Stack A contract_* tables.
-- ============================================================

-- ── 1 · contract_payments: direction + links to invoice / CO / artifact ──
ALTER TABLE public.contract_payments
  ADD COLUMN IF NOT EXISTS direction       TEXT NOT NULL DEFAULT 'received'
    CHECK (direction IN ('received','paid')),
  ADD COLUMN IF NOT EXISTS invoice_id      UUID REFERENCES public.contract_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS change_order_id UUID REFERENCES public.contract_change_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS artifact_id     UUID REFERENCES public.project_artifacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contract_payments_invoice_idx ON public.contract_payments(invoice_id);
CREATE INDEX IF NOT EXISTS contract_payments_co_idx      ON public.contract_payments(change_order_id);

-- ── 2 · contract_invoices: attach source doc + optional CO it bills ──
ALTER TABLE public.contract_invoices
  ADD COLUMN IF NOT EXISTS change_order_id UUID REFERENCES public.contract_change_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS artifact_id     UUID REFERENCES public.project_artifacts(id) ON DELETE SET NULL,
  -- 'pay_app' marks AIA G702/G703 billings to the owner; 'invoice' = plain bill.
  ADD COLUMN IF NOT EXISTS invoice_kind    TEXT NOT NULL DEFAULT 'invoice'
    CHECK (invoice_kind IN ('invoice','pay_app')),
  ADD COLUMN IF NOT EXISTS pay_app_no      INTEGER;

-- ── 3 · contract_change_orders: attach source doc ──
ALTER TABLE public.contract_change_orders
  ADD COLUMN IF NOT EXISTS artifact_id UUID REFERENCES public.project_artifacts(id) ON DELETE SET NULL;

-- ── 4 · Tenant-boundary trigger (CLAUDE.md rule 8) ──
-- contract_payments now references three parent tables via nullable FKs.
-- RLS hides cross-tenant rows on read, but a buggy/malicious insert could still
-- write a UUID from another tenant. Enforce same-tenant linkage explicitly.
CREATE OR REPLACE FUNCTION public.enforce_contract_payment_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant FROM public.contract_invoices WHERE id = NEW.invoice_id;
    IF v_tenant IS NULL OR v_tenant <> NEW.tenant_id THEN
      RAISE EXCEPTION 'invoice_id % is not in tenant %', NEW.invoice_id, NEW.tenant_id;
    END IF;
  END IF;

  IF NEW.change_order_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant FROM public.contract_change_orders WHERE id = NEW.change_order_id;
    IF v_tenant IS NULL OR v_tenant <> NEW.tenant_id THEN
      RAISE EXCEPTION 'change_order_id % is not in tenant %', NEW.change_order_id, NEW.tenant_id;
    END IF;
  END IF;

  IF NEW.artifact_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant FROM public.project_artifacts WHERE id = NEW.artifact_id;
    IF v_tenant IS NULL OR v_tenant <> NEW.tenant_id THEN
      RAISE EXCEPTION 'artifact_id % is not in tenant %', NEW.artifact_id, NEW.tenant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_payment_tenant ON public.contract_payments;
CREATE TRIGGER trg_contract_payment_tenant
  BEFORE INSERT OR UPDATE ON public.contract_payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contract_payment_tenant();

-- ── 5 · Per-invoice balance view (drives partial-payment tracking) ──
DROP VIEW IF EXISTS public.contract_invoice_balances;
CREATE VIEW public.contract_invoice_balances
WITH (security_invoker = on) AS
SELECT
  ci.id                                   AS invoice_id,
  ci.tenant_id,
  ci.contract_id,
  pc.project_id,
  ci.invoice_number,
  ci.invoice_kind,
  ci.pay_app_no,
  ci.invoice_date,
  ci.status,
  ci.amount,
  ci.retainage,
  ci.net_due,
  COALESCE(p.paid_to_date, 0)             AS paid_to_date,
  ci.net_due - COALESCE(p.paid_to_date, 0) AS balance_due,
  COALESCE(p.payment_count, 0)            AS payment_count
FROM public.contract_invoices ci
JOIN public.project_contracts pc ON pc.id = ci.contract_id
LEFT JOIN (
  SELECT invoice_id, SUM(amount) AS paid_to_date, COUNT(*) AS payment_count
  FROM public.contract_payments
  WHERE invoice_id IS NOT NULL
  GROUP BY invoice_id
) p ON p.invoice_id = ci.id;

-- ── 6 · Unified financial ledger (AR + AP, invoices + COs + payments) ──
-- direction: 'receivable' (owner owes us) | 'payable' (we owe a sub/vendor),
-- derived from the contract type. APAS is always the prime side; the
-- counterparty is stored in subcontractor_name (see seed).
DROP VIEW IF EXISTS public.financial_ledger;
CREATE VIEW public.financial_ledger
WITH (security_invoker = on) AS
-- invoices / pay apps
SELECT
  ('invoice:' || ci.id)                   AS ledger_id,
  ci.tenant_id,
  pc.project_id,
  ci.contract_id,
  pc.contract_number,
  pc.contract_title,
  pc.contract_type,
  CASE WHEN pc.contract_type IN ('prime','owner') THEN 'receivable' ELSE 'payable' END AS direction,
  CASE WHEN ci.invoice_kind = 'pay_app' THEN 'pay_app' ELSE 'invoice' END AS entry_type,
  COALESCE(ci.invoice_date, ci.period_end) AS entry_date,
  COALESCE(NULLIF(pc.subcontractor_name, ''), pc.prime_contractor_name) AS party_name,
  COALESCE(ci.invoice_number,
           CASE WHEN ci.pay_app_no IS NOT NULL THEN 'Pay App #' || ci.pay_app_no END) AS reference,
  COALESCE(ci.notes, pc.contract_title)   AS description,
  ci.amount,
  ci.status,
  ci.id                                   AS invoice_id,
  ci.change_order_id,
  ci.artifact_id,
  ci.created_at
FROM public.contract_invoices ci
JOIN public.project_contracts pc ON pc.id = ci.contract_id

UNION ALL
-- change orders
SELECT
  ('co:' || co.id),
  co.tenant_id,
  pc.project_id,
  co.contract_id,
  pc.contract_number,
  pc.contract_title,
  pc.contract_type,
  CASE WHEN pc.contract_type IN ('prime','owner') THEN 'receivable' ELSE 'payable' END,
  'change_order',
  COALESCE(co.co_date, co.created_at::date),
  COALESCE(NULLIF(pc.subcontractor_name, ''), pc.prime_contractor_name),
  COALESCE(co.co_number, 'CO'),
  co.description,
  co.amount,
  co.status,
  NULL::uuid,
  co.id,
  co.artifact_id,
  co.created_at
FROM public.contract_change_orders co
JOIN public.project_contracts pc ON pc.id = co.contract_id

UNION ALL
-- payments
SELECT
  ('payment:' || pay.id),
  pay.tenant_id,
  pc.project_id,
  pay.contract_id,
  pc.contract_number,
  pc.contract_title,
  pc.contract_type,
  CASE WHEN pay.direction = 'received' THEN 'receivable' ELSE 'payable' END,
  'payment',
  pay.payment_date,
  COALESCE(NULLIF(pc.subcontractor_name, ''), pc.prime_contractor_name),
  COALESCE(pay.reference, pay.payment_method, 'Payment'),
  COALESCE(pay.notes,
           CASE WHEN pay.direction = 'received' THEN 'Payment received' ELSE 'Payment made' END),
  pay.amount,
  pay.direction,
  pay.invoice_id,
  pay.change_order_id,
  pay.artifact_id,
  pay.created_at
FROM public.contract_payments pay
JOIN public.project_contracts pc ON pc.id = pay.contract_id;

COMMENT ON VIEW public.financial_ledger IS
  'Unified AR/AP ledger for a project: invoices, pay apps, change orders, and payments from Stack A contract_* tables.';
COMMENT ON VIEW public.contract_invoice_balances IS
  'Per-invoice net due vs paid-to-date for partial-payment tracking.';
