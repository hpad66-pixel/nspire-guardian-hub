-- ============================================================
-- F0 · Retire Stack A — migrate header-level data into the cost-code cascade,
-- then drop the Stack-A tables/views. One-shot (drops its own sources).
--
-- Carried over: contracts, change orders, invoices/pay-apps, payments, amounts,
-- statuses, and source-document (artifact_id) links. NOT carried: cost-code
-- allocations and vendor-org FKs (Stack A held neither as structured links) —
-- re-link in Stack D as needed.
-- ============================================================
DO $$
DECLARE
  r RECORD;
  v_new_id uuid;
  v_co_type text;
BEGIN
  -- id maps (old Stack-A id -> new Stack-D id)
  CREATE TEMP TABLE _map_contract (old_id uuid PRIMARY KEY, new_id uuid, kind text) ON COMMIT DROP;
  CREATE TEMP TABLE _map_invoice  (old_id uuid PRIMARY KEY, new_id uuid, kind text) ON COMMIT DROP;

  -- Skip cleanly if Stack A is already gone.
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema='public' AND table_name='project_contracts') THEN
    RAISE NOTICE 'Stack A already retired — nothing to do.';
    RETURN;
  END IF;

  -- ── 1 · contracts ─────────────────────────────────────────
  FOR r IN SELECT * FROM public.project_contracts LOOP
    IF r.contract_type = 'prime' THEN
      INSERT INTO public.prime_contracts
        (tenant_id, project_id, contract_no, title, original_value, retainage_pct, status, executed_date, created_by)
      VALUES
        (r.tenant_id, r.project_id, COALESCE(r.contract_number, 'PC-'||left(r.id::text,8)),
         COALESCE(r.contract_title,'Migrated contract'), COALESCE(r.base_contract_amount,0),
         COALESCE(r.retainage_percent,10), CASE WHEN r.status='executed' THEN 'executed' ELSE 'draft' END,
         r.contract_date, r.created_by)
      RETURNING id INTO v_new_id;
      INSERT INTO _map_contract VALUES (r.id, v_new_id, 'prime');
    ELSE
      INSERT INTO public.commitments
        (tenant_id, project_id, commitment_type, commitment_no, title, original_value, retainage_pct, status, executed_date, created_by)
      VALUES
        (r.tenant_id, r.project_id, 'subcontract', COALESCE(r.contract_number,'SC-'||left(r.id::text,8)),
         COALESCE(r.contract_title,'Migrated commitment'), COALESCE(r.base_contract_amount,0),
         COALESCE(r.retainage_percent,10), CASE WHEN r.status='executed' THEN 'executed' ELSE 'draft' END,
         r.contract_date, r.created_by)
      RETURNING id INTO v_new_id;
      INSERT INTO _map_contract VALUES (r.id, v_new_id, 'commitment');
    END IF;
  END LOOP;

  -- ── 2 · change orders (co_no auto-assigned by trigger) ────
  FOR r IN SELECT co.*, m.new_id AS parent_new_id, m.kind
           FROM public.contract_change_orders co
           JOIN _map_contract m ON m.old_id = co.contract_id LOOP
    IF r.kind = 'prime' THEN
      INSERT INTO public.change_orders
        (tenant_id, project_id, title, description, amount, status, co_type, prime_contract_id, executed_date)
      VALUES
        (r.tenant_id, (SELECT project_id FROM public.prime_contracts WHERE id = r.parent_new_id),
         COALESCE(r.description,'Migrated CO'), r.description, COALESCE(r.amount,0),
         CASE WHEN r.status='approved' THEN 'executed' ELSE 'draft' END, 'PCO', r.parent_new_id, r.co_date);
    ELSE
      INSERT INTO public.change_orders
        (tenant_id, project_id, title, description, amount, status, co_type, commitment_id, executed_date)
      VALUES
        (r.tenant_id, (SELECT project_id FROM public.commitments WHERE id = r.parent_new_id),
         COALESCE(r.description,'Migrated CO'), r.description, COALESCE(r.amount,0),
         CASE WHEN r.status='approved' THEN 'executed' ELSE 'draft' END, 'CCO', r.parent_new_id, r.co_date);
    END IF;
  END LOOP;

  -- ── 3 · invoices / pay apps ───────────────────────────────
  FOR r IN SELECT ci.*, m.new_id AS parent_new_id, m.kind,
                  row_number() OVER (PARTITION BY ci.contract_id ORDER BY ci.invoice_date NULLS LAST, ci.created_at) AS seq
           FROM public.contract_invoices ci
           JOIN _map_contract m ON m.old_id = ci.contract_id LOOP
    IF r.kind = 'prime' THEN
      INSERT INTO public.prime_contract_pay_apps
        (tenant_id, prime_contract_id, pay_app_no, period_end, status, submitted_amount, approved_amount,
         retainage_held, approved_date, invoice_no, artifact_id, created_by)
      VALUES
        (r.tenant_id, r.parent_new_id, COALESCE(r.pay_app_no, r.seq::int),
         COALESCE(r.period_end, r.invoice_date, CURRENT_DATE),
         CASE WHEN r.status IN ('approved','paid','submitted','rejected') THEN r.status ELSE 'draft' END,
         r.amount, CASE WHEN r.status IN ('approved','paid') THEN r.amount END,
         r.retainage, CASE WHEN r.status IN ('approved','paid') THEN r.invoice_date END,
         r.invoice_number, r.artifact_id, NULL)
      RETURNING id INTO v_new_id;
      INSERT INTO _map_invoice VALUES (r.id, v_new_id, 'prime');
    ELSE
      INSERT INTO public.commitment_invoices
        (tenant_id, commitment_id, invoice_no, period_end, status, submitted_amount, approved_amount,
         retainage_held, artifact_id, created_by)
      VALUES
        (r.tenant_id, r.parent_new_id, COALESCE(r.invoice_number,'INV-'||left(r.id::text,8)),
         COALESCE(r.period_end, r.invoice_date, CURRENT_DATE),
         CASE WHEN r.status IN ('approved','paid','submitted','rejected') THEN r.status ELSE 'draft' END,
         r.amount, CASE WHEN r.status IN ('approved','paid') THEN r.amount END,
         r.retainage, r.artifact_id, NULL)
      RETURNING id INTO v_new_id;
      INSERT INTO _map_invoice VALUES (r.id, v_new_id, 'commitment');
    END IF;
  END LOOP;

  -- ── 4 · payments (disable lien gate for historical migration) ──
  IF EXISTS (SELECT 1 FROM public.contract_payments) THEN
    ALTER TABLE public.commitment_payments DISABLE TRIGGER trg_commitment_payment_lien;
    FOR r IN SELECT p.*, m.new_id AS inv_new_id, m.kind
             FROM public.contract_payments p
             JOIN _map_invoice m ON m.old_id = p.invoice_id LOOP
      IF r.kind = 'prime' THEN
        INSERT INTO public.prime_contract_payments
          (tenant_id, prime_contract_id, pay_app_id, amount, received_date, method, reference, notes, artifact_id)
        SELECT r.tenant_id, pa.prime_contract_id, r.inv_new_id, r.amount, r.payment_date,
               r.payment_method, r.reference, r.notes, r.artifact_id
        FROM public.prime_contract_pay_apps pa WHERE pa.id = r.inv_new_id;
      ELSE
        INSERT INTO public.commitment_payments
          (tenant_id, commitment_id, commitment_invoice_id, amount, paid_date, method, reference, notes, artifact_id)
        SELECT r.tenant_id, ci.commitment_id, r.inv_new_id, r.amount, r.payment_date,
               r.payment_method, r.reference, r.notes, r.artifact_id
        FROM public.commitment_invoices ci WHERE ci.id = r.inv_new_id;
      END IF;
    END LOOP;
    ALTER TABLE public.commitment_payments ENABLE TRIGGER trg_commitment_payment_lien;
  END IF;

  RAISE NOTICE 'Migrated % contracts, % invoices.',
    (SELECT count(*) FROM _map_contract), (SELECT count(*) FROM _map_invoice);
END $$;

-- ── 5 · drop Stack A ────────────────────────────────────────
DROP VIEW IF EXISTS public.financial_ledger;
DROP VIEW IF EXISTS public.contract_invoice_balances;
DROP TABLE IF EXISTS public.contract_payments CASCADE;
DROP TABLE IF EXISTS public.contract_invoices CASCADE;
DROP TABLE IF EXISTS public.contract_change_orders CASCADE;
DROP TABLE IF EXISTS public.contract_sov_items CASCADE;
DROP TABLE IF EXISTS public.project_contracts CASCADE;
