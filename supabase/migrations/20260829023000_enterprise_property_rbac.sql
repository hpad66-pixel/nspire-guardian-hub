-- Enterprise property-scoped RBAC
--
-- Workspace administrators are the only workspace-wide authority. Every other
-- operational role is attached to one or more properties and is evaluated at
-- the database boundary for both property and project records.

CREATE TABLE IF NOT EXISTS public.enterprise_permission_modules (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  sort_order integer NOT NULL,
  actions text[] NOT NULL DEFAULT ARRAY['view','create','edit','delete','approve','assign']::text[]
);

INSERT INTO public.enterprise_permission_modules (code, label, description, sort_order) VALUES
  ('overview', 'Project Overview', 'Dashboards, KPIs, milestones, and project summaries.', 10),
  ('properties', 'Property Records', 'Property profile, portfolio information, and operating details.', 20),
  ('projects', 'Projects', 'Projects, scopes, milestones, progress, and project setup.', 30),
  ('people', 'People & Access', 'Property team membership, assignments, and access administration.', 40),
  ('schedule', 'Schedule', 'Schedules, tasks, dependencies, and milestone controls.', 50),
  ('rfis', 'RFIs', 'Requests for information and response workflows.', 60),
  ('submittals', 'Submittals', 'Submittal registers, packages, reviews, and approvals.', 70),
  ('documents', 'Documents & Drawings', 'Documents, drawings, specifications, and transmittals.', 80),
  ('photos', 'Photos & Gallery', 'Project and property photo records and galleries.', 90),
  ('daily_reports', 'Daily Reports', 'Daily logs, field reports, and related action items.', 100),
  ('issues', 'Issues & Punch', 'Issues, punch lists, corrective actions, and closeout tracking.', 110),
  ('inspections', 'Inspections', 'Property, compliance, and field inspections.', 120),
  ('safety', 'Safety & Incidents', 'Incidents, toolbox talks, and safety controls.', 130),
  ('work_orders', 'Work Orders', 'Work orders, maintenance requests, and service activity.', 140),
  ('budget', 'Budget & Costs', 'Budgets, direct costs, cost codes, and financial controls.', 150),
  ('contracts', 'Contracts & Commitments', 'Prime contracts, commitments, purchase orders, and procurement commitments.', 160),
  ('change_orders', 'Changes', 'Change events, change orders, and margin controls.', 170),
  ('payments', 'Invoices & Payments', 'Invoices, pay applications, payments, lien releases, and reconciliation.', 180),
  ('procurement', 'Procurement', 'Bid packages, proposals, vendors, and award workflows.', 190),
  ('reports', 'Reports & Analytics', 'Reports, analytics, risk snapshots, and exports.', 200),
  ('communications', 'Communications', 'Messages, correspondence, email, SMS, and distribution lists.', 210),
  ('client_portal', 'Client Portal', 'Client updates, portal content, uploads, and owner-facing records.', 220),
  ('compliance', 'Permits & Compliance', 'Permits, obligations, sampling, and compliance correspondence.', 230),
  ('property_operations', 'Property Operations', 'Units, assets, inventory, turns, utilities, and operating configuration.', 240),
  ('workflows', 'Workflows & Action Items', 'Approvals, trackers, action items, and accountable routing.', 250),
  ('closeout', 'Closeout & Warranties', 'Closeout items, warranties, turnover, and final records.', 260),
  ('property_settings', 'Property Administration', 'Property-level settings, integrations, and module configuration.', 270)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  actions = EXCLUDED.actions;

CREATE TABLE IF NOT EXISTS public.property_role_permissions (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  module text NOT NULL REFERENCES public.enterprise_permission_modules(code) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('view','create','edit','delete','approve','assign')),
  allowed boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, role, module, action)
);

CREATE TABLE IF NOT EXISTS public.user_property_permission_overrides (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL REFERENCES public.enterprise_permission_modules(code) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('view','create','edit','delete','approve','assign')),
  allowed boolean NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, user_id, module, action)
);

CREATE INDEX IF NOT EXISTS idx_user_property_permissions_user
  ON public.user_property_permission_overrides (workspace_id, user_id, property_id);

ALTER TABLE public.enterprise_permission_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_property_permission_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS enterprise_permission_modules_read ON public.enterprise_permission_modules;
CREATE POLICY enterprise_permission_modules_read ON public.enterprise_permission_modules
  FOR SELECT TO authenticated USING (true);

