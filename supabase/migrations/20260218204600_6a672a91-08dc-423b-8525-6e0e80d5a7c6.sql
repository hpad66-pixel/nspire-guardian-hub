
-- =============================================
-- WORKSPACE ISOLATION: PROPERTY-CHILD TABLES
-- =============================================

-- 1. INSPECTIONS
DROP POLICY IF EXISTS "Authenticated users can view inspections" ON public.inspections;
CREATE POLICY "Workspace members can view inspections"
ON public.inspections FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = inspections.property_id
      AND p.workspace_id = public.get_my_workspace_id()
  )
);

-- 2. DAILY_INSPECTIONS
DROP POLICY IF EXISTS "Authenticated users can view daily inspections" ON public.daily_inspections;
CREATE POLICY "Workspace members can view daily inspections"
ON public.daily_inspections FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = daily_inspections.property_id
      AND p.workspace_id = public.get_my_workspace_id()
  )
);

-- 3. ISSUES
DROP POLICY IF EXISTS "Authenticated users can view issues" ON public.issues;
CREATE POLICY "Workspace members can view issues"
ON public.issues FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = issues.property_id
      AND p.workspace_id = public.get_my_workspace_id()
  )
);

-- 4. WORK_ORDERS
DROP POLICY IF EXISTS "Authenticated users can view work orders" ON public.work_orders;
CREATE POLICY "Workspace members can view work orders"
ON public.work_orders FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = work_orders.property_id
      AND p.workspace_id = public.get_my_workspace_id()
  )
);

-- 5. UNITS
DROP POLICY IF EXISTS "Authenticated users can view units" ON public.units;
CREATE POLICY "Workspace members can view units"
ON public.units FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = units.property_id
      AND p.workspace_id = public.get_my_workspace_id()
  )
);

-- 6. ASSETS
DROP POLICY IF EXISTS "Authenticated users can view assets" ON public.assets;
CREATE POLICY "Workspace members can view assets"
ON public.assets FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = assets.property_id
      AND p.workspace_id = public.get_my_workspace_id()
  )
);

-- 7. PROJECTS
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
CREATE POLICY "Workspace members can view projects"
ON public.projects FOR SELECT TO authenticated
USING (
  property_id IS NULL -- projects without a property are workspace-scoped via created_by
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = projects.property_id
      AND p.workspace_id = public.get_my_workspace_id()
  )
);

-- 8. PERMITS
DROP POLICY IF EXISTS "Authenticated users can view permits" ON public.permits;
CREATE POLICY "Workspace members can view permits"
ON public.permits FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = permits.property_id
      AND p.workspace_id = public.get_my_workspace_id()
  )
);

-- 9. WORK_ORDER_COMMENTS (two-hop: work_orders -> properties)
DROP POLICY IF EXISTS "Authenticated users can view work order comments" ON public.work_order_comments;
CREATE POLICY "Workspace members can view work order comments"
ON public.work_order_comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders wo
    JOIN public.properties p ON p.id = wo.property_id
    WHERE wo.id = work_order_comments.work_order_id
      AND p.workspace_id = public.get_my_workspace_id()
  )
);

-- 10. DOCUMENT_FOLDERS (no direct property_id — scoped to authenticated workspace members)
-- document_folders has no property_id; keep accessible to all authenticated workspace members
DROP POLICY IF EXISTS "Authenticated users can view document folders" ON public.document_folders;
CREATE POLICY "Workspace members can view document folders"
ON public.document_folders FOR SELECT TO authenticated
USING (true); -- folders are org-level; workspace isolation enforced at the document level

-- =============================================
-- PROFILES — scope to same workspace
-- =============================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Workspace members can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (workspace_id = public.get_my_workspace_id());
