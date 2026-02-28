
-- 1. Platform admin flag on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_platform_admin boolean DEFAULT false;

-- 2. Subscription and seat tracking on workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS monthly_fee numeric(10,2) DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS seat_limit integer DEFAULT 10;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS seats_used integer DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS billing_contact_email text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS next_billing_date date;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS client_company text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS client_contact_name text;

-- 3. Owner-shareable flag on organization_documents
ALTER TABLE organization_documents ADD COLUMN IF NOT EXISTS shared_with_owner boolean DEFAULT false;

-- 4. Platform audit log table
CREATE TABLE IF NOT EXISTS platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  action text NOT NULL,
  target_workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE platform_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform admins only" ON platform_audit_log FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_platform_admin = true
  ));

-- 5. Cross-workspace function for platform admin
CREATE OR REPLACE FUNCTION get_all_workspaces_for_platform_admin()
RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE caller_is_admin boolean;
BEGIN
  SELECT is_platform_admin INTO caller_is_admin FROM profiles WHERE user_id = auth.uid();
  IF NOT caller_is_admin THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY SELECT json_build_object(
    'id', w.id, 'name', w.name, 'plan', w.plan, 'status', w.status,
    'monthly_fee', w.monthly_fee, 'seat_limit', w.seat_limit, 'seats_used', w.seats_used,
    'client_company', w.client_company, 'client_contact_name', w.client_contact_name,
    'billing_contact_email', w.billing_contact_email, 'billing_cycle', w.billing_cycle,
    'next_billing_date', w.next_billing_date, 'notes', w.notes, 'created_at', w.created_at,
    'active_user_count', (SELECT COUNT(*) FROM profiles p WHERE p.workspace_id = w.id),
    'modules', (SELECT row_to_json(wm) FROM workspace_modules wm WHERE wm.workspace_id = w.id)
  ) FROM workspaces w ORDER BY w.created_at DESC;
END; $$;
