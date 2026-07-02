-- ClickUp follow-ups: auto-push toggle + per-project List override.

ALTER TABLE public.clickup_connections
  ADD COLUMN IF NOT EXISTS auto_push boolean NOT NULL DEFAULT false;

-- Per-project target List (falls back to the connection's default list).
-- Not a secret, so normal tenant RLS (client can read/write its own).
CREATE TABLE IF NOT EXISTS public.clickup_project_lists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  list_id     text NOT NULL,
  list_name   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clickup_project_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY clickup_project_lists_tenant ON public.clickup_project_lists FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

NOTIFY pgrst, 'reload schema';
