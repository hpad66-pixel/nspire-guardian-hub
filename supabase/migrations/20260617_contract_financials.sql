-- Contract Invoices
CREATE TABLE public.contract_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contract_id     UUID NOT NULL REFERENCES public.project_contracts(id) ON DELETE CASCADE,
  invoice_number  TEXT,
  invoice_date    DATE,
  period_start    DATE,
  period_end      DATE,
  amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  retainage       NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_due         NUMERIC(14,2) GENERATED ALWAYS AS (amount - retainage) STORED,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','approved','paid','rejected')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_invoices_tenant_isolation ON public.contract_invoices
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE TRIGGER contract_invoices_updated_at
  BEFORE UPDATE ON public.contract_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contract Change Orders
CREATE TABLE public.contract_change_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contract_id     UUID NOT NULL REFERENCES public.project_contracts(id) ON DELETE CASCADE,
  co_number       TEXT,
  description     TEXT NOT NULL,
  amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','voided')),
  co_date         DATE,
  reason          TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_change_orders_tenant_isolation ON public.contract_change_orders
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE TRIGGER contract_change_orders_updated_at
  BEFORE UPDATE ON public.contract_change_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contract Payments Received
CREATE TABLE public.contract_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contract_id     UUID NOT NULL REFERENCES public.project_contracts(id) ON DELETE CASCADE,
  payment_date    DATE NOT NULL,
  amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  reference       TEXT,
  payment_method  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_payments_tenant_isolation ON public.contract_payments
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE TRIGGER contract_payments_updated_at
  BEFORE UPDATE ON public.contract_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
