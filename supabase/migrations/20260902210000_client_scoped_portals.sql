-- Client-scoped owner portals.
--
-- A client (e.g. R4 Capital) must see every one of their projects from any
-- single portal link — including jobs that do not yet have a prime contract.
-- Previously owner access and portal context were prime-contract-gated, so
-- Stormdrain / consulting work never appeared on the client side.

-- 1) Portals can belong to a client, not only a single project.
ALTER TABLE public.client_portals
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS client_portals_client_id_idx
  ON public.client_portals (client_id)
  WHERE client_id IS NOT NULL AND status <> 'archived';

-- 2) Resolve the owner organization for invitations even when THIS project
--    has no prime contract yet (use a sibling job, then name match).
CREATE OR REPLACE FUNCTION public.resolve_owner_org_for_project(p_project_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT pc.owner_org_id
      FROM public.prime_contracts pc
      WHERE pc.project_id = p_project_id
        AND pc.owner_org_id IS NOT NULL
      ORDER BY pc.updated_at DESC NULLS LAST
      LIMIT 1
    ),
    (
      SELECT pc.owner_org_id
      FROM public.projects target
      JOIN public.projects sibling
        ON sibling.client_id IS NOT NULL
       AND sibling.client_id = target.client_id
       AND sibling.id <> target.id
      JOIN public.prime_contracts pc
        ON pc.project_id = sibling.id
       AND pc.owner_org_id IS NOT NULL
      WHERE target.id = p_project_id
      ORDER BY pc.updated_at DESC NULLS LAST
      LIMIT 1
    ),
    (
      SELECT o.id
      FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      JOIN public.organizations o
        ON o.tenant_id = COALESCE(c.workspace_id, public.current_tenant_id())
       AND lower(trim(o.name)) = lower(trim(c.name))
      WHERE p.id = p_project_id
      LIMIT 1
    )
  );
$$;

REVOKE ALL ON FUNCTION public.resolve_owner_org_for_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_owner_org_for_project(uuid) TO authenticated;

-- 3) Owner access is client-scoped: a contract on any sibling project, or an
--    organization whose name matches the project's client, is enough.
CREATE OR REPLACE FUNCTION public.owner_can_access_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_portal_kind() = 'owner'
    AND (
      EXISTS (
        SELECT 1 FROM public.prime_contracts pc
        WHERE pc.project_id = p_project_id
          AND pc.tenant_id = public.current_portal_tenant_id()
          AND pc.owner_org_id = ANY(public.current_user_orgs())
      )
      OR EXISTS (
        SELECT 1
        FROM public.projects target
        JOIN public.projects sibling
          ON sibling.client_id IS NOT NULL
         AND sibling.client_id = target.client_id
         AND sibling.id IS DISTINCT FROM target.id
        JOIN public.prime_contracts pc
          ON pc.project_id = sibling.id
         AND pc.tenant_id = public.current_portal_tenant_id()
         AND pc.owner_org_id = ANY(public.current_user_orgs())
        WHERE target.id = p_project_id
          AND target.client_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        JOIN public.clients c ON c.id = p.client_id
        JOIN public.organizations o
          ON o.tenant_id = public.current_portal_tenant_id()
         AND o.id = ANY(public.current_user_orgs())
         AND lower(trim(o.name)) = lower(trim(c.name))
        WHERE p.id = p_project_id
      )
    );
$$;

-- 4) Portal branding must work for projects without a prime contract.
DROP FUNCTION IF EXISTS public.get_owner_portal_context(uuid);
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
  SELECT p.id,
         p.name,
         p.status::text,
         cp.name,
         COALESCE(cp.client_name, cl.name),
         cp.brand_logo_url,
         cp.brand_accent_color,
         cp.portal_slug
  FROM public.projects p
  LEFT JOIN public.clients cl ON cl.id = p.client_id
  LEFT JOIN public.client_portals cp
    ON cp.is_active = true
   AND cp.status <> 'archived'
   AND (
     cp.project_id = p.id
     OR (cp.client_id IS NOT NULL AND cp.client_id = p.client_id)
   )
  WHERE (
      public.owner_can_access_project(p.id)
      OR (
        public.current_portal_kind() = 'main'
        AND (
          public.is_super_admin()
          OR EXISTS (
            SELECT 1 FROM public.properties pr
            WHERE pr.id = p.property_id
              AND pr.workspace_id = public.current_tenant_id()
          )
          OR EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = p.client_id
              AND c.workspace_id = public.current_tenant_id()
          )
        )
      )
      OR public.is_super_admin()
    )
    AND (p_project_id IS NULL OR p.id = p_project_id)
  ORDER BY
    CASE WHEN cp.project_id = p.id THEN 0 ELSE 1 END,
    cp.updated_at DESC NULLS LAST,
    p.updated_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_owner_portal_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_portal_context(uuid) TO authenticated;

