-- Prime↔sub margin reconciliation. Each owner-facing prime change order can be
-- paired to the subcontractor change order that fulfills it; APAS's recovery is
-- the delta (prime − sub). is_pass_through marks intended no-margin items.
-- Base-contract margin (prime contract value − sum of commitment values) is
-- derived, not stored here. Tenant-isolated.
CREATE TABLE IF NOT EXISTS public.co_margin_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  prime_co_id     uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  sub_co_id       uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  is_pass_through boolean NOT NULL DEFAULT false,
  note            text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prime_co_id, sub_co_id)
);
CREATE INDEX IF NOT EXISTS co_margin_links_project_idx ON public.co_margin_links (project_id);

ALTER TABLE public.co_margin_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY co_margin_links_tenant ON public.co_margin_links FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
