-- Per-project vocabulary so the AI uses the right spellings for names/terms
-- (e.g. "Dhruman", "Dettbarn") and normalises common mishears ("Roman" -> "Dhruman").
CREATE TABLE IF NOT EXISTS public.project_dictionary (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  term        text NOT NULL,
  variants    text[] NOT NULL DEFAULT '{}',
  notes       text,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_dictionary_project_idx ON public.project_dictionary (project_id);

ALTER TABLE public.project_dictionary ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_dictionary_tenant ON public.project_dictionary FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Agenda storage on consulting meetings (for Feature B).
ALTER TABLE public.consulting_meetings
  ADD COLUMN IF NOT EXISTS agenda text;

NOTIFY pgrst, 'reload schema';