-- 5) Auto-provision: resolve workspace from property, client, or creator, and
--    stamp client_id so sibling projects share a portal identity.
CREATE OR REPLACE FUNCTION public.auto_provision_client_portal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ws   uuid;
  v_slug text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.client_portals
    WHERE project_id = NEW.id AND status <> 'archived'
  ) THEN
    UPDATE public.client_portals
    SET client_id = COALESCE(client_id, NEW.client_id)
    WHERE project_id = NEW.id AND NEW.client_id IS NOT NULL;
    RETURN NEW;
  END IF;

  v_ws := COALESCE(
    (SELECT workspace_id FROM public.properties WHERE id = NEW.property_id),
    (SELECT workspace_id FROM public.clients WHERE id = NEW.client_id),
    (SELECT workspace_id FROM public.profiles WHERE user_id = NEW.created_by),
    public.current_tenant_id()
  );
  IF v_ws IS NULL THEN
    RETURN NEW;
  END IF;

  v_slug := trim(both '-' from lower(regexp_replace(coalesce(NEW.name, 'project'), '[^a-zA-Z0-9]+', '-', 'g')))
            || '-' || left(replace(NEW.id::text, '-', ''), 8);

  INSERT INTO public.client_portals
    (workspace_id, project_id, client_id, portal_type, name, client_name, portal_slug, status, is_active, brand_accent_color, shared_modules, created_by)
  VALUES
    (
      v_ws,
      NEW.id,
      NEW.client_id,
      'client',
      coalesce(NEW.name, 'Project'),
      (SELECT name FROM public.clients WHERE id = NEW.client_id),
      v_slug,
      'active',
      true,
      '#1D6FE8',
      '{}',
      NEW.created_by
    )
  ON CONFLICT (portal_slug) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

-- 6) Attach R4 Capital (and similarly named owner) projects to one client so
--    Stormdrain, Conveyance, Stucco, and the rest share a portal.
DO $$
DECLARE
  v_ws uuid;
  v_client uuid;
  v_r4_ids uuid[] := ARRAY[
    'dd68476b-542f-4ddf-9d22-8052a1a84c04'::uuid,
    '124bf1b5-d313-4d4e-aaea-73b861ba71a6'::uuid,
    '9420b571-3383-4bd0-a64f-096634dd1ade'::uuid,
    '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d'::uuid
  ];
BEGIN
  SELECT COALESCE(
    (
      SELECT pr.workspace_id
      FROM public.projects p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE p.id = ANY (v_r4_ids) AND pr.workspace_id IS NOT NULL
      LIMIT 1
    ),
    (
      SELECT c.workspace_id
      FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = ANY (v_r4_ids) AND c.workspace_id IS NOT NULL
      LIMIT 1
    ),
    (
      SELECT cp.workspace_id
      FROM public.client_portals cp
      WHERE cp.project_id = ANY (v_r4_ids)
      LIMIT 1
    ),
    (
      SELECT o.tenant_id
      FROM public.organizations o
      WHERE o.name ILIKE '%R4%'
      ORDER BY CASE WHEN o.name ILIKE 'R4 Capital%' THEN 0 ELSE 1 END
      LIMIT 1
    )
  ) INTO v_ws;

  IF v_ws IS NULL THEN
    RAISE NOTICE 'client-scoped portals: no workspace found for R4 backfill';
    RETURN;
  END IF;

  SELECT c.id INTO v_client
  FROM public.clients c
  WHERE c.workspace_id = v_ws
    AND (c.name ILIKE 'R4 Capital%' OR c.name ILIKE 'R4 %' OR c.name ILIKE '%R4 Capital%')
  ORDER BY CASE WHEN c.name ILIKE 'R4 Capital%' THEN 0 ELSE 1 END, c.created_at
  LIMIT 1;

  IF v_client IS NULL THEN
    INSERT INTO public.clients (name, workspace_id, client_type, contact_email)
    VALUES ('R4 Capital', v_ws, 'business_client', 'csullivan@r4cap.com')
    RETURNING id INTO v_client;
  END IF;

  UPDATE public.projects p
  SET client_id = v_client,
      updated_at = now()
  WHERE (p.client_id IS NULL OR p.client_id IS DISTINCT FROM v_client)
    AND (
      p.id = ANY (v_r4_ids)
      OR p.name ILIKE '%stormdrain%'
      OR p.name ILIKE '%storm drain%'
      OR p.name ILIKE '%stormwater clean%'
      OR EXISTS (
        SELECT 1 FROM public.prime_contracts pc
        WHERE pc.project_id = p.id
          AND (
            pc.owner_name ILIKE '%R4%'
            OR pc.owner_name ILIKE '%Glorieta Partners%'
            OR pc.owner_name ILIKE '%R4 GGOL%'
          )
      )
    );

  -- Children of attached R4 parents.
  UPDATE public.projects p
  SET client_id = v_client,
      updated_at = now()
  WHERE p.client_id IS DISTINCT FROM v_client
    AND p.parent_project_id IN (SELECT id FROM public.projects WHERE client_id = v_client);
