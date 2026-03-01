
-- Security-definer function: promote the calling user to 'owner' role
-- when they create a workspace via self-service onboarding.
-- Validates that the caller actually owns the workspace.
CREATE OR REPLACE FUNCTION public.promote_self_to_workspace_owner(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  -- Verify caller is the workspace owner
  SELECT owner_user_id INTO v_owner_id
  FROM workspaces WHERE id = p_workspace_id;

  IF v_owner_id IS NULL OR v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: you are not the owner of this workspace';
  END IF;

  -- Remove the default 'user' role if present
  DELETE FROM user_roles WHERE user_id = auth.uid() AND role = 'user';

  -- Grant 'owner' role (idempotent via ON CONFLICT)
  INSERT INTO user_roles (user_id, role)
  VALUES (auth.uid(), 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
