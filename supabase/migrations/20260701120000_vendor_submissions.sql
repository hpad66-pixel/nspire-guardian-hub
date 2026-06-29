-- Vendor pay-app submission portal. A subcontractor opens a magic link, builds
-- their AIA G702/G703 pay application against their commitment, e-signs a
-- conditional lien waiver, and submits to APAS. The unconditional waiver fires
-- on payment (later step). Distinct from the existing `vendor_submissions`
-- ingestion queue — this is the vendor-built submission. Vendor is anonymous →
-- reads/writes go through the service-role `vendor-submit` edge fn keyed by token.
CREATE TABLE IF NOT EXISTS public.vendor_payapp_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  commitment_id uuid REFERENCES public.commitments(id) ON DELETE SET NULL,
  token         text NOT NULL UNIQUE,
  vendor_name   text,
  vendor_email  text,
  status        text NOT NULL DEFAULT 'requested'
                CHECK (status IN ('requested', 'submitted', 'approved', 'paid', 'void')),
  app_no        integer,
  period_from   date,
  period_to     date,
  lines         jsonb NOT NULL DEFAULT '[]',          -- G703 continuation lines
  retainage_pct numeric NOT NULL DEFAULT 10,
  prior_payments        numeric NOT NULL DEFAULT 0,
  total_completed       numeric,
  retainage_amount      numeric,
  current_due           numeric,
  conditional_signed_at   timestamptz,
  conditional_signed_name text,
  notes         text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  submitted_at  timestamptz
);
CREATE INDEX IF NOT EXISTS vendor_payapp_project_idx ON public.vendor_payapp_submissions (project_id, status);
CREATE INDEX IF NOT EXISTS vendor_payapp_commitment_idx ON public.vendor_payapp_submissions (commitment_id);

ALTER TABLE public.vendor_payapp_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_payapp_tenant ON public.vendor_payapp_submissions FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
