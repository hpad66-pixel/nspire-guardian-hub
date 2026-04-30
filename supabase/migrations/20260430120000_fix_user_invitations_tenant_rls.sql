-- Align user_invitations RLS with the current tenant model.
-- The app now resolves workspace context from JWT tenant_id / portal_memberships,
-- but this table was still enforcing the legacy profiles.workspace_id helper.

DROP POLICY IF EXISTS "user_invitations_select" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_insert" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_update" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_delete" ON public.user_invitations;

CREATE POLICY "user_invitations_select"
ON public.user_invitations
FOR SELECT
TO authenticated
USING (
  workspace_id = public.current_tenant_id()
  OR workspace_id = public.get_my_workspace_id()
  OR public.is_super_admin()
);

CREATE POLICY "user_invitations_insert"
ON public.user_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id = public.current_tenant_id()
  OR workspace_id = public.get_my_workspace_id()
  OR public.is_super_admin()
);

CREATE POLICY "user_invitations_update"
ON public.user_invitations
FOR UPDATE
TO authenticated
USING (
  workspace_id = public.current_tenant_id()
  OR workspace_id = public.get_my_workspace_id()
  OR public.is_super_admin()
)
WITH CHECK (
  workspace_id = public.current_tenant_id()
  OR workspace_id = public.get_my_workspace_id()
  OR public.is_super_admin()
);

CREATE POLICY "user_invitations_delete"
ON public.user_invitations
FOR DELETE
TO authenticated
USING (
  workspace_id = public.current_tenant_id()
  OR workspace_id = public.get_my_workspace_id()
  OR public.is_super_admin()
);
