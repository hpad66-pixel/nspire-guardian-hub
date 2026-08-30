-- Scope owner-portal branding to a selected project. The zero-arg form is
-- replaced by a defaulted argument so existing rpc('get_owner_portal_context')
-- calls still work and land on the most recently updated accessible project.

DROP FUNCTION IF EXISTS public.get_owner_portal_context();

CREATE OR REPLACE FUNCTION public.get_owner_portal_context(p_project_id uuid DEFAULT NULL)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  project_status text,
  portal_name text,
  client_name text,
  brand_logo_url text,
  brand_accent_color text,
  portal_slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.status::text, cp.name, cp.client_name,
         cp.brand_logo_url, cp.brand_accent_color, cp.portal_slug
  FROM public.prime_contracts pc
  JOIN public.projects p ON p.id = pc.project_id
  LEFT JOIN public.client_portals cp
    ON cp.project_id = p.id AND cp.is_active = true AND cp.status <> 'archived'
  WHERE (
      public.owner_can_access_contract(pc.id)
      OR (public.current_portal_kind() = 'main' AND pc.tenant_id = public.current_tenant_id())
      OR public.is_super_admin()
    )
    AND (p_project_id IS NULL OR p.id = p_project_id)
  ORDER BY cp.updated_at DESC NULLS LAST, pc.updated_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_owner_portal_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_portal_context(uuid) TO authenticated;
