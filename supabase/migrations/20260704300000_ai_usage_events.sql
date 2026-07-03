-- Per-call AI usage + cost ledger. Written by edge functions (service role, which
-- bypasses RLS). Read is restricted: super admins see every workspace's usage
-- (platform-wide cost analytics); a workspace admin sees only their own rows.
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  project_id         uuid,                 -- loose ref (no FK) so logging never fails
  user_id            uuid,
  skill              text NOT NULL,        -- feature that made the call (skill_key / fn name)
  model              text NOT NULL,        -- claude model id actually used
  input_tokens       integer NOT NULL DEFAULT 0,
  output_tokens      integer NOT NULL DEFAULT 0,
  cache_read_tokens  integer NOT NULL DEFAULT 0,
  cache_write_tokens integer NOT NULL DEFAULT 0,
  cost_usd           numeric(12,6) NOT NULL DEFAULT 0,  -- snapshot at call time
  ok                 boolean NOT NULL DEFAULT true,
  latency_ms         integer,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_usage_events_read ON public.ai_usage_events
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());

CREATE INDEX IF NOT EXISTS ai_usage_events_created_idx ON public.ai_usage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_events_tenant_idx  ON public.ai_usage_events (tenant_id);
CREATE INDEX IF NOT EXISTS ai_usage_events_project_idx ON public.ai_usage_events (project_id);
CREATE INDEX IF NOT EXISTS ai_usage_events_model_idx   ON public.ai_usage_events (model);

NOTIFY pgrst, 'reload schema';