-- Only SECURITY DEFINER administration functions write permission records.
REVOKE INSERT, UPDATE, DELETE ON public.property_role_permissions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_property_permission_overrides FROM authenticated;
GRANT SELECT ON public.enterprise_permission_modules TO authenticated;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.is_super_admin(), false)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = _user_id
        AND ur.role = 'admin'
        AND COALESCE(p.status, 'active') = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.workspaces w
      LEFT JOIN public.profiles p ON p.user_id = _user_id
      WHERE w.owner_user_id = _user_id
        AND (p.user_id IS NULL OR COALESCE(p.status, 'active') = 'active')
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_property(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
    AND _property_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.properties pr
      JOIN public.profiles p ON p.user_id = _user_id
      WHERE pr.id = _property_id
        AND p.workspace_id = pr.workspace_id
        AND COALESCE(p.status, 'active') = 'active'
        AND (
          public.is_workspace_admin(_user_id)
          OR EXISTS (
            SELECT 1
            FROM public.property_team_members ptm
            WHERE ptm.property_id = pr.id
              AND ptm.user_id = _user_id
              AND ptm.status = 'active'
              AND (ptm.end_date IS NULL OR ptm.end_date >= CURRENT_DATE)
          )
        )
    );
$$;

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
          OR (
            pj.property_id IS NULL
            AND public.is_workspace_admin(_user_id)
          )
          OR EXISTS (
            SELECT 1 FROM public.project_team_members ptm
            WHERE ptm.project_id = pj.id AND ptm.user_id = _user_id
          )
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.default_property_role_permission(
  _role public.app_role,
  _module text,
  _action text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _role IN ('admin','owner') THEN true
    WHEN _role = 'manager' THEN
      _action IN ('view','create','edit','approve','assign')
      OR (_action = 'delete' AND _module NOT IN ('people','property_settings','budget','contracts','payments'))
    WHEN _role = 'project_manager' THEN
      (_module NOT IN ('people','property_settings') AND _action IN ('view','create','edit'))
      OR (_module IN ('rfis','submittals','issues','daily_reports','schedule','change_orders','procurement','workflows') AND _action = 'approve')
      OR (_module IN ('projects','people','workflows') AND _action = 'assign')
    WHEN _role = 'superintendent' THEN
      _module IN ('overview','projects','schedule','rfis','submittals','documents','photos','daily_reports','issues','inspections','safety','work_orders','communications','workflows','closeout')
      AND _action IN ('view','create','edit','assign')
    WHEN _role = 'inspector' THEN
      _module IN ('overview','documents','photos','daily_reports','issues','inspections','safety','communications')
      AND _action IN ('view','create','edit')
    WHEN _role = 'administrator' THEN
      _module IN ('overview','projects','people','documents','communications','reports','client_portal','workflows','property_operations')
      AND _action IN ('view','create','edit','assign')
    WHEN _role = 'clerk' THEN
      _module IN ('overview','documents','daily_reports','reports','communications','client_portal','workflows')
      AND _action IN ('view','create','edit')
    WHEN _role = 'subcontractor' THEN
      _module IN ('overview','schedule','rfis','submittals','documents','photos','daily_reports','issues','safety','work_orders','communications')
      AND _action IN ('view','create','edit')
    WHEN _role = 'viewer' THEN _action = 'view'
    WHEN _role = 'user' THEN
      _module IN ('overview','projects','documents','communications') AND _action = 'view'
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.enterprise_module_for_table(_table_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _table_name IN ('properties') THEN 'properties'
    WHEN _table_name ~ '(team_members|directory|people)' THEN 'people'
    WHEN _table_name ~ '(work_order|maintenance_request)' THEN 'work_orders'
    WHEN _table_name ~ 'inspect' THEN 'inspections'
    WHEN _table_name ~ '(issue|punch)' THEN 'issues'
    WHEN _table_name ~ '(daily_report|daily_log)' THEN 'daily_reports'
    WHEN _table_name ~ '(rfi)' THEN 'rfis'
    WHEN _table_name ~ '(submittal)' THEN 'submittals'
    WHEN _table_name ~ '(incident|safety|toolbox)' THEN 'safety'
    WHEN _table_name ~ '(schedule|milestone|predecessor)' THEN 'schedule'
    WHEN _table_name ~ '(drawing|document|specification|transmittal|artifact)' THEN 'documents'
    WHEN _table_name ~ '(photo|gallery|album)' THEN 'photos'
    WHEN _table_name ~ '(budget|direct_cost|cost_code|margin)' THEN 'budget'
    WHEN _table_name ~ '(change_event|change_order)' THEN 'change_orders'
    WHEN _table_name ~ '(invoice|payment|payapp|lien|sov)' THEN 'payments'
    WHEN _table_name ~ '(contract|commitment|purchase_order)' THEN 'contracts'
    WHEN _table_name ~ '(bid|proposal|vendor_submission)' THEN 'procurement'
    WHEN _table_name ~ '(report|analytics|risk_snapshot|ai_usage)' THEN 'reports'
    WHEN _table_name ~ '(message|email|sms|correspondence|communication|distribution)' THEN 'communications'
    WHEN _table_name ~ '(client_portal|client_update|portal_client)' THEN 'client_portal'
    WHEN _table_name ~ '(permit|compliance|sampling)' THEN 'compliance'
    WHEN _table_name ~ '(inventory|asset|unit_turn|units|utility|voice_agent)' THEN 'property_operations'
    WHEN _table_name ~ '(workflow|tracker|action_item)' THEN 'workflows'
    WHEN _table_name ~ '(closeout|warrant)' THEN 'closeout'
    ELSE 'projects'
  END;
$$;

-- Seed an explicit default for every role/module/action in every workspace.
WITH roles(role) AS (
  SELECT unnest(enum_range(NULL::public.app_role))
), actions(action) AS (
  SELECT unnest(ARRAY['view','create','edit','delete','approve','assign']::text[])
), defaults AS (
  SELECT w.id AS workspace_id, r.role, m.code AS module, a.action,
    public.default_property_role_permission(r.role, m.code, a.action) AS allowed
  FROM public.workspaces w
  CROSS JOIN roles r
  CROSS JOIN public.enterprise_permission_modules m
  CROSS JOIN actions a
)
INSERT INTO public.property_role_permissions (workspace_id, role, module, action, allowed)
SELECT workspace_id, role, module, action, allowed FROM defaults
ON CONFLICT (workspace_id, role, module, action) DO NOTHING;

CREATE OR REPLACE FUNCTION public.seed_enterprise_property_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.property_role_permissions (workspace_id, role, module, action, allowed)
  SELECT NEW.id, r.role, m.code, a.action,
    public.default_property_role_permission(r.role, m.code, a.action)
  FROM unnest(enum_range(NULL::public.app_role)) r(role)
  CROSS JOIN public.enterprise_permission_modules m
  CROSS JOIN LATERAL unnest(m.actions) a(action)
  ON CONFLICT (workspace_id, role, module, action) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_enterprise_property_permissions_on_workspace ON public.workspaces;
CREATE TRIGGER seed_enterprise_property_permissions_on_workspace
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.seed_enterprise_property_permissions();

CREATE OR REPLACE FUNCTION public.effective_property_permission(
  _user_id uuid,
  _property_id uuid,
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
  v_workspace uuid;
  v_override boolean;
  v_role public.app_role;
  v_allowed boolean;
BEGIN
  IF NOT public.can_access_property(_user_id, _property_id) THEN RETURN false; END IF;
  IF public.is_workspace_admin(_user_id) THEN RETURN true; END IF;

  SELECT workspace_id INTO v_workspace FROM public.properties WHERE id = _property_id;
  SELECT allowed INTO v_override
  FROM public.user_property_permission_overrides
  WHERE property_id = _property_id AND user_id = _user_id
    AND module = _module AND action = _action;
  IF FOUND THEN RETURN v_override; END IF;

  SELECT role INTO v_role
  FROM public.property_team_members
  WHERE property_id = _property_id AND user_id = _user_id AND status = 'active'
  ORDER BY created_at DESC LIMIT 1;

  SELECT allowed INTO v_allowed
  FROM public.property_role_permissions
  WHERE workspace_id = v_workspace AND role = v_role
    AND module = _module AND action = _action;
  RETURN COALESCE(v_allowed, false);
END;
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
DECLARE v_property uuid;
BEGIN
  IF NOT public.can_access_project(_user_id, _project_id) THEN RETURN false; END IF;
  IF public.is_workspace_admin(_user_id) THEN RETURN true; END IF;
  SELECT property_id INTO v_property FROM public.projects WHERE id = _project_id;
  IF v_property IS NOT NULL THEN
    RETURN public.effective_property_permission(_user_id, v_property, _module, _action);
  END IF;
  -- A direct project member without a property scope is read-only unless a
  -- future project-specific template grants more.
  RETURN _action = 'view';
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_property_access(_actor uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_workspace_admin(_actor)
    OR public.effective_property_permission(_actor, _property_id, 'people', 'assign');
$$;

CREATE OR REPLACE FUNCTION public.get_user_property_assignments(p_target_user_id uuid)
RETURNS TABLE (
  property_id uuid,
  property_name text,
  role public.app_role,
  status text,
  assignment_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.id, pr.name, ptm.role, ptm.status, ptm.id
  FROM public.property_team_members ptm
  JOIN public.properties pr ON pr.id = ptm.property_id
  WHERE ptm.user_id = p_target_user_id
    AND (
      p_target_user_id = auth.uid()
      OR public.is_workspace_admin(auth.uid())
      OR public.can_manage_property_access(auth.uid(), pr.id)
    )
  ORDER BY pr.name;
$$;

CREATE OR REPLACE FUNCTION public.get_property_access_matrix(
  p_target_user_id uuid,
  p_property_id uuid
)
RETURNS TABLE (
  module text,
  module_label text,
  description text,
  sort_order integer,
  action text,
  allowed boolean,
  source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_target_user_id <> auth.uid()
     AND NOT public.can_manage_property_access(auth.uid(), p_property_id) THEN
    RAISE EXCEPTION 'You cannot view permissions for this property';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.property_team_members
    WHERE property_id = p_property_id AND user_id = p_target_user_id AND status = 'active'
  ) THEN RAISE EXCEPTION 'The user is not assigned to this property'; END IF;

  RETURN QUERY
  SELECT m.code, m.label, m.description, m.sort_order, a.action,
    public.effective_property_permission(p_target_user_id, p_property_id, m.code, a.action),
    CASE WHEN o.user_id IS NULL THEN 'role_default' ELSE 'user_override' END
  FROM public.enterprise_permission_modules m
  CROSS JOIN LATERAL unnest(m.actions) a(action)
  LEFT JOIN public.user_property_permission_overrides o
    ON o.property_id = p_property_id AND o.user_id = p_target_user_id
   AND o.module = m.code AND o.action = a.action
  ORDER BY m.sort_order, array_position(m.actions, a.action);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_property_permission_override(
  p_target_user_id uuid,
  p_property_id uuid,
  p_module text,
  p_action text,
  p_allowed boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_workspace uuid;
BEGIN
  IF NOT public.can_manage_property_access(auth.uid(), p_property_id) THEN
    RAISE EXCEPTION 'You cannot manage permissions for this property';
  END IF;
  SELECT workspace_id INTO v_workspace FROM public.properties WHERE id = p_property_id;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_target_user_id AND workspace_id = v_workspace) THEN
    RAISE EXCEPTION 'The user is outside this workspace';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.property_team_members WHERE property_id = p_property_id AND user_id = p_target_user_id AND status = 'active') THEN
    RAISE EXCEPTION 'Assign the user to this property first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.enterprise_permission_modules WHERE code = p_module AND p_action = ANY(actions)) THEN
    RAISE EXCEPTION 'Unknown permission';
  END IF;

  IF p_allowed IS NULL THEN
    DELETE FROM public.user_property_permission_overrides
    WHERE property_id = p_property_id AND user_id = p_target_user_id
      AND module = p_module AND action = p_action;
  ELSE
    INSERT INTO public.user_property_permission_overrides (
      workspace_id, property_id, user_id, module, action, allowed, updated_by, updated_at
    ) VALUES (
      v_workspace, p_property_id, p_target_user_id, p_module, p_action, p_allowed, auth.uid(), now()
    )
    ON CONFLICT (property_id, user_id, module, action) DO UPDATE SET
      allowed = EXCLUDED.allowed, updated_by = auth.uid(), updated_at = now();
  END IF;

  INSERT INTO public.enterprise_user_audit_log (
    tenant_id, actor_user_id, target_user_id, action, details
  ) VALUES (
    v_workspace, auth.uid(), p_target_user_id, 'permission.changed',
    jsonb_build_object('property_id', p_property_id, 'module', p_module, 'permission_action', p_action, 'allowed', p_allowed)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_property_user_access(
  p_target_user_id uuid,
  p_property_id uuid,
  p_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_workspace uuid;
BEGIN
  IF p_role = 'admin' THEN RAISE EXCEPTION 'Workspace Administrator is not a property role'; END IF;
  IF NOT public.can_manage_property_access(auth.uid(), p_property_id) THEN
    RAISE EXCEPTION 'You cannot manage access for this property';
  END IF;
  SELECT workspace_id INTO v_workspace FROM public.properties WHERE id = p_property_id;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_target_user_id AND workspace_id = v_workspace) THEN
    RAISE EXCEPTION 'The user is outside this workspace';
  END IF;

  INSERT INTO public.property_team_members (property_id, user_id, role, status, added_by, end_date)
  VALUES (p_property_id, p_target_user_id, p_role, 'active', auth.uid(), NULL)
  ON CONFLICT (property_id, user_id, end_date) DO UPDATE SET
    role = EXCLUDED.role, status = 'active', updated_at = now();

  INSERT INTO public.user_roles (user_id, role) VALUES (p_target_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  DELETE FROM public.user_roles
  WHERE user_id = p_target_user_id AND role NOT IN ('admin','user');

  INSERT INTO public.enterprise_user_audit_log (
    tenant_id, actor_user_id, target_user_id, action, details
  ) VALUES (
    v_workspace, auth.uid(), p_target_user_id, 'property_access.assigned',
    jsonb_build_object('property_id', p_property_id, 'role', p_role::text)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_property_user_access(
  p_target_user_id uuid,
  p_property_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_workspace uuid;
BEGIN
  IF NOT public.can_manage_property_access(auth.uid(), p_property_id) THEN
    RAISE EXCEPTION 'You cannot manage access for this property';
  END IF;
  SELECT workspace_id INTO v_workspace FROM public.properties WHERE id = p_property_id;
  UPDATE public.property_team_members
  SET status = 'archived', end_date = CURRENT_DATE, archived_by = auth.uid(), archived_at = now(), updated_at = now()
  WHERE property_id = p_property_id AND user_id = p_target_user_id AND status = 'active';
  DELETE FROM public.user_property_permission_overrides
  WHERE property_id = p_property_id AND user_id = p_target_user_id;
  INSERT INTO public.enterprise_user_audit_log (
    tenant_id, actor_user_id, target_user_id, action, details
  ) VALUES (
    v_workspace, auth.uid(), p_target_user_id, 'property_access.removed',
    jsonb_build_object('property_id', p_property_id)
  );
END;
$$;

-- Workspace roles now contain only workspace administration. Property roles
-- are stored exclusively on property_team_members.
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT p.user_id, 'user'::public.app_role
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = p.user_id AND a.role = 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles ur
WHERE ur.role NOT IN ('admin','user')
  AND EXISTS (SELECT 1 FROM public.property_team_members ptm WHERE ptm.user_id = ur.user_id);

-- Invitations are always property-scoped. Workspace administration is granted
-- separately by an existing workspace administrator after account creation.
CREATE OR REPLACE FUNCTION public.can_invite_workspace_role(_target_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_workspace_admin(auth.uid()) AND _target_role <> 'admin';
$$;

CREATE OR REPLACE FUNCTION public.assignable_workspace_roles()
RETURNS public.app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(r ORDER BY public.role_priority(r) DESC),
    ARRAY[]::public.app_role[]
  )
  FROM unnest(enum_range(NULL::public.app_role)) r
  WHERE r <> 'admin' AND public.is_workspace_admin(auth.uid());
$$;

DROP FUNCTION IF EXISTS public.workspace_admin_level(uuid);
CREATE OR REPLACE FUNCTION public.workspace_admin_level(_user_id uuid, _workspace_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_super_admin() THEN 400
    WHEN public.workspace_for_user(_user_id) = _workspace_id
      AND public.is_workspace_admin(_user_id) THEN 300
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_administer_workspace_user(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND _target_user_id IS NOT NULL
    AND auth.uid() <> _target_user_id
    AND public.workspace_for_user(_target_user_id) = public.workspace_for_user(auth.uid())
    AND public.is_workspace_admin(auth.uid())
    AND (
      public.is_super_admin()
      OR NOT EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.owner_user_id = _target_user_id
          AND w.id = public.workspace_for_user(auth.uid())
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.assign_workspace_user_role(
  p_target_user_id uuid,
  p_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_workspace uuid := public.workspace_for_user(auth.uid());
BEGIN
  IF NOT public.is_workspace_admin(auth.uid()) THEN RAISE EXCEPTION 'Workspace Administrator access is required'; END IF;
  IF p_role <> 'admin' THEN RAISE EXCEPTION 'Operational roles must be assigned to a property'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_target_user_id AND workspace_id = v_workspace) THEN
    RAISE EXCEPTION 'The user is outside this workspace';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (p_target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.enterprise_user_audit_log (tenant_id, actor_user_id, target_user_id, action, details)
  VALUES (v_workspace, auth.uid(), p_target_user_id, 'workspace_admin.assigned', '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_workspace_user_role(
  p_target_user_id uuid,
  p_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_workspace uuid := public.workspace_for_user(auth.uid());
BEGIN
  IF NOT public.is_workspace_admin(auth.uid()) THEN RAISE EXCEPTION 'Workspace Administrator access is required'; END IF;
  IF p_role <> 'admin' THEN RAISE EXCEPTION 'Operational roles are managed through property access'; END IF;
  IF p_target_user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot remove your own workspace administration'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_target_user_id AND workspace_id = v_workspace) THEN
    RAISE EXCEPTION 'The user is outside this workspace';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = p_target_user_id AND role = 'admin';
  INSERT INTO public.user_roles (user_id, role) VALUES (p_target_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.enterprise_user_audit_log (tenant_id, actor_user_id, target_user_id, action, details)
  VALUES (v_workspace, auth.uid(), p_target_user_id, 'workspace_admin.removed', '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_workspace_invitation(
  p_email text,
  p_role public.app_role DEFAULT 'user',
  p_full_name text DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL
)
RETURNS public.user_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid := public.workspace_for_user(auth.uid());
  v_email text := lower(trim(p_email));
  v_row public.user_invitations;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF v_workspace IS NULL THEN RAISE EXCEPTION 'No active workspace found'; END IF;
  IF p_property_id IS NULL THEN RAISE EXCEPTION 'A property assignment is required'; END IF;
  IF p_role = 'admin' THEN RAISE EXCEPTION 'Workspace Administrator cannot be assigned through a property invitation'; END IF;
  IF v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'A valid email address is required';
  END IF;
  IF NOT public.can_invite_workspace_role(p_role) THEN RAISE EXCEPTION 'You cannot assign this role'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE lower(p.email) = v_email) THEN
    RAISE EXCEPTION 'An account already exists for this email';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = p_property_id AND p.workspace_id = v_workspace) THEN
    RAISE EXCEPTION 'Property is outside the active workspace';
  END IF;
  IF p_client_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = p_client_id AND c.workspace_id = v_workspace
  ) THEN RAISE EXCEPTION 'Organization is outside the active workspace'; END IF;

  UPDATE public.user_invitations SET revoked_at = now(), updated_at = now()
  WHERE workspace_id = v_workspace AND lower(email) = v_email
    AND accepted_at IS NULL AND revoked_at IS NULL;

  INSERT INTO public.user_invitations (
    email, role, full_name, property_id, client_id, workspace_id,
    invited_by, token, expires_at
  ) VALUES (
    v_email, p_role, NULLIF(trim(p_full_name), ''), p_property_id, p_client_id,
    v_workspace, auth.uid(), gen_random_uuid()::text || '-' || gen_random_uuid()::text,
    now() + interval '7 days'
  ) RETURNING * INTO v_row;

  INSERT INTO public.enterprise_user_audit_log (
    tenant_id, actor_user_id, invitation_id, action, details
  ) VALUES (
    v_workspace, auth.uid(), v_row.id, 'user.invited',
    jsonb_build_object('email', v_email, 'property_id', p_property_id, 'role', p_role::text)
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid;
  v_company text;
  v_invitation public.user_invitations;
  v_token text := NULLIF(NEW.raw_user_meta_data ->> 'invitation_token', '');
  v_requested_workspace text := NULLIF(NEW.raw_user_meta_data ->> 'workspace_id', '');
BEGIN
  IF v_token IS NOT NULL THEN
    SELECT * INTO v_invitation FROM public.user_invitations i
    WHERE i.token = v_token AND lower(i.email) = lower(NEW.email)
      AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
    FOR UPDATE;
    IF v_invitation.id IS NULL OR v_invitation.workspace_id IS NULL OR v_invitation.property_id IS NULL THEN
      RAISE EXCEPTION 'Invitation is invalid, expired, revoked, or missing its property assignment';
    END IF;
    v_workspace := v_invitation.workspace_id;
    INSERT INTO public.profiles (user_id, full_name, email, workspace_id, client_id, status)
    VALUES (
      NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), v_invitation.full_name),
      NEW.email, v_workspace, v_invitation.client_id, 'active'
    );
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
    INSERT INTO public.property_team_members (property_id, user_id, role, status, added_by)
    VALUES (v_invitation.property_id, NEW.id, v_invitation.role, 'active', v_invitation.invited_by)
    ON CONFLICT DO NOTHING;
    UPDATE public.user_invitations
    SET accepted_at = now(), accepted_by = NEW.id, updated_at = now()
    WHERE id = v_invitation.id;
    INSERT INTO public.enterprise_user_audit_log (
      tenant_id, actor_user_id, target_user_id, invitation_id, action, details
    ) VALUES (
      v_workspace, v_invitation.invited_by, NEW.id, v_invitation.id, 'invitation.accepted',
      jsonb_build_object('email', NEW.email, 'property_id', v_invitation.property_id, 'role', v_invitation.role::text)
    );
  ELSIF v_requested_workspace IS NOT NULL THEN
    RAISE EXCEPTION 'A valid invitation token is required to join an existing workspace';
  ELSE
    -- Kept for administrative/service provisioning. Public signup is disabled
    -- in the production Auth configuration by this release.
    v_company := COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'company_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', '') || '''s Workspace',
      split_part(NEW.email, '@', 1) || '''s Workspace'
    );
    INSERT INTO public.workspaces (name, owner_user_id) VALUES (v_company, NEW.id)
    RETURNING id INTO v_workspace;
    INSERT INTO public.profiles (user_id, full_name, email, workspace_id, status)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email, v_workspace, 'active');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

-- Restrictive policies are ANDed with every existing permissive policy. This
-- closes workspace-only policies without disrupting the separate client portal
-- policies, which remain responsible for portal identities.
DROP POLICY IF EXISTS enterprise_property_scope ON public.properties;
CREATE POLICY enterprise_property_scope ON public.properties AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_super_admin()
    OR public.is_workspace_admin(auth.uid())
    OR public.can_access_property(auth.uid(), id)
  )
  WITH CHECK (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_super_admin()
    OR public.is_workspace_admin(auth.uid())
    OR public.can_access_property(auth.uid(), id)
  );

DROP POLICY IF EXISTS enterprise_property_select_permission ON public.properties;
CREATE POLICY enterprise_property_select_permission ON public.properties AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_workspace_admin(auth.uid())
    OR public.effective_property_permission(auth.uid(), id, 'properties', 'view')
  );

DROP POLICY IF EXISTS enterprise_property_update_permission ON public.properties;
CREATE POLICY enterprise_property_update_permission ON public.properties AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_workspace_admin(auth.uid())
    OR public.effective_property_permission(auth.uid(), id, 'properties', 'edit')
  )
  WITH CHECK (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_workspace_admin(auth.uid())
    OR public.effective_property_permission(auth.uid(), id, 'properties', 'edit')
  );

DROP POLICY IF EXISTS enterprise_property_delete_permission ON public.properties;
CREATE POLICY enterprise_property_delete_permission ON public.properties AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_workspace_admin(auth.uid())
    OR public.effective_property_permission(auth.uid(), id, 'properties', 'delete')
  );

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
  );

DROP POLICY IF EXISTS enterprise_project_select_permission ON public.projects;
CREATE POLICY enterprise_project_select_permission ON public.projects AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_workspace_admin(auth.uid())
    OR public.effective_project_permission(auth.uid(), id, 'projects', 'view')
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
  );

DROP POLICY IF EXISTS enterprise_project_delete_permission ON public.projects;
CREATE POLICY enterprise_project_delete_permission ON public.projects AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_workspace_admin(auth.uid())
    OR public.effective_project_permission(auth.uid(), id, 'projects', 'delete')
  );

