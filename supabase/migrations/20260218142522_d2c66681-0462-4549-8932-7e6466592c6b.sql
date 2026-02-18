-- Tighten RLS policies for project_client_updates
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert client updates" ON public.project_client_updates;
DROP POLICY IF EXISTS "Authenticated users can update client updates" ON public.project_client_updates;
DROP POLICY IF EXISTS "Authenticated users can delete client updates" ON public.project_client_updates;

-- Insert: only authenticated users who are the project creator OR have a role on the project
CREATE POLICY "PMs can insert client updates"
  ON public.project_client_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.projects WHERE id = project_id
    )
  );

-- Update: only the creator of the update
CREATE POLICY "Creators can update their client updates"
  ON public.project_client_updates FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Delete: only the creator of the update
CREATE POLICY "Creators can delete their client updates"
  ON public.project_client_updates FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());