END $$;

-- 7) Stamp client_id onto existing portals and provision any missing rows.
UPDATE public.client_portals cp
SET client_id = p.client_id,
    client_name = COALESCE(cp.client_name, c.name),
    portal_type = 'client'
FROM public.projects p
LEFT JOIN public.clients c ON c.id = p.client_id
WHERE cp.project_id = p.id
  AND p.client_id IS NOT NULL
  AND (cp.client_id IS DISTINCT FROM p.client_id OR cp.client_name IS NULL);

INSERT INTO public.client_portals
  (workspace_id, project_id, client_id, portal_type, name, client_name, portal_slug, status, is_active, brand_accent_color, shared_modules, created_by)
SELECT
  w.ws,
  p.id,
  p.client_id,
  'client',
  coalesce(p.name, 'Project'),
  c.name,
  trim(both '-' from lower(regexp_replace(coalesce(p.name, 'project'), '[^a-zA-Z0-9]+', '-', 'g')))
    || '-' || left(replace(p.id::text, '-', ''), 8),
  'active',
  true,
  '#1D6FE8',
  '{}',
  p.created_by
FROM public.projects p
LEFT JOIN public.clients c ON c.id = p.client_id
CROSS JOIN LATERAL (
  SELECT COALESCE(
    (SELECT workspace_id FROM public.properties WHERE id = p.property_id),
    (SELECT workspace_id FROM public.clients WHERE id = p.client_id),
    (SELECT workspace_id FROM public.profiles WHERE user_id = p.created_by),
    (SELECT workspace_id FROM public.client_portals WHERE project_id = p.id LIMIT 1)
  ) AS ws
) w
WHERE w.ws IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.client_portals cp
    WHERE cp.project_id = p.id AND cp.status <> 'archived'
  )
ON CONFLICT (portal_slug) DO NOTHING;

-- 8) One canonical slug per client (e.g. /portal/r4-capital) that lands on
--    the same multi-project owner portal as any of that client's project links.
INSERT INTO public.client_portals
  (workspace_id, project_id, client_id, portal_type, name, client_name, portal_slug, status, is_active, brand_accent_color, shared_modules, created_by)
SELECT
  c.workspace_id,
  (
    SELECT p.id FROM public.projects p
    WHERE p.client_id = c.id
    ORDER BY p.updated_at DESC NULLS LAST
    LIMIT 1
  ),
  c.id,
  'client',
  c.name || ' portal',
  c.name,
  left(trim(both '-' from lower(regexp_replace(c.name, '[^a-zA-Z0-9]+', '-', 'g'))), 60),
  'active',
  true,
  '#1D6FE8',
  '{}',
  COALESCE(
    (
      SELECT p.created_by FROM public.projects p
      WHERE p.client_id = c.id AND p.created_by IS NOT NULL
      LIMIT 1
    ),
    (
      SELECT cp.created_by FROM public.client_portals cp
      WHERE cp.workspace_id = c.workspace_id
      LIMIT 1
    )
  )
FROM public.clients c
WHERE c.workspace_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.projects p WHERE p.client_id = c.id)
  AND COALESCE(
    (SELECT p.created_by FROM public.projects p WHERE p.client_id = c.id AND p.created_by IS NOT NULL LIMIT 1),
    (SELECT cp.created_by FROM public.client_portals cp WHERE cp.workspace_id = c.workspace_id LIMIT 1)
  ) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.client_portals cp
    WHERE cp.client_id = c.id
      AND cp.portal_slug = left(trim(both '-' from lower(regexp_replace(c.name, '[^a-zA-Z0-9]+', '-', 'g'))), 60)
      AND cp.status <> 'archived'
  )
ON CONFLICT (portal_slug) DO UPDATE
SET client_id = EXCLUDED.client_id,
    client_name = COALESCE(public.client_portals.client_name, EXCLUDED.client_name),
    portal_type = 'client',
    is_active = true,
    status = CASE WHEN public.client_portals.status = 'archived' THEN 'active' ELSE public.client_portals.status END;
