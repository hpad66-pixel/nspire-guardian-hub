-- Client document library: files the contractor shares to the client portal
-- (plans, permits, warranties, the signed contract…). Everything in this table
-- IS shared — the GC only adds what the client should see. Tenant-isolated.
CREATE TABLE IF NOT EXISTS public.client_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  url         text NOT NULL,
  category    text,
  size_bytes  bigint,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_documents_project_idx ON public.client_documents (project_id, created_at DESC);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_documents_tenant ON public.client_documents FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
