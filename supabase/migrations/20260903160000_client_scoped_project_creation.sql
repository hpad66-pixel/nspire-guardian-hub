-- Client-scoped project administration.
--
-- Workspace administrators keep their portfolio-wide controls. A user assigned
-- to a client through profiles.client_id can see that client's projects; users
-- with an operational client role may also create and edit standalone projects
-- for that client. Client administrators cannot create work under another
-- client, attach a project to a property they do not administer, or delete a
-- project. Those safeguards remain server-enforced through restrictive RLS.

CREATE OR REPLACE FUNCTION public.is_client_member(
  _user_id uuid,
  _client_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
    AND _client_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.clients c
      JOIN public.profiles p
        ON p.user_id = _user_id
       AND p.workspace_id = c.workspace_id
       AND p.client_id = c.id
      WHERE c.id = _client_id
        AND COALESCE(p.status, 'active') = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_client_projects(
  _user_id uuid,
  _client_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.clients c
      JOIN public.profiles p
        ON p.user_id = _user_id
       AND p.workspace_id = c.workspace_id
      WHERE c.id = _client_id
        AND COALESCE(p.status, 'active') = 'active'
        AND (
          public.is_workspace_admin(_user_id)
          OR (
            p.client_id = c.id
            AND EXISTS (
              SELECT 1
              FROM public.user_roles ur
              WHERE ur.user_id = _user_id
                AND ur.role IN ('owner', 'manager', 'administrator', 'project_manager')
            )
          )
        )
    );
$$;

-- Add client membership to the central project access predicate. This keeps
-- every downstream project-child policy aligned without opening other clients.
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
          AND p.workspace_id = COALESCE(pr.workspace_id, c.workspace_id, creator.workspace_id)
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

CREATE OR REPLACE FUNCTION public.effective_project_permission(
  _user_id uuid,
  _project_id uuid,
  _module text,
  _action text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property uuid;
  v_client uuid;
BEGIN
  IF NOT public.can_access_project(_user_id, _project_id) THEN
    RETURN false;
  END IF;
  IF public.is_workspace_admin(_user_id) THEN
    RETURN true;
  END IF;

  SELECT property_id, client_id
    INTO v_property, v_client
  FROM public.projects
  WHERE id = _project_id;

  IF v_property IS NOT NULL THEN
    RETURN public.effective_property_permission(_user_id, v_property, _module, _action);
  END IF;

  IF v_client IS NOT NULL AND public.is_client_member(_user_id, v_client) THEN
    IF _action = 'view' THEN
      RETURN true;
    END IF;
    IF _action = 'edit' THEN
      RETURN public.can_manage_client_projects(_user_id, v_client);
    END IF;
    RETURN false;
  END IF;

  -- Direct standalone-project members remain read-only.
  RETURN _action = 'view';
END;
$$;

-- The enterprise client read boundary now admits the user's assigned client,
-- even before that client has its first project.
DROP POLICY IF EXISTS enterprise_clients_scope ON public.clients;
CREATE POLICY enterprise_clients_scope ON public.clients AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    public.is_workspace_admin(auth.uid())
    OR public.is_client_member(auth.uid(), id)
    OR EXISTS (
      SELECT 1
      FROM public.projects pj
      WHERE pj.client_id = clients.id
        AND public.can_access_project(auth.uid(), pj.id)
    )
  );

-- Existing permissive project policies still enforce workspace ownership.
-- These restrictive policies add the role/action boundary for client projects.
DROP POLICY IF EXISTS enterprise_project_scope ON public.projects;
CREATE POLICY enterprise_project_scope ON public.projects AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_super_admin()
    OR public.is_workspace_admin(auth.uid())
    OR public.can_access_project(auth.uid(), id)
  )
  WITH CHECK (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_super_admin()
    OR public.is_workspace_admin(auth.uid())
    OR (
      property_id IS NOT NULL
      AND public.effective_property_permission(auth.uid(), property_id, 'projects', 'create')
    )
    OR (
      property_id IS NULL
      AND client_id IS NOT NULL
      AND public.can_manage_client_projects(auth.uid(), client_id)
    )
  );

DROP POLICY IF EXISTS enterprise_project_insert_permission ON public.projects;
CREATE POLICY enterprise_project_insert_permission ON public.projects AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_workspace_admin(auth.uid())
    OR (
      property_id IS NOT NULL
      AND public.effective_property_permission(auth.uid(), property_id, 'projects', 'create')
    )
    OR (
      property_id IS NULL
      AND client_id IS NOT NULL
      AND public.can_manage_client_projects(auth.uid(), client_id)
    )
  );

