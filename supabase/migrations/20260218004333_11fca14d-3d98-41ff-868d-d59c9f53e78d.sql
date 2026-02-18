
CREATE TABLE public.project_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meeting_time TEXT,
  meeting_type TEXT NOT NULL DEFAULT 'progress',
  location TEXT,
  title TEXT NOT NULL,
  attendees JSONB DEFAULT '[]'::jsonb,
  raw_notes TEXT,
  polished_notes TEXT,
  polished_notes_html TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  finalized_by UUID,
  finalized_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project meetings"
  ON public.project_meetings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create project meetings"
  ON public.project_meetings FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators and managers can update project meetings"
  ON public.project_meetings FOR UPDATE
  USING (
    auth.uid() = created_by
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admins can delete project meetings"
  ON public.project_meetings FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_project_meetings_updated_at
  BEFORE UPDATE ON public.project_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
