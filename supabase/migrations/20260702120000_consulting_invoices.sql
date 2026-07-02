-- Consulting engagement invoicing. Bill against scope completion: each invoice
-- line captures a scope's prior billed % and the new "bill-to" %, and charges
-- fee * (pct_this - pct_prev). Finalizing an invoice bumps the scope's
-- pct_billed so the next invoice bills only the new delta (AIA-style, without
-- retainage or lien gating).

CREATE TABLE IF NOT EXISTS public.consulting_invoices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invoice_no   integer NOT NULL DEFAULT 1,
  status       text NOT NULL DEFAULT 'draft',      -- draft | sent | paid | void
  issue_date   date NOT NULL DEFAULT current_date,
  due_date     date,
  notes        text,
  subtotal     numeric NOT NULL DEFAULT 0,
  total        numeric NOT NULL DEFAULT 0,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consulting_invoices_project_idx ON public.consulting_invoices (project_id, invoice_no DESC);
ALTER TABLE public.consulting_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY consulting_invoices_tenant ON public.consulting_invoices FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.consulting_invoice_lines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invoice_id   uuid NOT NULL REFERENCES public.consulting_invoices(id) ON DELETE CASCADE,
  scope_id     uuid REFERENCES public.project_scopes(id) ON DELETE SET NULL,
  description  text NOT NULL,
  fee_amount   numeric NOT NULL DEFAULT 0,
  pct_prev     numeric(5,2) NOT NULL DEFAULT 0,
  pct_this     numeric(5,2) NOT NULL DEFAULT 0,
  amount       numeric NOT NULL DEFAULT 0,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consulting_invoice_lines_invoice_idx ON public.consulting_invoice_lines (invoice_id, sort_order);
ALTER TABLE public.consulting_invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY consulting_invoice_lines_tenant ON public.consulting_invoice_lines FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.consulting_invoice_payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invoice_id    uuid NOT NULL REFERENCES public.consulting_invoices(id) ON DELETE CASCADE,
  amount        numeric NOT NULL DEFAULT 0,
  received_date date NOT NULL DEFAULT current_date,
  method        text,
  note          text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consulting_invoice_payments_invoice_idx ON public.consulting_invoice_payments (invoice_id);
ALTER TABLE public.consulting_invoice_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY consulting_invoice_payments_tenant ON public.consulting_invoice_payments FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

NOTIFY pgrst, 'reload schema';
