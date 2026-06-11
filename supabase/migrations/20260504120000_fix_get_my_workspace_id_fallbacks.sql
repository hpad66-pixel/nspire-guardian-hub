-- Align legacy workspace helper with the newer tenant model.
-- Many existing RLS policies still depend on get_my_workspace_id(),
-- but some newer auth flows resolve workspace via JWT tenant_id or
-- portal_memberships before profiles.workspace_id is populated.

CREATE OR REPLACE FUNCTION public.get_my_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.current_tenant_id(),
    (
      SELECT p.workspace_id
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
      LIMIT 1
    ),
    (
      SELECT pm.tenant_id
      FROM public.portal_memberships pm
      WHERE pm.user_id = auth.uid()
        AND pm.is_active = true
      ORDER BY CASE pm.portal_kind
        WHEN 'main' THEN 1
        WHEN 'owner' THEN 2
        WHEN 'sub' THEN 3
        ELSE 4
      END
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM public.workspaces w
      WHERE w.owner_user_id = auth.uid()
      LIMIT 1
    )
  );
$$;

COMMENT ON FUNCTION public.get_my_workspace_id IS
  'Resolves current workspace via JWT tenant claim first, then legacy profiles linkage, then portal membership, then workspace ownership.';
