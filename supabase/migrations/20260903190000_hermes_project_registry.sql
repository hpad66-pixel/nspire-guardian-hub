-- Workspace-native project registry for Proj OS agents.
--
-- Every project receives a durable workspace_id derived from its property,
-- client, creator, parent, or an explicitly supplied workspace. Hermes and
-- other MCP clients can therefore discover present and future projects with a
-- single tenant-scoped query; no per-project connection record is required.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS projects_workspace_updated_idx
  ON public.projects(workspace_id, updated_at DESC);

UPDATE public.projects p
SET workspace_id = COALESCE(
  (SELECT pr.workspace_id FROM public.properties pr WHERE pr.id = p.property_id),
  (SELECT c.workspace_id FROM public.clients c WHERE c.id = p.client_id),
  (SELECT pf.workspace_id FROM public.profiles pf WHERE pf.user_id = p.created_by)
)
WHERE p.workspace_id IS NULL;

-- Program records created by earlier Glorieta-style seed migrations may be
-- intentionally property-less and creator-less. A program key is a valid
-- tenant anchor only when every already-anchored member agrees on exactly one
-- workspace, preventing accidental cross-tenant inference.
WITH program_workspaces AS (
  SELECT
    program_meta->>'program_key' AS program_key,
    min(workspace_id::text)::uuid AS workspace_id
  FROM public.projects
  WHERE workspace_id IS NOT NULL
    AND NULLIF(program_meta->>'program_key', '') IS NOT NULL
  GROUP BY program_meta->>'program_key'
  HAVING count(DISTINCT workspace_id) = 1
)
UPDATE public.projects p
SET workspace_id = program_workspaces.workspace_id
FROM program_workspaces
WHERE p.workspace_id IS NULL
  AND p.program_meta->>'program_key' = program_workspaces.program_key;

-- Resolve descendants whose only reliable tenant anchor is their parent.
WITH RECURSIVE resolved AS (
  SELECT p.id, p.workspace_id, ARRAY[p.id] AS path
  FROM public.projects p
  WHERE p.workspace_id IS NOT NULL
  UNION ALL
  SELECT child.id, parent.workspace_id, parent.path || child.id
  FROM resolved parent
  JOIN public.projects child ON child.parent_project_id = parent.id
  WHERE child.workspace_id IS NULL
    AND NOT child.id = ANY(parent.path)
), inherited AS (
  SELECT DISTINCT ON (id) id, workspace_id
  FROM resolved
  ORDER BY id, array_length(path, 1)
)
UPDATE public.projects p
SET workspace_id = inherited.workspace_id
FROM inherited
WHERE p.id = inherited.id
  AND p.workspace_id IS NULL;

-- Do not allow a partial registry. If an old project has no property, client,
-- creator profile, parent, or explicit tenant, the migration must stop so the
-- record can be repaired instead of silently disappearing from Hermes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.projects WHERE workspace_id IS NULL) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23502',
      MESSAGE = 'Every project must have a workspace before enabling the Hermes registry';
  END IF;
END;
$$;

