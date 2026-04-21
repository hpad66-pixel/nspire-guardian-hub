-- ============================================================
-- F3 · Public REST API + Webhooks.
-- Gated by A6 plan.features.api.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  client_id text NOT NULL UNIQUE,
  client_secret_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  rate_limit int NOT NULL DEFAULT 600,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_api_clients_tenant ON public.api_clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_clients_active ON public.api_clients(is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  api_client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  access_token_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON public.api_tokens(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_expires ON public.api_tokens(expires_at);

CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}'::text[],
  secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ws_tenant_active
  ON public.webhook_subscriptions(tenant_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  webhook_subscription_id uuid NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  response_status int,
  response_body text,
  attempt_no int NOT NULL DEFAULT 1,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wd_pending
  ON public.webhook_deliveries(next_retry_at) WHERE delivered_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wd_subscription
  ON public.webhook_deliveries(webhook_subscription_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.api_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  api_client_id uuid REFERENCES public.api_clients(id) ON DELETE SET NULL,
  date date NOT NULL,
  req_count bigint NOT NULL DEFAULT 0,
  error_count bigint NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, api_client_id, date)
);

CREATE INDEX IF NOT EXISTS idx_aud_tenant_date ON public.api_usage_daily(tenant_id, date DESC);

ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_clients_tenant ON public.api_clients FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Tokens are only readable by service role (for introspection), not the tenant UI
CREATE POLICY api_tokens_super_admin ON public.api_tokens FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY ws_tenant ON public.webhook_subscriptions FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY wd_tenant_read ON public.webhook_deliveries FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY aud_tenant_read ON public.api_usage_daily FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Helper: upsert daily request count (called by api-v1 edge fn)
CREATE OR REPLACE FUNCTION public.bump_api_usage(
  p_tenant_id uuid, p_client_id uuid, p_is_error boolean DEFAULT false
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.api_usage_daily (tenant_id, api_client_id, date, req_count, error_count)
    VALUES (p_tenant_id, p_client_id, current_date, 1, CASE WHEN p_is_error THEN 1 ELSE 0 END)
  ON CONFLICT (tenant_id, api_client_id, date)
  DO UPDATE SET
    req_count = api_usage_daily.req_count + 1,
    error_count = api_usage_daily.error_count + CASE WHEN p_is_error THEN 1 ELSE 0 END;
$$;

-- Helper: emit webhook events (called from triggers on financial + field tables)
CREATE OR REPLACE FUNCTION public.emit_webhook_event(
  p_tenant_id uuid, p_event_type text, p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.webhook_deliveries (tenant_id, webhook_subscription_id, event_type, payload, next_retry_at)
  SELECT ws.tenant_id, ws.id, p_event_type, p_payload, now()
  FROM public.webhook_subscriptions ws
  WHERE ws.tenant_id = p_tenant_id
    AND ws.is_active = true
    AND p_event_type = ANY(ws.events);
END;
$$;
