-- Add administrator and clerk roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'clerk';

-- Seed role definitions for administrator and clerk
INSERT INTO role_definitions (role_key, display_name, description, priority, is_system_role, permissions) VALUES
  ('administrator', 'Administrator', 'Administrative staff who support property operations', 65, true, '{"properties": ["view"], "people": ["view"], "work_orders": ["view", "create", "update"], "inspections": ["view", "create", "update"], "issues": ["view", "create", "update"], "documents": ["view", "create", "update"], "reports": ["view"]}'),
  ('clerk', 'Clerk', 'Clerical staff with limited access', 55, true, '{"properties": ["view"], "work_orders": ["view", "create"], "inspections": ["view"], "issues": ["view"], "documents": ["view"], "reports": ["view"]}')
ON CONFLICT (role_key) DO NOTHING;

-- Seed role permissions for administrator and clerk
INSERT INTO role_permissions (role_key, module, action, allowed) VALUES
  -- Administrator permissions
  ('administrator', 'properties', 'view', true),
  ('administrator', 'people', 'view', true),
  ('administrator', 'work_orders', 'view', true),
  ('administrator', 'work_orders', 'create', true),
  ('administrator', 'work_orders', 'update', true),
  ('administrator', 'inspections', 'view', true),
  ('administrator', 'inspections', 'create', true),
  ('administrator', 'inspections', 'update', true),
  ('administrator', 'issues', 'view', true),
  ('administrator', 'issues', 'create', true),
  ('administrator', 'issues', 'update', true),
  ('administrator', 'documents', 'view', true),
  ('administrator', 'documents', 'create', true),
  ('administrator', 'documents', 'update', true),
  ('administrator', 'reports', 'view', true),
  -- Clerk permissions
  ('clerk', 'properties', 'view', true),
  ('clerk', 'work_orders', 'view', true),
  ('clerk', 'work_orders', 'create', true),
  ('clerk', 'inspections', 'view', true),
  ('clerk', 'issues', 'view', true),
  ('clerk', 'documents', 'view', true),
  ('clerk', 'reports', 'view', true)
ON CONFLICT (role_key, module, action) DO NOTHING;

-- Update role priorities to match hierarchy
UPDATE public.role_definitions
SET priority = CASE role_key
  WHEN 'admin' THEN 100
  WHEN 'owner' THEN 90
  WHEN 'manager' THEN 80
  WHEN 'inspector' THEN 70
  WHEN 'administrator' THEN 65
  WHEN 'superintendent' THEN 60
  WHEN 'clerk' THEN 55
  WHEN 'project_manager' THEN 50
  WHEN 'subcontractor' THEN 40
  WHEN 'viewer' THEN 20
  WHEN 'user' THEN 10
  ELSE priority
END
WHERE role_key IN (
  'admin',
  'owner',
  'manager',
  'inspector',
  'administrator',
  'superintendent',
  'clerk',
  'project_manager',
  'subcontractor',
  'viewer',
  'user'
);

-- Restrict role assignment to admin/owner/manager only, with hierarchy rules
CREATE OR REPLACE FUNCTION public.can_assign_role(_user_id uuid, _target_role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_priority integer;
  target_priority integer;
BEGIN
  IF NOT (
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'owner')
    OR public.has_role(_user_id, 'manager')
  ) THEN
    RETURN false;
  END IF;

  IF public.has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;

  IF _target_role = 'manager' AND NOT public.has_role(_user_id, 'owner') THEN
    RETURN false;
  END IF;

  max_priority := public.user_max_role_priority(_user_id);
  target_priority := public.role_priority(_target_role);

  RETURN max_priority > target_priority;
END;
$$;
