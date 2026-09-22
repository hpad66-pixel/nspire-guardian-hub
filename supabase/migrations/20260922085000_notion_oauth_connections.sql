-- Proj OS public Notion OAuth integration.
-- Each Proj OS user can connect their own Notion workspace/pages. Tokens are
-- edge-only secrets; selected pages/databases are mapped into projects before
-- any content becomes part of reviewed project records.

CREATE TABLE IF NOT EXISTS public.notion_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notion_workspace_id text NOT NULL,
  workspace_name text,
  workspace_icon text,
  bot_id text NOT NULL,
  owner jsonb NOT NULL DEFAULT '{}'::jsonb,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','error')),
  last_error text,
  connected_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, notion_workspace_id)
);

COMMENT ON TABLE public.notion_connections IS
  'Per-user Notion OAuth token vault. No browser RLS policy: edge functions expose safe status only.';

ALTER TABLE public.notion_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notion_connections FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.notion_project_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.notion_connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  notion_object_id text NOT NULL,
  notion_object_type text NOT NULL CHECK (notion_object_type IN ('page','database')),
  notion_title text NOT NULL DEFAULT 'Untitled Notion source',
  notion_url text,
  mapping_purpose text NOT NULL DEFAULT 'meetings' CHECK (mapping_purpose IN ('meetings','documents','tasks','knowledge','other')),
  sync_direction text NOT NULL DEFAULT 'notion_to_proj_os' CHECK (sync_direction IN ('notion_to_proj_os','bidirectional_disabled')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived','error')),
  last_synced_at timestamptz,
  last_error text,
  mapped_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (client_id IS NOT NULL OR project_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS notion_project_mappings_project_idx
  ON public.notion_project_mappings (tenant_id, project_id, status);
CREATE INDEX IF NOT EXISTS notion_project_mappings_client_idx
  ON public.notion_project_mappings (tenant_id, client_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS notion_project_mappings_unique_active_source
  ON public.notion_project_mappings (
    tenant_id,
    connection_id,
    notion_object_id,
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    mapping_purpose
  )
  WHERE status <> 'archived';

ALTER TABLE public.notion_project_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notion_project_mappings_select ON public.notion_project_mappings;
CREATE POLICY notion_project_mappings_select ON public.notion_project_mappings
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      user_id = auth.uid()
      OR public.is_workspace_admin(auth.uid())
      OR public.is_super_admin()
    )
  );

DROP POLICY IF EXISTS notion_project_mappings_insert ON public.notion_project_mappings;
CREATE POLICY notion_project_mappings_insert ON public.notion_project_mappings
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND user_id = auth.uid()
    AND (
      public.is_workspace_admin(auth.uid())
      OR (project_id IS NOT NULL AND public.can_access_project(auth.uid(), project_id))
      OR (client_id IS NOT NULL AND public.is_client_member(auth.uid(), client_id))
    )
  );

DROP POLICY IF EXISTS notion_project_mappings_update ON public.notion_project_mappings;
CREATE POLICY notion_project_mappings_update ON public.notion_project_mappings
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      user_id = auth.uid()
      OR public.is_workspace_admin(auth.uid())
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      user_id = auth.uid()
      OR public.is_workspace_admin(auth.uid())
      OR public.is_super_admin()
    )
  );

CREATE TABLE IF NOT EXISTS public.notion_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  mapping_id uuid NOT NULL REFERENCES public.notion_project_mappings(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.notion_connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','needs_review')),
  source_last_edited_at timestamptz,
  imported_record_type text,
  imported_record_id uuid,
  summary text,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notion_sync_runs_mapping_idx
  ON public.notion_sync_runs (tenant_id, mapping_id, created_at DESC);

ALTER TABLE public.notion_sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notion_sync_runs_select ON public.notion_sync_runs;
CREATE POLICY notion_sync_runs_select ON public.notion_sync_runs
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      user_id = auth.uid()
      OR public.is_workspace_admin(auth.uid())
      OR public.is_super_admin()
    )
  );

CREATE OR REPLACE FUNCTION public.guard_notion_project_mapping()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connection record;
  v_project record;
  v_client record;
BEGIN
  SELECT tenant_id, user_id INTO v_connection
  FROM public.notion_connections
  WHERE id = NEW.connection_id;

  IF v_connection.tenant_id IS NULL THEN
    RAISE EXCEPTION 'Notion connection not found';
  END IF;

  IF NEW.tenant_id <> v_connection.tenant_id OR NEW.user_id <> v_connection.user_id THEN
    RAISE EXCEPTION 'Notion mapping boundary mismatch';
  END IF;

  IF NEW.project_id IS NOT NULL THEN
    SELECT workspace_id, client_id INTO v_project FROM public.projects WHERE id = NEW.project_id;
    IF v_project.workspace_id IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'Project does not belong to this workspace';
    END IF;
    IF NEW.client_id IS NULL THEN
      NEW.client_id := v_project.client_id;
    ELSIF NEW.client_id IS DISTINCT FROM v_project.client_id THEN
      RAISE EXCEPTION 'Project and client mismatch';
    END IF;
  END IF;

  IF NEW.client_id IS NOT NULL THEN
    SELECT workspace_id INTO v_client FROM public.clients WHERE id = NEW.client_id;
    IF v_client.workspace_id IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'Client does not belong to this workspace';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notion_project_mapping_boundary ON public.notion_project_mappings;
CREATE TRIGGER notion_project_mapping_boundary
BEFORE INSERT OR UPDATE ON public.notion_project_mappings
FOR EACH ROW EXECUTE FUNCTION public.guard_notion_project_mapping();

NOTIFY pgrst, 'reload schema';
