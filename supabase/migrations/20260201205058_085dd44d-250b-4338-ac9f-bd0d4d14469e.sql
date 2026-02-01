-- =====================================================
-- PEOPLE MANAGEMENT SYSTEM - COMPLETE DATABASE SETUP
-- =====================================================

-- 1. Update profiles table with additional fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- 2. Create property_team_members table
CREATE TABLE IF NOT EXISTS property_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  title TEXT,
  department TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deactivated')),
  departure_reason TEXT CHECK (departure_reason IN ('resignation', 'termination', 'transfer', 'contract_end', 'other', NULL)),
  departure_notes TEXT,
  added_by UUID,
  archived_by UUID,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_active_assignment UNIQUE NULLS NOT DISTINCT (property_id, user_id, end_date)
);

-- 3. Create role_definitions table
CREATE TABLE IF NOT EXISTS role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  is_system_role BOOLEAN DEFAULT false,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_key, module, action)
);

-- 5. Create user_status_history table for audit
CREATE TABLE IF NOT EXISTS user_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES properties(id),
  previous_status TEXT,
  new_status TEXT NOT NULL,
  previous_role app_role,
  new_role app_role,
  reason TEXT,
  notes TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_team_members_property ON property_team_members(property_id);
CREATE INDEX IF NOT EXISTS idx_property_team_members_user ON property_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_property_team_members_status ON property_team_members(status);
CREATE INDEX IF NOT EXISTS idx_user_status_history_user ON user_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_key);

-- 7. Enable RLS on all new tables
ALTER TABLE property_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_status_history ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies for property_team_members
CREATE POLICY "Authenticated users can view team members"
  ON property_team_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can insert team members"
  ON property_team_members FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can update team members"
  ON property_team_members FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Only admins can delete team members"
  ON property_team_members FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- 9. RLS policies for role_definitions
CREATE POLICY "Authenticated users can view role definitions"
  ON role_definitions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert role definitions"
  ON role_definitions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update role definitions"
  ON role_definitions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete role definitions"
  ON role_definitions FOR DELETE
  USING (has_role(auth.uid(), 'admin') AND NOT is_system_role);

-- 10. RLS policies for role_permissions
CREATE POLICY "Authenticated users can view role permissions"
  ON role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage role permissions"
  ON role_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- 11. RLS policies for user_status_history
CREATE POLICY "Admins and managers can view status history"
  ON user_status_history FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated users can insert status history"
  ON user_status_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 12. Create trigger function for automatic status logging
