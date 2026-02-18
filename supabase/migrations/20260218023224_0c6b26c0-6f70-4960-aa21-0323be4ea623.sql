
-- Create project progress reports table
CREATE TABLE public.project_progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly_invoice')),
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_progress_reports ENABLE ROW LEVEL SECURITY;

-- Users can manage their own reports
CREATE POLICY "Users can manage their own reports"
  ON public.project_progress_reports
  FOR ALL
  USING (auth.uid() = generated_by)
  WITH CHECK (auth.uid() = generated_by);

-- Auto-update updated_at
CREATE TRIGGER update_project_progress_reports_updated_at
  BEFORE UPDATE ON public.project_progress_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
