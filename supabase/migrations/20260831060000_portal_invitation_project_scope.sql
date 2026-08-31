-- Owner portal invitations and public brand must carry project_id so every
-- client lands on THEIR project (/owner-portal/projects/:id), not contracts[0].

ALTER TABLE public.portal_invitations
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS portal_invitations_project_id_idx
  ON public.portal_invitations(project_id)
  WHERE project_id IS NOT NULL;

-- Backfill from the portal that shares the same owner org + tenant when possible.
UPDATE public.portal_invitations pi
SET project_id = cp.project_id
FROM public.client_portals cp
JOIN public.prime_contracts pc
  ON pc.project_id = cp.project_id
 AND pc.tenant_id = cp.workspace_id
WHERE pi.project_id IS NULL
  AND pi.portal_kind = 'owner'
  AND pi.organization_id IS NOT NULL
  AND pc.owner_org_id = pi.organization_id
  AND cp.workspace_id = pi.tenant_id
  AND cp.project_id IS NOT NULL;

-- Public brand RPC: expose project_id so magic-link redirects are project-scoped.
CREATE OR REPLACE FUNCTION public.get_public_portal_brand(p_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  client_name text,
  brand_logo_url text,
  brand_accent_color text,
  portal_slug text,
  is_active boolean,
  status text,
  project_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.id, cp.name, cp.client_name, cp.brand_logo_url,
         cp.brand_accent_color, cp.portal_slug, cp.is_active, cp.status,
         cp.project_id
  FROM public.client_portals cp
  WHERE cp.portal_slug = p_slug
    AND cp.is_active = true
    AND cp.status <> 'archived'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_portal_brand(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_portal_brand(text) TO anon, authenticated;
