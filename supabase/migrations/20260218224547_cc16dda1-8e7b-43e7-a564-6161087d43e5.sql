
-- Create portal_client_uploads table for files clients upload to share with the team
CREATE TABLE IF NOT EXISTS public.portal_client_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_client_uploads ENABLE ROW LEVEL SECURITY;

-- Project members can view client uploads for their projects
CREATE POLICY "Project members can view client uploads"
ON public.portal_client_uploads FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_team_members ptm
    WHERE ptm.project_id = portal_client_uploads.project_id
      AND ptm.user_id = auth.uid()
  )
  OR
  uploaded_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.workspace_id = public.get_my_workspace_id()
      AND p.id IN (SELECT property_id FROM public.projects WHERE id = portal_client_uploads.project_id)
  )
  OR
  public.has_role(auth.uid(), 'admin'::app_role)
  OR
  public.has_role(auth.uid(), 'owner'::app_role)
  OR
  public.has_role(auth.uid(), 'manager'::app_role)
);

-- Authenticated users can insert their own uploads
CREATE POLICY "Authenticated users can insert client uploads"
ON public.portal_client_uploads FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid());

-- Create the portal-uploads storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('portal-uploads', 'portal-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload to portal-uploads
CREATE POLICY "Authenticated users can upload to portal-uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'portal-uploads');

-- Storage policy: anyone can view portal-uploads files (public bucket)
CREATE POLICY "Public read access to portal-uploads"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'portal-uploads');
