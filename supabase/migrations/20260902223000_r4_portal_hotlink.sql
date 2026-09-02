-- Hotfix: make /portal/r4-capital work, attach Glorieta to the R4 client
-- portfolio, and land every R4 portal link on a real project so post-login
-- tabs include Stormdrain + published client updates.

-- Public brand needs client_id so login can scope the multi-project tab strip
-- even before the authenticated client_portals row is readable.
DROP FUNCTION IF EXISTS public.get_public_portal_brand(text);

CREATE FUNCTION public.get_public_portal_brand(p_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  client_name text,
  brand_logo_url text,
  brand_accent_color text,
  portal_slug text,
  is_active boolean,
  status text,
  project_id uuid,
  client_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.id, cp.name, cp.client_name, cp.brand_logo_url,
         cp.brand_accent_color, cp.portal_slug, cp.is_active, cp.status,
         cp.project_id, cp.client_id
  FROM public.client_portals cp
  WHERE cp.portal_slug = p_slug
    AND cp.is_active = true
    AND cp.status <> 'archived'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_portal_brand(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_portal_brand(text) TO anon, authenticated;

DO $$
DECLARE
  v_client uuid;
  v_ws uuid;
  v_conveyance uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d'::uuid;
  v_stormdrain uuid := 'fca145fb-a18b-402c-b8f1-57954691489d'::uuid;
  v_created_by uuid;
  v_client_name text := 'R4 Capital LLC';
  v_r4_ids uuid[] := ARRAY[
    'dd68476b-542f-4ddf-9d22-8052a1a84c04'::uuid,
    '124bf1b5-d313-4d4e-aaea-73b861ba71a6'::uuid,
    '9420b571-3383-4bd0-a64f-096634dd1ade'::uuid,
    '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d'::uuid,
    'fca145fb-a18b-402c-b8f1-57954691489d'::uuid
  ];
BEGIN
  SELECT c.id, c.workspace_id, COALESCE(NULLIF(trim(c.name), ''), v_client_name)
    INTO v_client, v_ws, v_client_name
  FROM public.clients c
  WHERE c.id = '60c4c698-6e9d-43ff-841a-11ffa7d4a904'::uuid
     OR c.name ILIKE 'R4 Capital%'
  ORDER BY
    CASE WHEN c.id = '60c4c698-6e9d-43ff-841a-11ffa7d4a904'::uuid THEN 0 ELSE 1 END,
    CASE WHEN c.name ILIKE 'R4 Capital LLC%' THEN 0 ELSE 1 END,
    c.created_at
  LIMIT 1;

  IF v_client IS NULL THEN
    RAISE NOTICE 'r4 portal hotlink: R4 Capital client not found';
    RETURN;
  END IF;

  IF v_ws IS NULL THEN
    SELECT COALESCE(
      (SELECT cp.workspace_id FROM public.client_portals cp
        WHERE cp.portal_slug IN ('r4-capital-llc', 'glorieta', 'sewer-ext-project-4b168bb0')
        LIMIT 1),
      (SELECT pr.workspace_id
         FROM public.projects p
         JOIN public.properties pr ON pr.id = p.property_id
        WHERE p.id = ANY (v_r4_ids) AND pr.workspace_id IS NOT NULL
        LIMIT 1)
    ) INTO v_ws;
  END IF;

  IF v_ws IS NULL THEN
    RAISE NOTICE 'r4 portal hotlink: workspace not found';
    RETURN;
  END IF;

  -- Keep every R4 job on the same client (including Stormdrain).
  UPDATE public.projects p
  SET client_id = v_client,
      updated_at = now()
  WHERE (p.client_id IS DISTINCT FROM v_client)
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

  -- Prefer Conveyance as the shared landing project when it exists.
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_conveyance) THEN
    SELECT p.id INTO v_conveyance
    FROM public.projects p
    WHERE p.client_id = v_client
    ORDER BY
      CASE WHEN p.name ILIKE '%conveyance%' OR p.name ILIKE '%sewer%' THEN 0 ELSE 1 END,
      p.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  SELECT COALESCE(
    (SELECT created_by FROM public.client_portals
      WHERE portal_slug IN ('r4-capital-llc', 'glorieta', 'sewer-ext-project-4b168bb0')
        AND created_by IS NOT NULL
      LIMIT 1),
    (SELECT created_by FROM public.projects
      WHERE id = ANY (v_r4_ids) AND created_by IS NOT NULL
      LIMIT 1)
  ) INTO v_created_by;

  -- Stamp client_id on every portal already tied to an R4 project.
  UPDATE public.client_portals cp
  SET client_id = v_client,
      client_name = COALESCE(NULLIF(trim(cp.client_name), ''), v_client_name),
      portal_type = 'client',
      is_active = true,
      status = CASE WHEN cp.status = 'archived' THEN 'active' ELSE cp.status END,
      updated_at = now()
  WHERE cp.status <> 'archived'
    AND (
      cp.client_id = v_client
      OR cp.project_id IN (SELECT id FROM public.projects WHERE client_id = v_client)
      OR cp.portal_slug IN ('glorieta', 'r4-capital', 'r4-capital-llc')
    );

  -- Glorieta public link must land inside the R4 portfolio after login.
  UPDATE public.client_portals
  SET project_id = COALESCE(project_id, v_conveyance),
      client_id = v_client,
      client_name = v_client_name,
      portal_type = 'client',
      is_active = true,
      status = 'active',
      updated_at = now()
  WHERE portal_slug = 'glorieta';

  -- Existing auto slug used "R4 Capital LLC" → r4-capital-llc.
  UPDATE public.client_portals
  SET project_id = COALESCE(v_conveyance, project_id),
      client_id = v_client,
      client_name = v_client_name,
      portal_type = 'client',
      is_active = true,
      status = 'active',
      updated_at = now()
  WHERE portal_slug = 'r4-capital-llc';

  -- Ensure Stormdrain has an active portal row.
  IF v_stormdrain IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.projects WHERE id = v_stormdrain)
     AND NOT EXISTS (
       SELECT 1 FROM public.client_portals
       WHERE project_id = v_stormdrain AND status <> 'archived'
     )
     AND v_created_by IS NOT NULL
  THEN
    INSERT INTO public.client_portals (
      workspace_id, project_id, client_id, portal_type, name, client_name,
      portal_slug, status, is_active, brand_accent_color, shared_modules, created_by
    ) VALUES (
      v_ws,
      v_stormdrain,
      v_client,
      'client',
      'Stormdrain Maintenence',
      v_client_name,
      'stormdrain-maintenence-fca145fb',
      'active',
      true,
      '#1D6FE8',
      '{}',
      v_created_by
    )
    ON CONFLICT (portal_slug) DO UPDATE
    SET project_id = EXCLUDED.project_id,
        client_id = EXCLUDED.client_id,
        client_name = EXCLUDED.client_name,
        is_active = true,
        status = 'active',
        portal_type = 'client',
        updated_at = now();
  END IF;

  IF v_created_by IS NULL OR v_conveyance IS NULL THEN
    RAISE NOTICE 'r4 portal hotlink: missing created_by or landing project; skipped r4-capital insert';
    RETURN;
  END IF;

  -- Canonical short link users expect.
  INSERT INTO public.client_portals (
    workspace_id, project_id, client_id, portal_type, name, client_name,
    portal_slug, status, is_active, brand_accent_color, shared_modules, created_by
  ) VALUES (
    v_ws,
    v_conveyance,
    v_client,
    'client',
    v_client_name || ' portal',
    v_client_name,
    'r4-capital',
    'active',
    true,
    '#1D6FE8',
    '{}',
    v_created_by
  )
  ON CONFLICT (portal_slug) DO UPDATE
  SET project_id = COALESCE(EXCLUDED.project_id, public.client_portals.project_id),
      client_id = EXCLUDED.client_id,
      client_name = EXCLUDED.client_name,
      name = COALESCE(NULLIF(trim(public.client_portals.name), ''), EXCLUDED.name),
      portal_type = 'client',
      is_active = true,
      status = 'active',
      updated_at = now();
END $$;
