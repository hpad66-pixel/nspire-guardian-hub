-- Automatic version history (PR3k). Editing and saving a document should never
-- require a side quest ("replace the original") — the saved edit simply becomes
-- the current version. Real version control means a browsable history you can
-- restore from or prune, not a gate blocking normal use.
CREATE TABLE IF NOT EXISTS public.authored_document_versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id  uuid NOT NULL REFERENCES public.authored_documents(id) ON DELETE CASCADE,
  version      integer NOT NULL,
  html         text NOT NULL,        -- faithful-render snapshot at this point
  label        text NOT NULL DEFAULT 'Edited',  -- Uploaded | Edited | Finalized | Restored to vN
  created_by   uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS authored_document_versions_doc_idx ON public.authored_document_versions (document_id, version DESC);

ALTER TABLE public.authored_document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY authored_document_versions_tenant ON public.authored_document_versions
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

NOTIFY pgrst, 'reload schema';
