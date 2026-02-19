-- Drop the narrow "users can update own" policy and replace with a broader workspace-aware one
-- Also add a proper WITH CHECK so updates can't move contacts to another workspace

DROP POLICY IF EXISTS "Users can update own contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Admins can update property contacts" ON public.crm_contacts;

-- New: workspace members can update any contact in their workspace
CREATE POLICY "Workspace members can update contacts"
  ON public.crm_contacts
  FOR UPDATE
  USING (workspace_id = get_my_workspace_id())
  WITH CHECK (workspace_id = get_my_workspace_id());

-- Also fix DELETE policy to cover workspace scope (not just own user_id)
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Admins can delete property contacts" ON public.crm_contacts;

CREATE POLICY "Workspace members can delete contacts"
  ON public.crm_contacts
  FOR DELETE
  USING (workspace_id = get_my_workspace_id());