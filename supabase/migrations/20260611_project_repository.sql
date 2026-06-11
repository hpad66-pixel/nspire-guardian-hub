-- Project Repository: per-project historical artifact store
-- AI-ready from day one: extracted_text for full-text search, tags[], source_system

CREATE TYPE artifact_type AS ENUM (
  'prime_contract',
  'invoice',
  'change_order',
  'drawing',
  'permit',
  'inspection_record',
  'photo',
  'specification',
  'correspondence',
  'other'
);

CREATE TYPE artifact_source AS ENUM (
  'procore',
  'builtos',
  'manual'
);

CREATE TABLE public.project_artifacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- classification
  artifact_type   artifact_type NOT NULL DEFAULT 'other',
  source_system   artifact_source NOT NULL DEFAULT 'manual',

  -- metadata
  title           TEXT NOT NULL,
  description     TEXT,
  period_date     DATE,                         -- invoice period, CO date, inspection date, etc.
  reference_no    TEXT,                         -- invoice #, CO #, contract #, drawing #
  amount          NUMERIC(14,2),                -- for financial artifacts

  -- storage
  file_path       TEXT NOT NULL,                -- Supabase Storage path
  file_name       TEXT NOT NULL,
  file_size       INTEGER,
  mime_type       TEXT,

  -- AI readiness
  extracted_text  TEXT,                         -- full text extracted from PDF / OCR
  tags            TEXT[] NOT NULL DEFAULT '{}', -- keyword tags for filtering + future semantic search

  -- linkage to live Build OS records (set when "Extract & Import" is used)
  linked_entity_type  TEXT,                     -- 'invoice' | 'change_order' | 'prime_contract' | etc.
  linked_entity_id    UUID,

  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX project_artifacts_project_id_idx  ON public.project_artifacts(project_id);
CREATE INDEX project_artifacts_tenant_id_idx   ON public.project_artifacts(tenant_id);
CREATE INDEX project_artifacts_type_idx        ON public.project_artifacts(artifact_type);
CREATE INDEX project_artifacts_source_idx      ON public.project_artifacts(source_system);
-- Full-text search index for AI querying
CREATE INDEX project_artifacts_fts_idx ON public.project_artifacts
  USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(extracted_text,'')));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER project_artifacts_updated_at
  BEFORE UPDATE ON public.project_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.project_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_artifacts_tenant_isolation ON public.project_artifacts
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Storage bucket policy note:
-- Run in Supabase dashboard: create bucket "project-artifacts" with public=false
-- Then add storage policy allowing authenticated users to upload/read within their tenant path.
