-- ============================================================
-- A2 · RBAC Permission Templates
-- ============================================================
-- Additive to existing role_definitions / role_permissions.
-- New system allows per-tenant cloning, customization, and assignment.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.permission_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  cloned_from uuid REFERENCES public.permission_templates(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_permission_templates_tenant
  ON public.permission_templates(tenant_id);

CREATE TABLE IF NOT EXISTS public.permission_template_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.permission_templates(id) ON DELETE CASCADE,
  module text NOT NULL,
  action text NOT NULL,
  level text NOT NULL CHECK (level IN ('none','read','standard','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, module, action)
);

CREATE INDEX IF NOT EXISTS idx_ptg_template ON public.permission_template_grants(template_id);
CREATE INDEX IF NOT EXISTS idx_ptg_module_action ON public.permission_template_grants(module, action);

CREATE TABLE IF NOT EXISTS public.user_template_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.permission_templates(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id),
  project_id uuid REFERENCES public.projects(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, template_id, workspace_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_uta_tenant_user
  ON public.user_template_assignments(tenant_id, user_id);

-- RLS --------------------------------------------------------
ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_template_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_template_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY pt_tenant_select ON public.permission_templates
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY pt_tenant_modify ON public.permission_templates
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Grants are scoped via their parent template
CREATE POLICY ptg_via_template_select ON public.permission_template_grants
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.permission_templates pt
    WHERE pt.id = permission_template_grants.template_id
    AND (pt.tenant_id = public.current_tenant_id() OR public.is_super_admin())
  ));

CREATE POLICY ptg_via_template_modify ON public.permission_template_grants
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.permission_templates pt
    WHERE pt.id = permission_template_grants.template_id
    AND (pt.tenant_id = public.current_tenant_id() OR public.is_super_admin())
    AND pt.is_system = false
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.permission_templates pt
    WHERE pt.id = permission_template_grants.template_id
    AND (pt.tenant_id = public.current_tenant_id() OR public.is_super_admin())
    AND pt.is_system = false
  ));

CREATE POLICY uta_tenant_select ON public.user_template_assignments
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY uta_tenant_modify ON public.user_template_assignments
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Block DELETE of system templates via trigger
CREATE OR REPLACE FUNCTION public.prevent_system_template_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_system THEN
    RAISE EXCEPTION 'Cannot delete system permission template: %', OLD.name
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_system_template_delete ON public.permission_templates;
CREATE TRIGGER trg_prevent_system_template_delete
  BEFORE DELETE ON public.permission_templates
  FOR EACH ROW EXECUTE FUNCTION public.prevent_system_template_delete();

-- can() — returns the highest grant level for a user on a given module+action.
-- Ranking: none < read < standard < admin
CREATE OR REPLACE FUNCTION public.permission_level(p_user uuid, p_module text, p_action text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH lvl(level, rank) AS (
    VALUES ('none',0), ('read',1), ('standard',2), ('admin',3)
  ),
  user_levels AS (
    SELECT ptg.level
    FROM public.user_template_assignments uta
    JOIN public.permission_template_grants ptg ON ptg.template_id = uta.template_id
    WHERE uta.user_id = p_user
      AND uta.tenant_id = public.current_tenant_id()
      AND ptg.module = p_module
      AND ptg.action = p_action
  )
  SELECT COALESCE(
    (SELECT ul.level FROM user_levels ul
      JOIN lvl ON lvl.level = ul.level
      ORDER BY lvl.rank DESC LIMIT 1),
    'none'
  );
$$;

CREATE OR REPLACE FUNCTION public.can(p_user uuid, p_module text, p_action text, p_min_level text DEFAULT 'read')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH lvl(level, rank) AS (
    VALUES ('none',0), ('read',1), ('standard',2), ('admin',3)
  )
  SELECT COALESCE(
    (SELECT a.rank >= b.rank
     FROM lvl a, lvl b
     WHERE a.level = public.permission_level(p_user, p_module, p_action)
       AND b.level = p_min_level),
    false
  ) OR public.is_super_admin();
$$;

-- Updated-at triggers
DROP TRIGGER IF EXISTS trg_pt_updated_at ON public.permission_templates;
CREATE TRIGGER trg_pt_updated_at
  BEFORE UPDATE ON public.permission_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed system templates per-tenant on first tenant_settings upsert.
-- The application-level seed runs once per workspace on bootstrap (see lib/rbac/seed.ts).
