-- Durable, tenant-safe project ownership for intake, portfolio cards, and audit.

BEGIN;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_owner_user_id_fkey'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_owner_user_id_fkey
      FOREIGN KEY (owner_user_id)
      REFERENCES public.profiles(user_id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

COMMENT ON COLUMN public.projects.owner_user_id IS
  'Accountable internal owner selected at project intake. Historical projects may remain unassigned until an administrator assigns them.';

CREATE INDEX IF NOT EXISTS projects_owner_active_idx
  ON public.projects (workspace_id, owner_user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_owner_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  previous_owner_user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  owner_user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_owner_events_project_idx
  ON public.project_owner_events (project_id, changed_at DESC);

ALTER TABLE public.project_owner_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_owner_events_tenant_select ON public.project_owner_events;
CREATE POLICY project_owner_events_tenant_select
  ON public.project_owner_events
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Ownership history is append-only and is written by the project trigger.
REVOKE INSERT, UPDATE, DELETE ON public.project_owner_events FROM authenticated;

CREATE OR REPLACE FUNCTION public.validate_project_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_workspace uuid;
  v_owner_status text;
BEGIN
  -- New projects always have an accountable owner. The intake UI supplies the
  -- selection; created_by is a safe fallback for API and legacy callers.
  IF TG_OP = 'INSERT' AND NEW.owner_user_id IS NULL THEN
    NEW.owner_user_id := NEW.created_by;
  END IF;

  -- Reassignment is an administrative operation. Ordinary project edits that
  -- preserve the same owner continue to work for project managers.
  IF TG_OP = 'UPDATE'
     AND NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id
     AND NOT public.is_workspace_admin(auth.uid())
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Only a workspace administrator can change the project owner';
  END IF;

  IF NEW.owner_user_id IS NOT NULL
     AND (
       TG_OP = 'INSERT'
       OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id
       OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     ) THEN
    SELECT p.workspace_id, COALESCE(p.status, 'active')
      INTO v_owner_workspace, v_owner_status
      FROM public.profiles p
     WHERE p.user_id = NEW.owner_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Project owner was not found';
    END IF;

    IF v_owner_workspace IS DISTINCT FROM NEW.workspace_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Project owner must belong to the same workspace as the project';
    END IF;

    IF v_owner_status <> 'active' THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Project owner must be an active account member';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger names are ordered so workspace derivation runs before owner validation.
DROP TRIGGER IF EXISTS trg_validate_project_owner ON public.projects;
CREATE TRIGGER trg_validate_project_owner
  BEFORE INSERT OR UPDATE OF owner_user_id, workspace_id, created_by
  ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.validate_project_owner();

CREATE OR REPLACE FUNCTION public.audit_project_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.owner_user_id IS NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.project_owner_events (
      tenant_id,
      project_id,
      previous_owner_user_id,
      owner_user_id,
      changed_by
    ) VALUES (
      NEW.workspace_id,
      NEW.id,
      NULL,
      NEW.owner_user_id,
      auth.uid()
    );
    RETURN NEW;
  END IF;

  IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
    INSERT INTO public.project_owner_events (
      tenant_id,
      project_id,
      previous_owner_user_id,
      owner_user_id,
      changed_by
    ) VALUES (
      NEW.workspace_id,
      NEW.id,
      OLD.owner_user_id,
      NEW.owner_user_id,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_project_owner ON public.projects;
CREATE TRIGGER trg_audit_project_owner
  AFTER INSERT OR UPDATE OF owner_user_id
  ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.audit_project_owner();

-- Client-scoped projects use narrow SECURITY DEFINER functions. These owner-
-- aware variants keep project creation/update atomic without breaking existing
-- callers of create_client_project and update_client_project.
CREATE OR REPLACE FUNCTION public.create_client_project_with_owner(
  p_client_id uuid,
  p_name text,
  p_project_type text DEFAULT 'construction',
  p_description text DEFAULT NULL,
  p_scope text DEFAULT NULL,
  p_budget numeric DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_target_end_date date DEFAULT NULL,
  p_status public.project_status DEFAULT 'planning',
  p_owner_user_id uuid DEFAULT NULL
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
    created_by,
    owner_user_id
  ) VALUES (
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
    auth.uid(),
    COALESCE(p_owner_user_id, auth.uid())
  )
  RETURNING * INTO v_project;

  RETURN v_project;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_client_project_with_owner(
  p_project_id uuid,
  p_name text,
  p_project_type text,
  p_description text DEFAULT NULL,
  p_scope text DEFAULT NULL,
  p_budget numeric DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_target_end_date date DEFAULT NULL,
  p_status public.project_status DEFAULT NULL,
  p_owner_user_id uuid DEFAULT NULL
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
         status = COALESCE(p_status, v_existing.status),
         owner_user_id = COALESCE(p_owner_user_id, v_existing.owner_user_id)
   WHERE id = p_project_id
   RETURNING * INTO v_project;

  RETURN v_project;
END;
$$;

REVOKE ALL ON FUNCTION public.create_client_project_with_owner(uuid, text, text, text, text, numeric, date, date, public.project_status, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_client_project_with_owner(uuid, text, text, text, text, numeric, date, date, public.project_status, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_client_project_with_owner(uuid, text, text, text, text, numeric, date, date, public.project_status, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_project_with_owner(uuid, text, text, text, text, numeric, date, date, public.project_status, uuid) TO authenticated;

COMMIT;