DO $$
DECLARE target record;
DECLARE module_name text;
DECLARE scope_expr text;
DECLARE action_name text;
DECLARE command_name text;
BEGIN
  FOR target IN
    SELECT c.table_name,
      bool_or(c.column_name = 'property_id') AS has_property,
      bool_or(c.column_name = 'project_id') AS has_project
    FROM information_schema.columns c
    JOIN pg_class pc ON pc.relname = c.table_name
    JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.column_name IN ('property_id','project_id')
      AND pc.relkind = 'r' AND pc.relrowsecurity
      AND c.table_name NOT IN (
        'properties','projects','user_invitations','user_status_history',
        'user_template_assignments','user_property_permission_overrides'
      )
    GROUP BY c.table_name
  LOOP
    module_name := public.enterprise_module_for_table(target.table_name);
    IF target.has_property AND target.has_project THEN
      scope_expr := '(property_id IS NOT NULL OR project_id IS NOT NULL) AND (property_id IS NULL OR public.can_access_property(auth.uid(), property_id)) AND (project_id IS NULL OR public.can_access_project(auth.uid(), project_id))';
    ELSIF target.has_property THEN
      scope_expr := '(property_id IS NOT NULL AND public.can_access_property(auth.uid(), property_id))';
    ELSE
      scope_expr := '(project_id IS NOT NULL AND public.can_access_project(auth.uid(), project_id))';
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS enterprise_record_scope ON public.%I', target.table_name);
    EXECUTE format(
      'CREATE POLICY enterprise_record_scope ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (%s)) WITH CHECK (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (%s))',
      target.table_name, scope_expr, scope_expr
    );

    FOREACH command_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      action_name := CASE command_name WHEN 'SELECT' THEN 'view' WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'edit' ELSE 'delete' END;
      EXECUTE format('DROP POLICY IF EXISTS enterprise_permission_%s ON public.%I', lower(command_name), target.table_name);
      IF target.has_property AND target.has_project THEN
        IF command_name = 'INSERT' THEN
          EXECUTE format(
            'CREATE POLICY enterprise_permission_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated WITH CHECK (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (project_id IS NOT NULL AND public.effective_project_permission(auth.uid(), project_id, %L, %L)) OR (project_id IS NULL AND property_id IS NOT NULL AND public.effective_property_permission(auth.uid(), property_id, %L, %L)))',
            lower(command_name), target.table_name, command_name, module_name, action_name, module_name, action_name
          );
        ELSIF command_name = 'UPDATE' THEN
          EXECUTE format(
            'CREATE POLICY enterprise_permission_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated USING (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (project_id IS NOT NULL AND public.effective_project_permission(auth.uid(), project_id, %L, %L)) OR (project_id IS NULL AND property_id IS NOT NULL AND public.effective_property_permission(auth.uid(), property_id, %L, %L))) WITH CHECK (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (project_id IS NOT NULL AND public.effective_project_permission(auth.uid(), project_id, %L, %L)) OR (project_id IS NULL AND property_id IS NOT NULL AND public.effective_property_permission(auth.uid(), property_id, %L, %L)))',
            lower(command_name), target.table_name, command_name,
            module_name, action_name, module_name, action_name,
            module_name, action_name, module_name, action_name
          );
        ELSE
          EXECUTE format(
            'CREATE POLICY enterprise_permission_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated USING (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (project_id IS NOT NULL AND public.effective_project_permission(auth.uid(), project_id, %L, %L)) OR (project_id IS NULL AND property_id IS NOT NULL AND public.effective_property_permission(auth.uid(), property_id, %L, %L)))',
            lower(command_name), target.table_name, command_name, module_name, action_name, module_name, action_name
          );
        END IF;
      ELSIF target.has_project THEN
        IF command_name = 'INSERT' THEN
          EXECUTE format(
            'CREATE POLICY enterprise_permission_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated WITH CHECK (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (project_id IS NOT NULL AND public.effective_project_permission(auth.uid(), project_id, %L, %L)))',
            lower(command_name), target.table_name, command_name, module_name, action_name
          );
        ELSIF command_name = 'UPDATE' THEN
          EXECUTE format(
            'CREATE POLICY enterprise_permission_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated USING (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (project_id IS NOT NULL AND public.effective_project_permission(auth.uid(), project_id, %L, %L))) WITH CHECK (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (project_id IS NOT NULL AND public.effective_project_permission(auth.uid(), project_id, %L, %L)))',
            lower(command_name), target.table_name, command_name, module_name, action_name, module_name, action_name
          );
        ELSE
          EXECUTE format(
            'CREATE POLICY enterprise_permission_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated USING (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (project_id IS NOT NULL AND public.effective_project_permission(auth.uid(), project_id, %L, %L)))',
            lower(command_name), target.table_name, command_name, module_name, action_name
          );
        END IF;
      ELSE
        IF command_name = 'INSERT' THEN
          EXECUTE format(
            'CREATE POLICY enterprise_permission_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated WITH CHECK (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (property_id IS NOT NULL AND public.effective_property_permission(auth.uid(), property_id, %L, %L)))',
            lower(command_name), target.table_name, command_name, module_name, action_name
          );
        ELSIF command_name = 'UPDATE' THEN
          EXECUTE format(
            'CREATE POLICY enterprise_permission_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated USING (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (property_id IS NOT NULL AND public.effective_property_permission(auth.uid(), property_id, %L, %L))) WITH CHECK (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (property_id IS NOT NULL AND public.effective_property_permission(auth.uid(), property_id, %L, %L)))',
            lower(command_name), target.table_name, command_name, module_name, action_name, module_name, action_name
          );
        ELSE
          EXECUTE format(
            'CREATE POLICY enterprise_permission_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated USING (COALESCE(public.current_portal_kind(), ''main'') <> ''main'' OR public.is_workspace_admin(auth.uid()) OR (property_id IS NOT NULL AND public.effective_property_permission(auth.uid(), property_id, %L, %L)))',
            lower(command_name), target.table_name, command_name, module_name, action_name
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS enterprise_profile_scope ON public.profiles;
CREATE POLICY enterprise_profile_scope ON public.profiles AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_workspace_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.property_team_members target_ptm
      WHERE target_ptm.user_id = profiles.user_id
        AND target_ptm.status = 'active'
        AND public.can_access_property(auth.uid(), target_ptm.property_id)
    )
  );

DROP POLICY IF EXISTS enterprise_user_roles_scope ON public.user_roles;
CREATE POLICY enterprise_user_roles_scope ON public.user_roles AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_workspace_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.property_team_members target_ptm
      WHERE target_ptm.user_id = user_roles.user_id
        AND target_ptm.status = 'active'
        AND public.can_access_property(auth.uid(), target_ptm.property_id)
    )
  );

DROP POLICY IF EXISTS enterprise_clients_scope ON public.clients;
CREATE POLICY enterprise_clients_scope ON public.clients AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    public.is_workspace_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.projects pj
      WHERE pj.client_id = clients.id AND public.can_access_project(auth.uid(), pj.id)
    )
  );

REVOKE ALL ON FUNCTION public.get_user_property_assignments(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_property_access_matrix(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_property_permission_override(uuid, uuid, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_property_user_access(uuid, uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_property_user_access(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_property(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.effective_property_permission(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.effective_project_permission(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_property_assignments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_property_access_matrix(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_property_permission_override(uuid, uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_property_user_access(uuid, uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_property_user_access(uuid, uuid) TO authenticated;