ALTER TABLE public.projects ALTER COLUMN workspace_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_project_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_workspace uuid;
  v_client_workspace uuid;
  v_creator_workspace uuid;
  v_parent_workspace uuid;
  v_program_workspace uuid;
  v_derived_workspace uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A project cannot be moved to another workspace';
  END IF;

  IF NEW.property_id IS NOT NULL THEN
    SELECT workspace_id INTO v_property_workspace
    FROM public.properties WHERE id = NEW.property_id;
  END IF;

  IF NEW.client_id IS NOT NULL THEN
    SELECT workspace_id INTO v_client_workspace
    FROM public.clients WHERE id = NEW.client_id;
  END IF;

  IF NEW.created_by IS NOT NULL THEN
    SELECT workspace_id INTO v_creator_workspace
    FROM public.profiles WHERE user_id = NEW.created_by;
  END IF;

  IF NEW.parent_project_id IS NOT NULL THEN
    SELECT workspace_id INTO v_parent_workspace
    FROM public.projects WHERE id = NEW.parent_project_id;
  END IF;

  IF NULLIF(NEW.program_meta->>'program_key', '') IS NOT NULL THEN
    SELECT min(p.workspace_id::text)::uuid INTO v_program_workspace
    FROM public.projects p
    WHERE p.workspace_id IS NOT NULL
      AND p.id IS DISTINCT FROM NEW.id
      AND p.program_meta->>'program_key' = NEW.program_meta->>'program_key'
    HAVING count(DISTINCT p.workspace_id) = 1;
  END IF;

  IF v_property_workspace IS NOT NULL AND v_client_workspace IS NOT NULL
     AND v_property_workspace <> v_client_workspace THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Project property and client must belong to the same workspace';
  END IF;
  IF v_property_workspace IS NOT NULL AND v_creator_workspace IS NOT NULL
     AND v_property_workspace <> v_creator_workspace THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Project creator and property must belong to the same workspace';
  END IF;
  IF v_client_workspace IS NOT NULL AND v_creator_workspace IS NOT NULL
     AND v_client_workspace <> v_creator_workspace THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Project creator and client must belong to the same workspace';
  END IF;

  v_derived_workspace := COALESCE(
    v_property_workspace,
    v_client_workspace,
    v_parent_workspace,
    v_creator_workspace,
    v_program_workspace,
    NEW.workspace_id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.workspace_id ELSE NULL END
  );

  IF v_parent_workspace IS NOT NULL AND v_derived_workspace <> v_parent_workspace THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Project and parent project must belong to the same workspace';
  END IF;
  IF v_program_workspace IS NOT NULL AND v_derived_workspace <> v_program_workspace THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Project program must belong to one workspace';
  END IF;
  IF NEW.workspace_id IS NOT NULL AND v_derived_workspace <> NEW.workspace_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Project workspace does not match its related records';
  END IF;
  IF TG_OP = 'INSERT' AND v_derived_workspace IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23502', MESSAGE = 'Project workspace could not be determined';
  END IF;

  NEW.workspace_id := v_derived_workspace;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_workspace ON public.projects;
CREATE TRIGGER trg_sync_project_workspace
  BEFORE INSERT OR UPDATE OF workspace_id, property_id, client_id, created_by, parent_project_id
  ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.sync_project_workspace();

-- Central access now recognizes the durable workspace anchor, including
-- master/standalone projects that have no property or client.
CREATE OR REPLACE FUNCTION public.can_access_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR (
      _user_id IS NOT NULL
      AND _project_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.projects pj
        LEFT JOIN public.properties pr ON pr.id = pj.property_id
        LEFT JOIN public.clients c ON c.id = pj.client_id
        LEFT JOIN public.profiles creator ON creator.user_id = pj.created_by
        JOIN public.profiles p ON p.user_id = _user_id
        WHERE pj.id = _project_id
          AND p.workspace_id = COALESCE(pj.workspace_id, pr.workspace_id, c.workspace_id, creator.workspace_id)
          AND COALESCE(p.status, 'active') = 'active'
          AND (
            (pj.property_id IS NOT NULL AND public.can_access_property(_user_id, pj.property_id))
            OR (pj.property_id IS NULL AND public.is_workspace_admin(_user_id))
            OR (pj.client_id IS NOT NULL AND p.client_id = pj.client_id)
            OR EXISTS (
              SELECT 1
              FROM public.project_team_members ptm
              WHERE ptm.project_id = pj.id
                AND ptm.user_id = _user_id
            )
          )
      )
    );
$$;

-- The enterprise restrictive policies already call can_access_project(). This
-- permissive policy replaces the legacy property/client-only admission path so
-- activity posted by Telegram is also visible on standalone/master projects.
DROP POLICY IF EXISTS project_communications_workspace_all ON public.project_communications;
CREATE POLICY project_communications_workspace_all
  ON public.project_communications
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (public.can_access_project(auth.uid(), project_id))
  WITH CHECK (public.can_access_project(auth.uid(), project_id));

