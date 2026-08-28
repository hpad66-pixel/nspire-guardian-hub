-- Proge OS Agent API audit trail.
-- Service-role writes only; tenant administrators may read their own workspace.

CREATE TABLE IF NOT EXISTS public.agent_api_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  api_client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_id text,
  correlation_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_api_audit_tenant_created_idx
  ON public.agent_api_audit_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_api_audit_correlation_idx
  ON public.agent_api_audit_log (correlation_id);
CREATE INDEX IF NOT EXISTS agent_api_audit_project_idx
  ON public.agent_api_audit_log (project_id, created_at DESC)
  WHERE project_id IS NOT NULL;

ALTER TABLE public.agent_api_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_api_audit_tenant_select
  ON public.agent_api_audit_log
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

COMMENT ON TABLE public.agent_api_audit_log IS
  'Tenant-scoped immutable audit records for writes made through OAuth API clients and MCP.';

