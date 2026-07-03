-- Shareable magic-link access to a consulting engagement's client portal.
-- The consultant generates a link; the client opens /client/<token> — no account.
-- Data is served by the client-portal edge function (service role, scoped to the
-- link's project_id), so this table only needs workspace-side management RLS.
CREATE TABLE IF NOT EXISTS public.consulting_client_links (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id     uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token          text NOT NULL UNIQUE,
  label          text,                    -- e.g. "Glorieta – exec view"
  is_active      boolean NOT NULL DEFAULT true,
  show_financials boolean NOT NULL DEFAULT true,  -- let the consultant hide invoices/fees
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS consulting_client_links_project_idx ON public.consulting_client_links (project_id);
CREATE INDEX IF NOT EXISTS consulting_client_links_token_idx ON public.consulting_client_links (token);

ALTER TABLE public.consulting_client_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY consulting_client_links_tenant ON public.consulting_client_links
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

NOTIFY pgrst, 'reload schema';
