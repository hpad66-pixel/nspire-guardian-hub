-- Client portal notes: one narrow client-facing update lane per project.
CREATE TABLE IF NOT EXISTS public.client_portal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_email text,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_portal_notes_project_time
  ON public.client_portal_notes(project_id, created_at DESC);

ALTER TABLE public.client_portal_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_portal_notes_select ON public.client_portal_notes;
CREATE POLICY client_portal_notes_select
  ON public.client_portal_notes
  FOR SELECT TO authenticated
  USING (
    (tenant_id = public.get_my_workspace_id() OR public.is_super_admin())
    AND public.can_access_project(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS client_portal_notes_insert ON public.client_portal_notes;
CREATE POLICY client_portal_notes_insert
  ON public.client_portal_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_workspace_id()
    AND author_id = auth.uid()
    AND public.can_access_project(auth.uid(), project_id)
  );
