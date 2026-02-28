
-- Security definer function to allow platform admins to create new workspaces
CREATE OR REPLACE FUNCTION public.platform_create_workspace(
  p_name text,
  p_client_company text DEFAULT NULL,
  p_client_contact_name text DEFAULT NULL,
  p_billing_contact_email text DEFAULT NULL,
  p_plan text DEFAULT 'trial',
  p_monthly_fee numeric DEFAULT 0,
  p_seat_limit integer DEFAULT 10,
  p_billing_cycle text DEFAULT 'monthly',
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean;
  v_workspace_id uuid;
BEGIN
  -- Only platform admins can create workspaces
  SELECT is_platform_admin INTO v_is_admin FROM profiles WHERE user_id = auth.uid();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied: platform admin required';
  END IF;

  INSERT INTO workspaces (
    name, client_company, client_contact_name, billing_contact_email,
    plan, monthly_fee, seat_limit, billing_cycle, notes, status
  ) VALUES (
    p_name, p_client_company, p_client_contact_name, p_billing_contact_email,
    p_plan, p_monthly_fee, p_seat_limit, p_billing_cycle, p_notes, 'active'
  )
  RETURNING id INTO v_workspace_id;

  -- Create default workspace_modules row
  INSERT INTO workspace_modules (workspace_id) VALUES (v_workspace_id)
  ON CONFLICT (workspace_id) DO NOTHING;

  -- Audit log
  INSERT INTO platform_audit_log (action, target_workspace_id, details)
  VALUES ('workspace_created', v_workspace_id, jsonb_build_object(
    'name', p_name,
    'client_company', p_client_company,
    'plan', p_plan,
    'monthly_fee', p_monthly_fee
  ));

  RETURN v_workspace_id;
END;
$$;
