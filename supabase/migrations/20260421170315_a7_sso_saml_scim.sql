-- ============================================================
-- A7 · SSO / SAML 2.0 / SCIM 2.0
-- Enterprise-only; gated by plans.features.sso / plans.features.scim.
-- ============================================================

-- 1. Per-tenant SSO configuration (SAML 2.0 or OIDC)
CREATE TABLE IF NOT EXISTS public.tenant_sso_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('saml','oidc')),
  -- SAML fields
  idp_metadata_xml text,
  idp_sso_url text,
  idp_entity_id text,
  idp_certificate text,
  acs_url text NOT NULL,              -- our SP endpoint where IdP posts assertions
  sp_entity_id text NOT NULL,         -- our SP entity id (e.g. urn:procore-lite:tenant-<id>)
  -- OIDC fields (for future)
  oidc_discovery_url text,
  oidc_client_id text,
  oidc_client_secret_enc text,        -- encrypted application-side; never plaintext
  -- enforcement + mapping
  is_enforced boolean NOT NULL DEFAULT false,
  default_template_id uuid REFERENCES public.permission_templates(id) ON DELETE SET NULL,
  attribute_mapping jsonb NOT NULL DEFAULT '{"email":"email","first_name":"firstName","last_name":"lastName"}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_sso_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tsc_tenant ON public.tenant_sso_configs FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- 2. SCIM bearer tokens (one or more per tenant; rotate independently)
CREATE TABLE IF NOT EXISTS public.tenant_scim_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,                  -- human label: "Okta production", "Azure AD test"
  token_prefix text NOT NULL,          -- first 8 chars for display
  hashed_token text NOT NULL UNIQUE,   -- SHA-256 of the full token
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tst_tenant_active
  ON public.tenant_scim_tokens(tenant_id) WHERE revoked_at IS NULL;

ALTER TABLE public.tenant_scim_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY tst_tenant ON public.tenant_scim_tokens FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- 3. Login audit (successes + failures). Always append; never delete.
CREATE TABLE IF NOT EXISTS public.sso_login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text,
  ip inet,
  user_agent text,
  success boolean NOT NULL,
  error text,
  assertion_id text,                  -- for idempotency on replay
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sle_tenant_time
  ON public.sso_login_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_sle_assertion
  ON public.sso_login_events(assertion_id) WHERE assertion_id IS NOT NULL;

ALTER TABLE public.sso_login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY sle_tenant_read ON public.sso_login_events FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());
-- Writes only via service role (edge functions) — no INSERT/UPDATE/DELETE policy for authenticated.

-- 4. SCIM directory mirror: external users pushed from IdP
CREATE TABLE IF NOT EXISTS public.scim_external_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  external_id text NOT NULL,           -- IdP-assigned id (Okta, Azure AD, etc.)
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  given_name text,
  family_name text,
  display_name text,
  active boolean NOT NULL DEFAULT true,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_seu_tenant_email
  ON public.scim_external_users(tenant_id, LOWER(email));

ALTER TABLE public.scim_external_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY seu_tenant ON public.scim_external_users FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- 5. SCIM groups (optional — some IdPs push group membership for role assignment)
CREATE TABLE IF NOT EXISTS public.scim_external_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  display_name text NOT NULL,
  mapped_template_id uuid REFERENCES public.permission_templates(id) ON DELETE SET NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, external_id)
);

ALTER TABLE public.scim_external_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY seg_tenant ON public.scim_external_groups FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.scim_group_members (
  group_id uuid NOT NULL REFERENCES public.scim_external_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.scim_external_users(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.scim_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY sgm_via_group ON public.scim_group_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.scim_external_groups g
                 WHERE g.id = scim_group_members.group_id
                 AND (g.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.scim_external_groups g
                      WHERE g.id = scim_group_members.group_id
                      AND (g.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

DROP TRIGGER IF EXISTS trg_tsc_updated_at ON public.tenant_sso_configs;
CREATE TRIGGER trg_tsc_updated_at
  BEFORE UPDATE ON public.tenant_sso_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_seu_updated_at ON public.scim_external_users;
CREATE TRIGGER trg_seu_updated_at
  BEFORE UPDATE ON public.scim_external_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
