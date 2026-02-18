
-- Allow any authenticated user to VIEW company branding
-- (needed so portal clients see the contractor's logo, color, and company name)
DROP POLICY IF EXISTS "Users manage own branding" ON public.company_branding;
DROP POLICY IF EXISTS "Workspace members can view branding" ON public.company_branding;
DROP POLICY IF EXISTS "Workspace admins can manage branding" ON public.company_branding;

-- READ: any authenticated user can see any branding row
CREATE POLICY "Authenticated users can view branding"
ON public.company_branding FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- WRITE: only the owner user can modify their branding row
CREATE POLICY "Owners can manage own branding"
ON public.company_branding FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
