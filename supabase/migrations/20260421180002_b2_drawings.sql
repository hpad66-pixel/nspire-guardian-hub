-- ============================================================
-- B2 · Drawings — versioned sheet index with markups.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.drawing_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  set_date date,
  discipline text,
  uploaded_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  set_id uuid REFERENCES public.drawing_sets(id) ON DELETE SET NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sheet_number text NOT NULL,
  title text,
  discipline text,
  current_revision_id uuid,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, sheet_number)
);

CREATE TABLE IF NOT EXISTS public.drawing_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  drawing_id uuid NOT NULL REFERENCES public.drawings(id) ON DELETE CASCADE,
  rev_number text NOT NULL,
  pdf_path text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id),
  supersedes_id uuid REFERENCES public.drawing_revisions(id),
  is_current boolean NOT NULL DEFAULT true
);

ALTER TABLE public.drawings
  ADD CONSTRAINT drawings_current_revision_fk
  FOREIGN KEY (current_revision_id) REFERENCES public.drawing_revisions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.drawing_markups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  revision_id uuid NOT NULL REFERENCES public.drawing_revisions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  geometry jsonb NOT NULL,
  color text DEFAULT '#1D6FE8',  -- Build OS sapphire; users can override per markup
  text text,
  linked_record_id uuid,
  linked_record_type text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drawings_project ON public.drawings(project_id);
CREATE INDEX IF NOT EXISTS idx_dr_drawing ON public.drawing_revisions(drawing_id);
CREATE INDEX IF NOT EXISTS idx_dm_revision ON public.drawing_markups(revision_id);
CREATE INDEX IF NOT EXISTS idx_dm_linked ON public.drawing_markups(linked_record_type, linked_record_id) WHERE linked_record_id IS NOT NULL;

ALTER TABLE public.drawing_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_markups ENABLE ROW LEVEL SECURITY;

CREATE POLICY ds_tenant ON public.drawing_sets FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY dr_tenant ON public.drawings FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY drev_tenant ON public.drawing_revisions FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY dm_tenant ON public.drawing_markups FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- On new revision: flip other revisions for the drawing to is_current=false + update drawing pointer
CREATE OR REPLACE FUNCTION public.drawings_after_new_revision()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_current THEN
    UPDATE public.drawing_revisions
      SET is_current = false
      WHERE drawing_id = NEW.drawing_id AND id <> NEW.id;
    UPDATE public.drawings
      SET current_revision_id = NEW.id
      WHERE id = NEW.drawing_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dr_new_revision ON public.drawing_revisions;
CREATE TRIGGER trg_dr_new_revision
  AFTER INSERT ON public.drawing_revisions
  FOR EACH ROW EXECUTE FUNCTION public.drawings_after_new_revision();

DROP TRIGGER IF EXISTS trg_ds_updated_at ON public.drawing_sets;
CREATE TRIGGER trg_ds_updated_at BEFORE UPDATE ON public.drawing_sets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket for drawing PDFs (path: {tenant_id}/{project_id}/drawings/{revision_id}.pdf)
INSERT INTO storage.buckets (id, name, public)
VALUES ('drawings', 'drawings', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS drawings_tenant_read ON storage.objects;
CREATE POLICY drawings_tenant_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'drawings' AND (storage.foldername(name))[1] = public.current_tenant_id()::text);
DROP POLICY IF EXISTS drawings_tenant_write ON storage.objects;
CREATE POLICY drawings_tenant_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'drawings' AND (storage.foldername(name))[1] = public.current_tenant_id()::text);
