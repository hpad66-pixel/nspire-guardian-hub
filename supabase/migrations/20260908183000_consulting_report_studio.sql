-- Consulting Reports Studio
-- A report is a reviewed, project-scoped composition built from an explicit
-- conversation and a traceable source manifest. Source files remain private in
-- the existing project-documents bucket. Nothing is published automatically.

CREATE TABLE IF NOT EXISTS public.consulting_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled report',
  subtitle text,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'issued')),
  conversation jsonb NOT NULL DEFAULT '[]'::jsonb,
  body_html text NOT NULL DEFAULT '<h2>Executive summary</h2><p>Begin the report conversation to create a draft.</p>',
  generation_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  issued_at timestamptz,
  issued_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consulting_reports_project_updated_idx
  ON public.consulting_reports(project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.consulting_report_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.consulting_reports(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('upload', 'google_drive', 'project_document')),
  source_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  storage_path text,
  drive_file_id text,
  drive_web_url text,
  extracted_text text,
  caption text,
  included boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consulting_report_sources_report_order_idx
  ON public.consulting_report_sources(report_id, sort_order, created_at);

ALTER TABLE public.consulting_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consulting_report_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY consulting_reports_tenant_all ON public.consulting_reports
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY consulting_report_sources_tenant_all ON public.consulting_report_sources
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE OR REPLACE FUNCTION public.touch_consulting_report_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consulting_reports_touch_updated_at ON public.consulting_reports;
CREATE TRIGGER consulting_reports_touch_updated_at
BEFORE UPDATE ON public.consulting_reports
FOR EACH ROW EXECUTE FUNCTION public.touch_consulting_report_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consulting_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consulting_report_sources TO authenticated;

NOTIFY pgrst, 'reload schema';