CREATE OR REPLACE FUNCTION log_team_member_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.role IS DISTINCT FROM NEW.role OR
    OLD.end_date IS DISTINCT FROM NEW.end_date
  ) THEN
    INSERT INTO user_status_history (
      user_id, property_id, previous_status, new_status,
      previous_role, new_role, reason, notes, changed_by
    ) VALUES (
      NEW.user_id, NEW.property_id, OLD.status, NEW.status,
      OLD.role, NEW.role, NEW.departure_reason, NEW.departure_notes, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 13. Create trigger on property_team_members
DROP TRIGGER IF EXISTS track_team_member_changes ON property_team_members;
CREATE TRIGGER track_team_member_changes
  AFTER UPDATE ON property_team_members
  FOR EACH ROW EXECUTE FUNCTION log_team_member_status_change();

-- 14. Updated_at trigger for property_team_members
DROP TRIGGER IF EXISTS update_property_team_members_updated_at ON property_team_members;
CREATE TRIGGER update_property_team_members_updated_at
  BEFORE UPDATE ON property_team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. Updated_at trigger for role_definitions  
DROP TRIGGER IF EXISTS update_role_definitions_updated_at ON role_definitions;
CREATE TRIGGER update_role_definitions_updated_at
  BEFORE UPDATE ON role_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 16. Seed default role definitions
INSERT INTO role_definitions (role_key, display_name, description, priority, is_system_role, permissions) VALUES
  ('admin', 'Administrator', 'Full system access with all permissions', 100, true, '{"all": true}'),
  ('manager', 'Property Manager', 'Manages assigned properties, approves work orders and inspections', 80, true, '{"properties": ["view", "create", "update", "delete"], "people": ["view", "create", "update", "delete"], "work_orders": ["view", "create", "update", "delete", "approve"], "inspections": ["view", "create", "update"], "projects": ["view", "create", "update"], "issues": ["view", "create", "update"], "documents": ["view", "create", "update", "delete"], "reports": ["view"]}'),
  ('project_manager', 'Project Manager', 'Manages projects, budgets, and project teams', 70, true, '{"properties": ["view"], "projects": ["view", "create", "update", "delete", "approve"], "work_orders": ["view", "create", "update"], "issues": ["view", "create", "update"], "documents": ["view", "create", "update"]}'),
  ('superintendent', 'Superintendent', 'Field operations, manages work orders and inspections', 60, true, '{"properties": ["view"], "work_orders": ["view", "create", "update"], "inspections": ["view", "create", "update"], "issues": ["view", "create", "update"], "documents": ["view", "create", "update"]}'),
  ('inspector', 'Inspector', 'Conducts inspections and reports defects', 50, true, '{"properties": ["view"], "inspections": ["view", "create", "update"], "issues": ["view", "create", "update"], "work_orders": ["view", "update"], "documents": ["view", "create", "update"]}'),
  ('owner', 'Property Owner', 'Read-only oversight access with report viewing', 40, true, '{"properties": ["view"], "projects": ["view"], "work_orders": ["view"], "inspections": ["view"], "issues": ["view"], "documents": ["view"], "reports": ["view"]}'),
  ('subcontractor', 'Subcontractor', 'Limited access to assigned projects and work orders', 30, true, '{"projects": ["view", "update"], "work_orders": ["view"], "issues": ["view"], "documents": ["view"]}'),
  ('viewer', 'Viewer', 'Read-only access to all modules', 10, true, '{"properties": ["view"], "work_orders": ["view"], "inspections": ["view"], "issues": ["view"], "documents": ["view"]}'),
  ('user', 'Standard User', 'Basic authenticated access', 1, true, '{}')
ON CONFLICT (role_key) DO NOTHING;

-- 17. Seed default role permissions
INSERT INTO role_permissions (role_key, module, action, allowed) VALUES
  -- Admin has all permissions (handled via has_role check)
  -- Manager permissions
  ('manager', 'properties', 'view', true), ('manager', 'properties', 'create', true), ('manager', 'properties', 'update', true), ('manager', 'properties', 'delete', true),
  ('manager', 'people', 'view', true), ('manager', 'people', 'create', true), ('manager', 'people', 'update', true), ('manager', 'people', 'delete', true),
  ('manager', 'work_orders', 'view', true), ('manager', 'work_orders', 'create', true), ('manager', 'work_orders', 'update', true), ('manager', 'work_orders', 'delete', true), ('manager', 'work_orders', 'approve', true),
  ('manager', 'inspections', 'view', true), ('manager', 'inspections', 'create', true), ('manager', 'inspections', 'update', true),
  ('manager', 'projects', 'view', true), ('manager', 'projects', 'create', true), ('manager', 'projects', 'update', true),
  ('manager', 'issues', 'view', true), ('manager', 'issues', 'create', true), ('manager', 'issues', 'update', true),
  ('manager', 'documents', 'view', true), ('manager', 'documents', 'create', true), ('manager', 'documents', 'update', true), ('manager', 'documents', 'delete', true),
  ('manager', 'reports', 'view', true),
  -- Project Manager permissions
  ('project_manager', 'properties', 'view', true),
  ('project_manager', 'projects', 'view', true), ('project_manager', 'projects', 'create', true), ('project_manager', 'projects', 'update', true), ('project_manager', 'projects', 'delete', true), ('project_manager', 'projects', 'approve', true),
  ('project_manager', 'work_orders', 'view', true), ('project_manager', 'work_orders', 'create', true), ('project_manager', 'work_orders', 'update', true),
  ('project_manager', 'issues', 'view', true), ('project_manager', 'issues', 'create', true), ('project_manager', 'issues', 'update', true),
  ('project_manager', 'documents', 'view', true), ('project_manager', 'documents', 'create', true), ('project_manager', 'documents', 'update', true),
  -- Superintendent permissions
  ('superintendent', 'properties', 'view', true),
  ('superintendent', 'work_orders', 'view', true), ('superintendent', 'work_orders', 'create', true), ('superintendent', 'work_orders', 'update', true),
  ('superintendent', 'inspections', 'view', true), ('superintendent', 'inspections', 'create', true), ('superintendent', 'inspections', 'update', true),
  ('superintendent', 'issues', 'view', true), ('superintendent', 'issues', 'create', true), ('superintendent', 'issues', 'update', true),
  ('superintendent', 'documents', 'view', true), ('superintendent', 'documents', 'create', true), ('superintendent', 'documents', 'update', true),
  -- Inspector permissions
  ('inspector', 'properties', 'view', true),
  ('inspector', 'inspections', 'view', true), ('inspector', 'inspections', 'create', true), ('inspector', 'inspections', 'update', true),
  ('inspector', 'issues', 'view', true), ('inspector', 'issues', 'create', true), ('inspector', 'issues', 'update', true),
  ('inspector', 'work_orders', 'view', true), ('inspector', 'work_orders', 'update', true),
  ('inspector', 'documents', 'view', true), ('inspector', 'documents', 'create', true), ('inspector', 'documents', 'update', true),
  -- Owner permissions (read-only)
  ('owner', 'properties', 'view', true), ('owner', 'projects', 'view', true), ('owner', 'work_orders', 'view', true),
  ('owner', 'inspections', 'view', true), ('owner', 'issues', 'view', true), ('owner', 'documents', 'view', true), ('owner', 'reports', 'view', true),
  -- Subcontractor permissions
  ('subcontractor', 'projects', 'view', true), ('subcontractor', 'projects', 'update', true),
  ('subcontractor', 'work_orders', 'view', true), ('subcontractor', 'issues', 'view', true), ('subcontractor', 'documents', 'view', true),
  -- Viewer permissions (read-only)
  ('viewer', 'properties', 'view', true), ('viewer', 'work_orders', 'view', true), ('viewer', 'inspections', 'view', true),
  ('viewer', 'issues', 'view', true), ('viewer', 'documents', 'view', true)
ON CONFLICT (role_key, module, action) DO NOTHING;