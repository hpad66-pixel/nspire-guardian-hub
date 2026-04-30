-- ============================================================
-- A6 · Stripe Billing & Plans
-- Plan-based SaaS billing. Seat limits and feature gating enforced
-- at DB + app layer. Stripe webhook keeps tenant_subscriptions in sync.
-- ============================================================

-- 1. Plans (global catalog; not tenant-scoped)
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  stripe_price_id text,
  stripe_product_id text,
  seat_limit int,                          -- null = unlimited
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  billing_interval text NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month','year')),
  is_public boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Plans are public-readable so the marketing /pricing page can render them
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_public_select ON public.plans
  FOR SELECT TO authenticated, anon
  USING (is_public = true);
CREATE POLICY plans_super_admin_modify ON public.plans
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 2. Tenant subscriptions
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  seats int NOT NULL DEFAULT 1,
  trial_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_ts_tenant ON public.tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ts_status ON public.tenant_subscriptions(status);

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ts_tenant ON public.tenant_subscriptions FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- 3. Usage events (metered billing; Pro+ can exceed seat limit via usage tier)
CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  metric text NOT NULL,                    -- 'api_call' | 'storage_gb' | 'active_project'
  quantity numeric NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ue_tenant_metric_time
  ON public.usage_events(tenant_id, metric, occurred_at);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ue_tenant ON public.usage_events FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- 4. Invoices (mirror of Stripe invoices for fast in-app display)
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_invoice_id text UNIQUE,
  stripe_customer_id text,
  amount_due_cents int NOT NULL DEFAULT 0,
  amount_paid_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL,                    -- 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
  period_start timestamptz,
  period_end timestamptz,
  hosted_invoice_url text,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bi_tenant ON public.billing_invoices(tenant_id);

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY bi_tenant ON public.billing_invoices FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- 5. Stripe webhook idempotency
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id text PRIMARY KEY,                     -- Stripe event id (evt_...)
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_swe_type ON public.stripe_webhook_events(event_type);

-- Only service-role writes to the webhook log; authenticated can read their own via derived queries
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY swe_super_admin_read ON public.stripe_webhook_events
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- 6. Seed public plans
INSERT INTO public.plans (code, name, seat_limit, features, price_cents, billing_interval, sort_order)
VALUES
  ('starter', 'Starter', 5,
    jsonb_build_object(
      'sso', false, 'scim', false, 'api', false, 'webhooks', false,
      'subcontractor_portal', false, 'owner_portal', false,
      'reporting_advanced', false, 'custom_workflows', false,
      'storage_gb', 10, 'projects_limit', 3
    ),
    4900, 'month', 1),
  ('pro', 'Professional', 25,
    jsonb_build_object(
      'sso', false, 'scim', false, 'api', true, 'webhooks', true,
      'subcontractor_portal', true, 'owner_portal', true,
      'reporting_advanced', true, 'custom_workflows', true,
      'storage_gb', 100, 'projects_limit', 25
    ),
    9900, 'month', 2),
  ('enterprise', 'Enterprise', NULL,
    jsonb_build_object(
      'sso', true, 'scim', true, 'api', true, 'webhooks', true,
      'subcontractor_portal', true, 'owner_portal', true,
      'reporting_advanced', true, 'custom_workflows', true,
      'storage_gb', 1000, 'projects_limit', NULL
    ),
    0, 'month', 3)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      seat_limit = EXCLUDED.seat_limit,
      features = EXCLUDED.features,
      price_cents = EXCLUDED.price_cents,
      updated_at = now();

-- 7. Helper: get current tenant's subscription + plan (joined for quick feature checks)
CREATE OR REPLACE VIEW public.my_subscription AS
SELECT
  ts.id,
  ts.tenant_id,
  ts.plan_id,
  ts.status,
  ts.seats,
  ts.trial_end,
  ts.current_period_end,
  ts.cancel_at_period_end,
  p.code AS plan_code,
  p.name AS plan_name,
  p.seat_limit,
  p.features,
  p.price_cents
FROM public.tenant_subscriptions ts
JOIN public.plans p ON p.id = ts.plan_id
WHERE ts.tenant_id = public.current_tenant_id();

GRANT SELECT ON public.my_subscription TO authenticated;

-- 8. Feature gate function: canUseFeature(feature_key) → bool
CREATE OR REPLACE FUNCTION public.can_use_feature(p_feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (p.features ->> p_feature)::boolean
       FROM public.tenant_subscriptions ts
       JOIN public.plans p ON p.id = ts.plan_id
      WHERE ts.tenant_id = public.current_tenant_id()
        AND ts.status IN ('trialing','active','past_due')
      LIMIT 1),
    false
  ) OR public.is_super_admin();
$$;

-- 9. Seat check function: returns true if current tenant can invite another user
CREATE OR REPLACE FUNCTION public.can_add_seat(p_current_seats int DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sub AS (
    SELECT p.seat_limit, ts.seats
    FROM public.tenant_subscriptions ts
    JOIN public.plans p ON p.id = ts.plan_id
    WHERE ts.tenant_id = public.current_tenant_id()
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT sub.seat_limit IS NULL OR COALESCE(p_current_seats, sub.seats) < sub.seat_limit
       FROM sub),
    false
  ) OR public.is_super_admin();
$$;

DROP TRIGGER IF EXISTS trg_plans_updated_at ON public.plans;
CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ts_updated_at ON public.tenant_subscriptions;
CREATE TRIGGER trg_ts_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
