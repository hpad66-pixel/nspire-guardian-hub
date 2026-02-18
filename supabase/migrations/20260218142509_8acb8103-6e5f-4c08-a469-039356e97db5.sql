-- Create project_client_updates table for PM-to-client progress updates
CREATE TABLE IF NOT EXISTS public.project_client_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  photo_url TEXT NULL,
  update_type TEXT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_client_updates ENABLE ROW LEVEL SECURITY;

-- PMs (authenticated users) can read all updates for projects they manage
CREATE POLICY "Authenticated users can read client updates"
  ON public.project_client_updates FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users (PMs) can insert updates
CREATE POLICY "Authenticated users can insert client updates"
  ON public.project_client_updates FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users (PMs) can update their own updates
CREATE POLICY "Authenticated users can update client updates"
  ON public.project_client_updates FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users (PMs) can delete their own updates
CREATE POLICY "Authenticated users can delete client updates"
  ON public.project_client_updates FOR DELETE
  TO authenticated
  USING (true);

-- Updated_at trigger
CREATE TRIGGER update_project_client_updates_updated_at
  BEFORE UPDATE ON public.project_client_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();