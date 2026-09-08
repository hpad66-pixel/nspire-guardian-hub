-- Consulting cash-flow and financial closeout.
--
-- Consulting engagements bill clients from executed proposals, then incur
-- subcontractor / consultant / reimbursable costs.  These records deliberately
-- remain separate from construction commitments and pay applications while
-- preserving the same A/R -> A/P -> reconciliation controls.

BEGIN;

CREATE TABLE IF NOT EXISTS public.consulting_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  vendor_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  vendor_name text NOT NULL CHECK (length(btrim(vendor_name)) > 0),
  cost_type text NOT NULL DEFAULT 'subcontractor'
    CHECK (cost_type IN ('subcontractor', 'consultant', 'reimbursable', 'internal_labor', 'other')),
  reference_no text,
  description text,
  bill_date date NOT NULL DEFAULT current_date,
  due_date date,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('draft', 'approved', 'partially_paid', 'paid', 'void')),
  attachment_path text,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consulting_costs_project_idx
  ON public.consulting_costs(project_id, bill_date DESC);
CREATE INDEX IF NOT EXISTS consulting_costs_vendor_idx
  ON public.consulting_costs(vendor_org_id)
  WHERE vendor_org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS consulting_costs_proposal_idx
  ON public.consulting_costs(proposal_id)
  WHERE proposal_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.consulting_cost_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  cost_id uuid NOT NULL REFERENCES public.consulting_costs(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_date date NOT NULL DEFAULT current_date,
  method text,
  reference text,
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consulting_cost_payments_cost_idx
  ON public.consulting_cost_payments(cost_id, paid_date DESC);

CREATE TABLE IF NOT EXISTS public.consulting_financial_closeouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  approved_revenue numeric(14,2) NOT NULL,
  invoiced_revenue numeric(14,2) NOT NULL,
  cash_received numeric(14,2) NOT NULL,
  total_costs numeric(14,2) NOT NULL,
  cash_paid numeric(14,2) NOT NULL,
  net_profit numeric(14,2) NOT NULL,
  margin_pct numeric(8,4) NOT NULL DEFAULT 0,
  notes text,
  reconciled_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Client receipt integrity mirrors the cost-payment guard: a receipt must
-- belong to the invoice tenant and cannot push an invoice past its total.
CREATE OR REPLACE FUNCTION public.validate_consulting_invoice_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.consulting_invoices%ROWTYPE;
  v_other_received numeric(14,2);
BEGIN
  SELECT * INTO v_invoice FROM public.consulting_invoices WHERE id = NEW.invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulting invoice not found'; END IF;
  IF v_invoice.status = 'void' THEN RAISE EXCEPTION 'A void invoice cannot receive payment'; END IF;
  IF NEW.tenant_id IS DISTINCT FROM v_invoice.tenant_id THEN
    RAISE EXCEPTION 'Consulting invoice payment crosses the tenant boundary';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.invoice_id IS DISTINCT FROM OLD.invoice_id THEN
    RAISE EXCEPTION 'Move is not allowed; delete and record the receipt against the correct invoice';
  END IF;
  SELECT COALESCE(sum(amount), 0) INTO v_other_received
    FROM public.consulting_invoice_payments
   WHERE invoice_id = NEW.invoice_id
     AND (TG_OP <> 'UPDATE' OR id <> OLD.id);
  IF v_other_received + NEW.amount > v_invoice.total + 0.005 THEN
    RAISE EXCEPTION 'Receipt exceeds the remaining client invoice balance';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_consulting_invoice_payment_trg ON public.consulting_invoice_payments;
CREATE TRIGGER validate_consulting_invoice_payment_trg
  BEFORE INSERT OR UPDATE ON public.consulting_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_consulting_invoice_payment();

CREATE OR REPLACE FUNCTION public.refresh_consulting_invoice_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  v_total numeric(14,2);
  v_received numeric(14,2);
BEGIN
  SELECT total INTO v_total FROM public.consulting_invoices WHERE id = v_invoice_id;
  IF v_total IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT COALESCE(sum(amount), 0) INTO v_received
    FROM public.consulting_invoice_payments WHERE invoice_id = v_invoice_id;
  UPDATE public.consulting_invoices
     SET status = CASE
       WHEN v_received >= v_total - 0.005 THEN 'paid'
       WHEN v_received > 0 THEN 'sent'
       ELSE status
     END,
     updated_at = now()
   WHERE id = v_invoice_id AND status <> 'void';
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS refresh_consulting_invoice_status_trg ON public.consulting_invoice_payments;
CREATE TRIGGER refresh_consulting_invoice_status_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.consulting_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.refresh_consulting_invoice_status();

CREATE OR REPLACE FUNCTION public.guard_consulting_invoice_settlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_received numeric(14,2);
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('paid', 'void') THEN
    SELECT COALESCE(sum(amount), 0) INTO v_received
      FROM public.consulting_invoice_payments WHERE invoice_id = OLD.id;
    IF NEW.status = 'paid' AND v_received < NEW.total - 0.005 THEN
      RAISE EXCEPTION 'Invoice cannot be marked paid until receipts equal the invoice total';
    END IF;
    IF NEW.status = 'void' AND v_received > 0 THEN
      RAISE EXCEPTION 'A received invoice cannot be voided; correct its receipts first';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_consulting_invoice_settlement_trg ON public.consulting_invoices;
CREATE TRIGGER guard_consulting_invoice_settlement_trg
  BEFORE UPDATE ON public.consulting_invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_consulting_invoice_settlement();

ALTER TABLE public.consulting_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consulting_cost_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consulting_financial_closeouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consulting_costs_tenant ON public.consulting_costs;
CREATE POLICY consulting_costs_tenant ON public.consulting_costs
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS consulting_cost_payments_tenant ON public.consulting_cost_payments;
CREATE POLICY consulting_cost_payments_tenant ON public.consulting_cost_payments
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS consulting_financial_closeouts_tenant ON public.consulting_financial_closeouts;
CREATE POLICY consulting_financial_closeouts_tenant ON public.consulting_financial_closeouts
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE OR REPLACE FUNCTION public.validate_consulting_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_tenant uuid;
  v_proposal_tenant uuid;
  v_paid numeric(14,2);
BEGIN
  SELECT workspace_id INTO v_project_tenant FROM public.projects WHERE id = NEW.project_id;
  IF v_project_tenant IS NULL OR v_project_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'Consulting cost crosses the project tenant boundary';
  END IF;

  IF NEW.proposal_id IS NOT NULL THEN
    SELECT tenant_id INTO v_proposal_tenant FROM public.proposals WHERE id = NEW.proposal_id;
    IF v_proposal_tenant IS NULL OR v_proposal_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'Consulting cost crosses the proposal tenant boundary';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(sum(amount), 0) INTO v_paid
      FROM public.consulting_cost_payments WHERE cost_id = OLD.id;
    IF NEW.amount < v_paid THEN
      RAISE EXCEPTION 'Cost amount cannot be reduced below payments already made';
    END IF;
    IF NEW.status = 'void' AND v_paid > 0 THEN
      RAISE EXCEPTION 'A paid cost cannot be voided; correct its payments first';
    END IF;
  END IF;

  IF NEW.status IN ('approved', 'partially_paid', 'paid') AND NEW.approved_at IS NULL THEN
    NEW.approved_at := now();
    NEW.approved_by := COALESCE(NEW.approved_by, auth.uid());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_consulting_cost_trg ON public.consulting_costs;
CREATE TRIGGER validate_consulting_cost_trg
  BEFORE INSERT OR UPDATE ON public.consulting_costs
  FOR EACH ROW EXECUTE FUNCTION public.validate_consulting_cost();

CREATE OR REPLACE FUNCTION public.validate_consulting_cost_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost public.consulting_costs%ROWTYPE;
  v_other_paid numeric(14,2);
BEGIN
  SELECT * INTO v_cost FROM public.consulting_costs WHERE id = NEW.cost_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulting cost not found'; END IF;
  IF v_cost.status IN ('draft', 'void') THEN
    RAISE EXCEPTION 'Only approved costs can be paid';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM v_cost.tenant_id THEN
    RAISE EXCEPTION 'Consulting cost payment crosses the tenant boundary';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.cost_id IS DISTINCT FROM OLD.cost_id THEN
    RAISE EXCEPTION 'Move is not allowed; delete and record the payment against the correct cost';
  END IF;

  SELECT COALESCE(sum(amount), 0) INTO v_other_paid
    FROM public.consulting_cost_payments
   WHERE cost_id = NEW.cost_id
     AND (TG_OP <> 'UPDATE' OR id <> OLD.id);

  IF v_other_paid + NEW.amount > v_cost.amount + 0.005 THEN
    RAISE EXCEPTION 'Payment exceeds the remaining approved cost balance';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_consulting_cost_payment_trg ON public.consulting_cost_payments;
CREATE TRIGGER validate_consulting_cost_payment_trg
  BEFORE INSERT OR UPDATE ON public.consulting_cost_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_consulting_cost_payment();

CREATE OR REPLACE FUNCTION public.refresh_consulting_cost_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost_id uuid := COALESCE(NEW.cost_id, OLD.cost_id);
  v_total numeric(14,2);
  v_paid numeric(14,2);
BEGIN
  SELECT amount INTO v_total FROM public.consulting_costs WHERE id = v_cost_id;
  IF v_total IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT COALESCE(sum(amount), 0) INTO v_paid
    FROM public.consulting_cost_payments WHERE cost_id = v_cost_id;
  UPDATE public.consulting_costs
     SET status = CASE
       WHEN v_paid >= v_total - 0.005 THEN 'paid'
       WHEN v_paid > 0 THEN 'partially_paid'
       ELSE 'approved'
     END,
     updated_at = now()
   WHERE id = v_cost_id AND status <> 'void';
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS refresh_consulting_cost_status_trg ON public.consulting_cost_payments;
CREATE TRIGGER refresh_consulting_cost_status_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.consulting_cost_payments
  FOR EACH ROW EXECUTE FUNCTION public.refresh_consulting_cost_status();

CREATE OR REPLACE VIEW public.v_consulting_financial_position
WITH (security_invoker = true)
AS
WITH proposal_values AS (
  SELECT
    p.project_id,
    p.tenant_id,
    round(sum(COALESCE(pl.quantity, 0) * COALESCE(pl.unit_cost, 0))
      * (1 + (COALESCE(p.overhead_pct, 0) + COALESCE(p.profit_pct, 0)) / 100.0), 2) AS amount
  FROM public.proposals p
  LEFT JOIN public.proposal_lines pl ON pl.proposal_id = p.id
  WHERE p.status = 'approved'
  GROUP BY p.id, p.project_id, p.tenant_id, p.overhead_pct, p.profit_pct
), proposal_totals AS (
  SELECT project_id, tenant_id, COALESCE(sum(amount), 0) AS approved_revenue
  FROM proposal_values GROUP BY project_id, tenant_id
), invoice_totals AS (
  SELECT
    project_id,
    tenant_id,
    COALESCE(sum(total) FILTER (WHERE status IN ('sent', 'paid')), 0) AS invoiced_revenue,
    count(*) FILTER (WHERE status = 'draft') AS draft_invoice_count
  FROM public.consulting_invoices
  WHERE status <> 'void'
  GROUP BY project_id, tenant_id
), receipt_totals AS (
  SELECT i.project_id, i.tenant_id, COALESCE(sum(ip.amount), 0) AS cash_received
  FROM public.consulting_invoices i
  JOIN public.consulting_invoice_payments ip ON ip.invoice_id = i.id
  WHERE i.status <> 'void'
  GROUP BY i.project_id, i.tenant_id
), cost_totals AS (
  SELECT
    project_id,
    tenant_id,
    COALESCE(sum(amount) FILTER (WHERE status IN ('approved', 'partially_paid', 'paid')), 0) AS total_costs,
    count(*) FILTER (WHERE status = 'draft') AS draft_cost_count
  FROM public.consulting_costs
  WHERE status <> 'void'
  GROUP BY project_id, tenant_id
), payment_totals AS (
  SELECT c.project_id, c.tenant_id, COALESCE(sum(cp.amount), 0) AS cash_paid
  FROM public.consulting_costs c
  JOIN public.consulting_cost_payments cp ON cp.cost_id = c.id
  WHERE c.status <> 'void'
  GROUP BY c.project_id, c.tenant_id
)
SELECT
  p.id AS project_id,
  p.workspace_id AS tenant_id,
  COALESCE(pr.approved_revenue, 0)::numeric(14,2) AS approved_revenue,
  COALESCE(iv.invoiced_revenue, 0)::numeric(14,2) AS invoiced_revenue,
  COALESCE(rt.cash_received, 0)::numeric(14,2) AS cash_received,
  COALESCE(ct.total_costs, 0)::numeric(14,2) AS total_costs,
  COALESCE(pt.cash_paid, 0)::numeric(14,2) AS cash_paid,
  greatest(COALESCE(pr.approved_revenue, 0) - COALESCE(iv.invoiced_revenue, 0), 0)::numeric(14,2) AS unbilled_revenue,
  greatest(COALESCE(iv.invoiced_revenue, 0) - COALESCE(rt.cash_received, 0), 0)::numeric(14,2) AS open_ar,
  greatest(COALESCE(ct.total_costs, 0) - COALESCE(pt.cash_paid, 0), 0)::numeric(14,2) AS open_ap,
  greatest(COALESCE(iv.invoiced_revenue, 0) - COALESCE(pr.approved_revenue, 0), 0)::numeric(14,2) AS overbilled_revenue,
  greatest(COALESCE(rt.cash_received, 0) - COALESCE(iv.invoiced_revenue, 0), 0)::numeric(14,2) AS client_credit,
  (COALESCE(pr.approved_revenue, 0) - COALESCE(ct.total_costs, 0))::numeric(14,2) AS projected_net_profit,
  (COALESCE(rt.cash_received, 0) - COALESCE(pt.cash_paid, 0))::numeric(14,2) AS net_profit,
  CASE WHEN COALESCE(rt.cash_received, 0) = 0 THEN 0
    ELSE round((COALESCE(rt.cash_received, 0) - COALESCE(pt.cash_paid, 0)) / rt.cash_received * 100.0, 4)
  END::numeric(8,4) AS margin_pct,
  COALESCE(iv.draft_invoice_count, 0)::integer AS draft_invoice_count,
  COALESCE(ct.draft_cost_count, 0)::integer AS draft_cost_count,
  (
    COALESCE(pr.approved_revenue, 0) > 0
    AND abs(COALESCE(pr.approved_revenue, 0) - COALESCE(iv.invoiced_revenue, 0)) <= 0.01
    AND abs(COALESCE(iv.invoiced_revenue, 0) - COALESCE(rt.cash_received, 0)) <= 0.01
    AND abs(COALESCE(ct.total_costs, 0) - COALESCE(pt.cash_paid, 0)) <= 0.01
    AND COALESCE(iv.draft_invoice_count, 0) = 0
    AND COALESCE(ct.draft_cost_count, 0) = 0
  ) AS is_reconciled
FROM public.projects p
LEFT JOIN proposal_totals pr ON pr.project_id = p.id
LEFT JOIN invoice_totals iv ON iv.project_id = p.id
LEFT JOIN receipt_totals rt ON rt.project_id = p.id
LEFT JOIN cost_totals ct ON ct.project_id = p.id
LEFT JOIN payment_totals pt ON pt.project_id = p.id
WHERE p.project_type IN ('consulting', 'client');

CREATE OR REPLACE FUNCTION public.close_consulting_project(
  p_project_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.consulting_financial_closeouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position public.v_consulting_financial_position%ROWTYPE;
  v_tenant uuid;
  v_result public.consulting_financial_closeouts%ROWTYPE;
  v_authorized boolean;
BEGIN
  SELECT workspace_id INTO v_tenant
    FROM public.projects
   WHERE id = p_project_id
     AND project_type IN ('consulting', 'client')
   FOR UPDATE;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Consulting project not found'; END IF;

  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = auth.uid()
       AND ur.role::text IN ('admin', 'owner', 'administrator')
  ) INTO v_authorized;
  IF NOT v_authorized THEN RAISE EXCEPTION 'Only a project administrator can close financials'; END IF;

  SELECT * INTO v_position
    FROM public.v_consulting_financial_position
   WHERE project_id = p_project_id;
  IF NOT COALESCE(v_position.is_reconciled, false) THEN
    RAISE EXCEPTION 'Financials are not reconciled: bill all approved fees, collect A/R, pay A/P, and resolve drafts first';
  END IF;

  INSERT INTO public.consulting_financial_closeouts (
    tenant_id, project_id, approved_revenue, invoiced_revenue, cash_received,
    total_costs, cash_paid, net_profit, margin_pct, notes, closed_by
  ) VALUES (
    v_tenant, p_project_id, v_position.approved_revenue, v_position.invoiced_revenue,
    v_position.cash_received, v_position.total_costs, v_position.cash_paid,
    v_position.net_profit, v_position.margin_pct, NULLIF(btrim(p_notes), ''), auth.uid()
  )
  ON CONFLICT (project_id) DO UPDATE SET
    approved_revenue = EXCLUDED.approved_revenue,
    invoiced_revenue = EXCLUDED.invoiced_revenue,
    cash_received = EXCLUDED.cash_received,
    total_costs = EXCLUDED.total_costs,
    cash_paid = EXCLUDED.cash_paid,
    net_profit = EXCLUDED.net_profit,
    margin_pct = EXCLUDED.margin_pct,
    notes = EXCLUDED.notes,
    reconciled_at = now(),
    closed_at = now(),
    closed_by = auth.uid()
  RETURNING * INTO v_result;

  UPDATE public.projects SET status = 'closed', updated_at = now() WHERE id = p_project_id;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.close_consulting_project(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_consulting_project(uuid, text) TO authenticated;
GRANT SELECT ON public.v_consulting_financial_position TO authenticated;

COMMENT ON VIEW public.v_consulting_financial_position IS
  'Consulting proposal-to-cash and cost-to-payment position used for reconciliation and closeout.';
COMMENT ON COLUMN public.consulting_financial_closeouts.net_profit IS
  'Final cash-basis net profit: all client cash received less all consulting project costs paid.';

NOTIFY pgrst, 'reload schema';
COMMIT;
