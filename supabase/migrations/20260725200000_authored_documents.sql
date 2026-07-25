-- Authored documents (PR3g) — editable letters/documents authored IN the app:
-- upload a .docx/.pdf (parsed to HTML client-side) or start blank, edit in the
-- rich editor, finalize (lock), download as Word/PDF, and track. Distinct from
-- project_documents (a passive uploaded-file registry): these carry live,
-- editable rich content. content_text also feeds the project knowledge base that
-- the opt-in AI draft can draw from — no API is used to create or edit them.

CREATE TABLE IF NOT EXISTS public.authored_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title            text NOT NULL DEFAULT 'Untitled document',
  doc_type         text NOT NULL DEFAULT 'letter',   -- letter | memo | report | notice | general
  category         text,                             -- r4 | city | general (for correspondence linkage)
  status           text NOT NULL DEFAULT 'draft',    -- draft | final
  content_html     text NOT NULL DEFAULT '<p></p>',
  content_text     text,                             -- plain mirror for search + knowledge base
  source           text NOT NULL DEFAULT 'blank',    -- blank | upload_docx | upload_pdf | ai_draft
  source_file_name text,
  finalized_at     timestamptz,
  finalized_by     uuid,
  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS authored_documents_project_idx ON public.authored_documents (project_id, updated_at DESC);

ALTER TABLE public.authored_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY authored_documents_tenant ON public.authored_documents
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

NOTIFY pgrst, 'reload schema';