DROP POLICY IF EXISTS enterprise_project_update_permission ON public.projects;
CREATE POLICY enterprise_project_update_permission ON public.projects AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_workspace_admin(auth.uid())
    OR public.effective_project_permission(auth.uid(), id, 'projects', 'edit')
  )
  WITH CHECK (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_workspace_admin(auth.uid())
    OR (
      property_id IS NOT NULL
      AND public.effective_property_permission(auth.uid(), property_id, 'projects', 'edit')
    )
    OR (
      property_id IS NULL
      AND client_id IS NOT NULL
      AND public.can_manage_client_projects(auth.uid(), client_id)
    )
  );

-- Client project writes use narrowly-scoped SECURITY DEFINER functions rather
-- than broad table grants. The functions derive the tenant boundary from the
-- authenticated user and never accept property_id, created_by, or spent from
-- the browser.
CREATE OR REPLACE FUNCTION public.create_client_project(
  p_client_id uuid,
  p_name text,
  p_project_type text DEFAULT 'construction',
  p_description text DEFAULT NULL,
  p_scope text DEFAULT NULL,
  p_budget numeric DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_target_end_date date DEFAULT NULL,
  p_status public.project_status DEFAULT 'planning'
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.projects;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required';
  END IF;

  IF NOT public.can_manage_client_projects(auth.uid(), p_client_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to create projects for this client';
  END IF;

  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Project name is required';
  END IF;

  IF p_project_type NOT IN ('construction', 'consulting') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Client projects must be construction or consulting projects';
  END IF;

  INSERT INTO public.projects (
    client_id,
    property_id,
    name,
    project_type,
    description,
    scope,
    budget,
    start_date,
    target_end_date,
    status,
    created_by
  )
  VALUES (
    p_client_id,
    NULL,
    btrim(p_name),
    p_project_type,
    p_description,
    p_scope,
    p_budget,
    p_start_date,
    p_target_end_date,
    COALESCE(p_status, 'planning'),
    auth.uid()
  )
  RETURNING * INTO v_project;

  RETURN v_project;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_client_project(
  p_project_id uuid,
  p_name text,
  p_project_type text,
  p_description text DEFAULT NULL,
  p_scope text DEFAULT NULL,
  p_budget numeric DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_target_end_date date DEFAULT NULL,
  p_status public.project_status DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.projects;
  v_project public.projects;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required';
  END IF;

  SELECT * INTO v_existing
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND
     OR v_existing.client_id IS NULL
     OR v_existing.property_id IS NOT NULL
     OR NOT public.can_manage_client_projects(auth.uid(), v_existing.client_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to update this client project';
  END IF;

  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Project name is required';
  END IF;

  IF p_project_type NOT IN ('construction', 'consulting') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Client projects must be construction or consulting projects';
  END IF;

  UPDATE public.projects
  SET name = btrim(p_name),
      project_type = p_project_type,
      description = p_description,
      scope = p_scope,
      budget = p_budget,
      start_date = p_start_date,
      target_end_date = p_target_end_date,
      status = COALESCE(p_status, v_existing.status)
  WHERE id = p_project_id
  RETURNING * INTO v_project;

  RETURN v_project;
END;
$$;

-- A small, read-only capability RPC keeps the UI aligned with the database.
CREATE OR REPLACE FUNCTION public.get_client_project_access(p_client_id uuid)
RETURNS TABLE (
  can_view boolean,
  can_create boolean,
  can_edit boolean,
  can_delete boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_workspace_admin(auth.uid()) OR public.is_client_member(auth.uid(), p_client_id),
    public.can_manage_client_projects(auth.uid(), p_client_id),
    public.can_manage_client_projects(auth.uid(), p_client_id),
    public.is_workspace_admin(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_client_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_client_projects(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_client_project(uuid, text, text, text, text, numeric, date, date, public.project_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_client_project(uuid, text, text, text, text, numeric, date, date, public.project_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_client_project_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_client_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_client_projects(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_client_project(uuid, text, text, text, text, numeric, date, date, public.project_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_project(uuid, text, text, text, text, numeric, date, date, public.project_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_project_access(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
