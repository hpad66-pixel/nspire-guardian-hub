-- Permit phone OCR / photo tiles.
-- Extends project + property permits with scan photo + notation, and adds a
-- tenant-scoped permit_scans gallery for grouping by client or project.

-- ── project_permits scan columns ───────────────────────────────────────────
ALTER TABLE public.project_permits
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS photo_path text,
  ADD COLUMN IF NOT EXISTS notation text,
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.organization_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ocr_extracted jsonb,
  ADD COLUMN IF NOT EXISTS scanned_at timestamptz;

CREATE INDEX IF NOT EXISTS project_permits_document_idx
  ON public.project_permits (document_id)
  WHERE document_id IS NOT NULL;

-- ── property permits scan columns ──────────────────────────────────────────
ALTER TABLE public.permits
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS photo_path text,
  ADD COLUMN IF NOT EXISTS notation text,
  ADD COLUMN IF NOT EXISTS ocr_extracted jsonb,
  ADD COLUMN IF NOT EXISTS scanned_at timestamptz;

-- ── permit_scans gallery (one row per captured image / upload) ─────────────
CREATE TABLE IF NOT EXISTS public.permit_scans (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL DEFAULT public.current_tenant_id()
                            REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id              uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  property_id             uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  client_id               uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_permit_id       uuid REFERENCES public.project_permits(id) ON DELETE SET NULL,
  property_permit_id      uuid REFERENCES public.permits(id) ON DELETE SET NULL,
  document_id             uuid REFERENCES public.organization_documents(id) ON DELETE SET NULL,
  photo_url               text NOT NULL,
  photo_path              text,
  mime_type               text,
  notation                text,
  ocr_extracted           jsonb,
  ocr_raw_text            text,
  permit_number           text,
  description             text,
  department              text,
  trade                   text,
  contractor              text,
  building                text,
  street_address          text,
  issued_on               date,
  status                  text NOT NULL DEFAULT 'open_active',
  created_by              uuid,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permit_scans_parent_chk CHECK (
    project_id IS NOT NULL OR property_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS permit_scans_tenant_idx ON public.permit_scans (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS permit_scans_project_idx ON public.permit_scans (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS permit_scans_client_idx ON public.permit_scans (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS permit_scans_property_idx ON public.permit_scans (property_id, created_at DESC);

ALTER TABLE public.permit_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS permit_scans_tenant_isolation ON public.permit_scans;
CREATE POLICY permit_scans_tenant_isolation ON public.permit_scans
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Tenant boundary: project_id / property_id / document_id must share tenant.
CREATE OR REPLACE FUNCTION public.enforce_permit_scan_tenant_boundary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_tenant uuid;
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT COALESCE(
      (SELECT c.workspace_id FROM public.clients c JOIN public.projects p ON p.client_id = c.id WHERE p.id = NEW.project_id),
      (SELECT pr.workspace_id FROM public.properties pr JOIN public.projects p ON p.property_id = pr.id WHERE p.id = NEW.project_id)
    ) INTO v_parent_tenant;
    IF v_parent_tenant IS NOT NULL AND v_parent_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'permit_scans.project_id crosses tenant boundary';
    END IF;
  END IF;

  IF NEW.property_id IS NOT NULL THEN
    SELECT workspace_id INTO v_parent_tenant FROM public.properties WHERE id = NEW.property_id;
    IF v_parent_tenant IS NOT NULL AND v_parent_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'permit_scans.property_id crosses tenant boundary';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_permit_scans_tenant_boundary ON public.permit_scans;
CREATE TRIGGER trg_permit_scans_tenant_boundary
  BEFORE INSERT OR UPDATE ON public.permit_scans
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_permit_scan_tenant_boundary();

-- ── storage bucket ─────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'permit-scans',
  'permit-scans',
  true,
  15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Members view permit scans" ON storage.objects;
CREATE POLICY "Members view permit scans"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'permit-scans' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Members upload permit scans" ON storage.objects;
CREATE POLICY "Members upload permit scans"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'permit-scans' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Members update permit scans" ON storage.objects;
CREATE POLICY "Members update permit scans"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'permit-scans' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Members delete permit scans" ON storage.objects;
CREATE POLICY "Members delete permit scans"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'permit-scans' AND auth.uid() IS NOT NULL);

-- Enable Permits module on consulting projects that have not explicitly opted out.
UPDATE public.projects p
SET module_config = COALESCE(p.module_config, '{}'::jsonb) || jsonb_build_object('permits', true)
WHERE lower(COALESCE(p.project_type, '')) IN ('consulting', 'client')
  AND (p.module_config IS NULL OR NOT (p.module_config ? 'permits'));

NOTIFY pgrst, 'reload schema';
