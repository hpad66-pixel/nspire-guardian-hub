-- Per-workspace change-order identity & defaults (white-label). One row per
-- workspace; seeds new change orders' contractor party, branding, and markup
-- percentages so each tenant's documents/emails carry their own identity.
CREATE TABLE IF NOT EXISTS public.workspace_co_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_name text,
  company_address text,
  company_city text,
  company_contact text,
  company_title text,
  company_email text,
  wordmark text,
  footer text,
  default_overhead_pct numeric NOT NULL DEFAULT 10,
  default_profit_pct numeric NOT NULL DEFAULT 5,
  email_from_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_co_settings ENABLE ROW LEVEL SECURITY;

-- Idempotent: drop-then-create so re-applying can't fail on an existing policy.
-- DROP POLICY removes only the policy definition; the table's rows are untouched.
DROP POLICY IF EXISTS workspace_co_settings_tenant_all ON public.workspace_co_settings;
CREATE POLICY workspace_co_settings_tenant_all ON public.workspace_co_settings
  FOR ALL TO authenticated
  USING (workspace_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (workspace_id = public.current_tenant_id() OR public.is_super_admin());

-- Seed the existing workspace with the current APAS identity so nothing changes
-- for the current user; other/new tenants start blank and set their own.
INSERT INTO public.workspace_co_settings
  (workspace_id, company_name, company_address, company_city, company_contact, company_title, company_email, wordmark, footer)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'APAS Consulting LLC', '3256 NW 83 Way', 'Cooper City, FL 33024',
   'Hardeep Anand, P.E.', 'Principal', 'hardeep@apas.ai', 'APAS CONSULTING',
   'APAS Consulting LLC  ·  Confidential  ·  Change Order Proposal')
ON CONFLICT (workspace_id) DO NOTHING;