-- Transactional write used by the agent API. A single request can log an
-- internal project update, publish/draft a client-portal briefing, and change
-- project status. If any destination fails, none of them are committed.
CREATE OR REPLACE FUNCTION public.agent_post_project_update(
  p_tenant_id uuid,
  p_project_id uuid,
  p_actor_user_id uuid,
  p_project_update_id uuid,
  p_client_update_id uuid,
  p_destination text,
  p_title text,
  p_summary text,
  p_update_type text DEFAULT 'general',
  p_period_label text DEFAULT NULL,
  p_health text DEFAULT 'on_track',
  p_accomplishments jsonb DEFAULT '[]'::jsonb,
  p_risks jsonb DEFAULT '[]'::jsonb,
  p_decisions jsonb DEFAULT '[]'::jsonb,
  p_action_items jsonb DEFAULT '[]'::jsonb,
  p_next_steps jsonb DEFAULT '[]'::jsonb,
  p_client_update_status text DEFAULT 'draft',
  p_project_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_update_id uuid;
  v_client_update_id uuid;
BEGIN
  IF p_destination NOT IN ('project', 'client_portal', 'both') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid project update destination';
  END IF;
  IF NULLIF(btrim(p_title), '') IS NULL OR NULLIF(btrim(p_summary), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Project update title and summary are required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id AND p.workspace_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Project is outside the agent workspace';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = p_actor_user_id
      AND p.workspace_id = p_tenant_id
      AND COALESCE(p.status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Agent actor is outside the project workspace';
  END IF;
  IF p_project_status IS NOT NULL
     AND p_project_status NOT IN ('planning', 'active', 'on_hold', 'completed', 'closed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid project status';
  END IF;
  IF p_update_type NOT IN ('general', 'progress', 'milestone', 'decision', 'risk')
     OR p_health NOT IN ('on_track', 'at_risk', 'delayed')
     OR p_client_update_status NOT IN ('draft', 'published') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid client update classification';
  END IF;
  IF jsonb_typeof(COALESCE(p_accomplishments, '[]'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(p_risks, '[]'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(p_decisions, '[]'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(p_action_items, '[]'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(p_next_steps, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Project update collections must be arrays';
  END IF;

  IF p_project_status IS NOT NULL THEN
    UPDATE public.projects
    SET status = p_project_status::public.project_status
    WHERE id = p_project_id AND workspace_id = p_tenant_id;
  END IF;

  IF p_destination IN ('project', 'both') THEN
    IF p_project_update_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Project update id is required';
    END IF;
    INSERT INTO public.project_communications (
      id, project_id, type, subject, content, participants, created_by
    ) VALUES (
      p_project_update_id,
      p_project_id,
      'note',
      '__uiType:note|' || btrim(p_title),
      btrim(p_summary),
      ARRAY['Hermes · Telegram'],
      p_actor_user_id
    )
    ON CONFLICT (id) DO NOTHING;
    v_project_update_id := p_project_update_id;
  END IF;

  IF p_destination IN ('client_portal', 'both') THEN
    IF p_client_update_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Client update id is required';
    END IF;
    INSERT INTO public.client_updates (
      id, tenant_id, project_id, title, update_type, period_label, health,
      summary, accomplishments, risks, decisions, action_items, next_steps,
      status, published_at, created_by
    ) VALUES (
      p_client_update_id,
      p_tenant_id,
      p_project_id,
      btrim(p_title),
      p_update_type,
      p_period_label,
      p_health,
      btrim(p_summary),
      COALESCE(p_accomplishments, '[]'::jsonb),
      COALESCE(p_risks, '[]'::jsonb),
      COALESCE(p_decisions, '[]'::jsonb),
      COALESCE(p_action_items, '[]'::jsonb),
      COALESCE(p_next_steps, '[]'::jsonb),
      p_client_update_status,
      CASE WHEN p_client_update_status = 'published' THEN now() ELSE NULL END,
      p_actor_user_id
    )
    ON CONFLICT (id) DO NOTHING;
    v_client_update_id := p_client_update_id;
  END IF;

  RETURN jsonb_build_object(
    'project_id', p_project_id,
    'destination', p_destination,
    'project_update_id', v_project_update_id,
    'client_update_id', v_client_update_id,
    'client_update_status', CASE
      WHEN p_destination IN ('client_portal', 'both') THEN p_client_update_status
      ELSE NULL
    END,
    'project_status', p_project_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.agent_post_project_update(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text,
  jsonb, jsonb, jsonb, jsonb, jsonb, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_post_project_update(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text,
  jsonb, jsonb, jsonb, jsonb, jsonb, text, text
) TO service_role;

-- Existing Hermes/agent OAuth clients gain the registry/update scopes on their
-- next token exchange. The project list remains live and needs no future grants.
UPDATE public.api_clients
SET scopes = (
  SELECT COALESCE(array_agg(DISTINCT scope_name), '{}'::text[])
  FROM unnest(
    COALESCE(scopes, '{}'::text[])
    || ARRAY['read:project-updates', 'write:project-updates']
  ) AS scope_name
)
WHERE is_active = true
  AND revoked_at IS NULL
  AND (
    name ~* '(hermes|proj.?os|mcp|agent)'
    OR scopes && ARRAY['read:projects', 'write:projects', 'read:client-updates']::text[]
  );

NOTIFY pgrst, 'reload schema';
