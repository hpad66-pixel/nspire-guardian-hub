-- Proj OS MCP gateway audit trail.
--
-- MCP calls are authenticated with the existing public API token model:
-- api_clients -> oauth-token -> api_tokens. This table records every MCP
-- method/tool call without storing prompts, bearer tokens, or large payloads.

CREATE TABLE IF NOT EXISTS public.mcp_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  api_client_id uuid REFERENCES public.api_clients(id) ON DELETE SET NULL,
  method text NOT NULL,
  tool_name text,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'error')),
  error_code text,
  request_id text,
  client_name text,
  client_version text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_access_logs_tenant_created
  ON public.mcp_access_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_access_logs_client_created
  ON public.mcp_access_logs (api_client_id, created_at DESC);

ALTER TABLE public.mcp_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mcp_access_logs_tenant_read ON public.mcp_access_logs;
CREATE POLICY mcp_access_logs_tenant_read ON public.mcp_access_logs
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Edge functions insert via service role. No browser insert/update/delete policy.
