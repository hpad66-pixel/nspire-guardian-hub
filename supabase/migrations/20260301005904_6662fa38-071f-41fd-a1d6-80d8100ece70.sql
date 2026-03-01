-- Allow platform admins to manage workspace_modules for ANY workspace

-- Drop restrictive policies
DROP POLICY IF EXISTS workspace_modules_insert ON public.workspace_modules;
DROP POLICY IF EXISTS workspace_modules_update ON public.workspace_modules;
DROP POLICY IF EXISTS workspace_modules_select ON public.workspace_modules;
DROP POLICY IF EXISTS workspace_modules_delete ON public.workspace_modules;

-- SELECT: own workspace OR platform admin
CREATE POLICY "workspace_modules_select" ON public.workspace_modules
  FOR SELECT TO authenticated
  USING (
    workspace_id = get_my_workspace_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_platform_admin = true
    )
  );

-- INSERT: own workspace OR platform admin
CREATE POLICY "workspace_modules_insert" ON public.workspace_modules
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = get_my_workspace_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_platform_admin = true
    )
  );

-- UPDATE: own workspace OR platform admin
CREATE POLICY "workspace_modules_update" ON public.workspace_modules
  FOR UPDATE TO authenticated
  USING (
    workspace_id = get_my_workspace_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_platform_admin = true
    )
  )
  WITH CHECK (
    workspace_id = get_my_workspace_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_platform_admin = true
    )
  );

-- DELETE: own workspace OR platform admin
CREATE POLICY "workspace_modules_delete" ON public.workspace_modules
  FOR DELETE TO authenticated
  USING (
    workspace_id = get_my_workspace_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_platform_admin = true
    )
  );