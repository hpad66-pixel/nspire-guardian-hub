-- ============================================================
-- B5 · Documents + Transmittals — folder tree + versioning + transmittals.
-- ============================================================

ALTER TABLE public.document_folders
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.document_folders(id);

CREATE TABLE IF NOT EXISTS public.pl_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.document_folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  current_version int NOT NULL DEFAULT 1,
  mime text,
  size_bytes bigint,
  checked_out_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pldocs_project ON public.pl_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_pldocs_folder ON public.pl_documents(folder_id);

CREATE TABLE IF NOT EXISTS public.pl_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.pl_documents(id) ON DELETE CASCADE,
  version int NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  note text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, version)
);

CREATE TABLE IF NOT EXISTS public.transmittals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  number text NOT NULL,
  subject text NOT NULL,
  body text,
  from_user_id uuid REFERENCES auth.users(id),
  distribution_list_id uuid REFERENCES public.distribution_lists(id),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, number)
);

CREATE TABLE IF NOT EXISTS public.transmittal_items (
  transmittal_id uuid NOT NULL REFERENCES public.transmittals(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.pl_documents(id) ON DELETE CASCADE,
  version int NOT NULL,
  PRIMARY KEY (transmittal_id, document_id)
);

ALTER TABLE public.pl_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pl_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transmittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transmittal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY pldocs_tenant ON public.pl_documents FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY pldv_via_doc ON public.pl_document_versions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pl_documents d WHERE d.id = pl_document_versions.document_id
                 AND (d.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pl_documents d WHERE d.id = pl_document_versions.document_id
                      AND (d.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

CREATE POLICY trans_tenant ON public.transmittals FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY ti_via_transmittal ON public.transmittal_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transmittals t WHERE t.id = transmittal_items.transmittal_id
                 AND (t.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.transmittals t WHERE t.id = transmittal_items.transmittal_id
                      AND (t.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

-- Auto-increment transmittal number per project (TRN-NNNN)
CREATE SEQUENCE IF NOT EXISTS public.transmittal_seq_counter START WITH 1;

CREATE OR REPLACE FUNCTION public.next_transmittal_number(p_project_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE v int;
BEGIN
  SELECT COALESCE(MAX((regexp_match(number, '^TRN-(\d+)$'))[1]::int), 0) + 1
    INTO v
    FROM public.transmittals WHERE project_id = p_project_id;
  RETURN 'TRN-' || lpad(v::text, 4, '0');
END;
$$;

DROP TRIGGER IF EXISTS trg_pldocs_updated_at ON public.pl_documents;
CREATE TRIGGER trg_pldocs_updated_at BEFORE UPDATE ON public.pl_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
