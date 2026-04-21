-- ============================================================
-- A1 · Multi-Tenant Isolation Hardening
-- ============================================================
-- NOTE: In this codebase `public.tenants` is the RESIDENTIAL-LEASING
-- table (leases, occupants). The SaaS tenant concept is `public.workspaces`.
-- All Procore Lite `tenant_id` columns therefore reference workspaces(id).
-- This is documented in CLAUDE.md.
-- ============================================================

-- 1. Helper functions (STABLE so they can be inlined in RLS policies)
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(auth.jwt() ->> 'tenant_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_workspace_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.jwt() -> 'workspace_ids' IS NULL THEN ARRAY[]::uuid[]
    ELSE ARRAY(
      SELECT (value #>> '{}')::uuid
      FROM jsonb_array_elements(auth.jwt() -> 'workspace_ids')
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt() ->> 'role') = 'super_admin', false);
$$;

COMMENT ON FUNCTION public.current_tenant_id IS
  'Returns the workspace_id claim from the JWT. The SaaS "tenant" concept maps to workspaces in this codebase.';

-- 2. Tenant settings — per-workspace feature flags and defaults
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(tenant_id, key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_key
  ON public.tenant_settings(tenant_id, key);

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_settings_tenant_select ON public.tenant_settings
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY tenant_settings_tenant_modify ON public.tenant_settings
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- 3. Tenant API keys (for F3 Public REST API in Phase 4 — table created early)
CREATE TABLE IF NOT EXISTS public.tenant_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,           -- first 8 chars, for display (e.g. "pk_live_abc12345")
  hashed_key text NOT NULL UNIQUE,    -- sha-256 of the full key
  scopes text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant
  ON public.tenant_api_keys(tenant_id) WHERE revoked_at IS NULL;

ALTER TABLE public.tenant_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_api_keys_tenant_select ON public.tenant_api_keys
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY tenant_api_keys_tenant_modify ON public.tenant_api_keys
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- 4. Tenant-scoped storage bucket (path prefix {tenant_id}/...)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-files', 'tenant-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: only allow access to objects under your own tenant folder
DROP POLICY IF EXISTS "tenant_files_tenant_isolation_select" ON storage.objects;
CREATE POLICY "tenant_files_tenant_isolation_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-files'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "tenant_files_tenant_isolation_insert" ON storage.objects;
CREATE POLICY "tenant_files_tenant_isolation_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-files'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "tenant_files_tenant_isolation_update" ON storage.objects;
CREATE POLICY "tenant_files_tenant_isolation_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant-files'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "tenant_files_tenant_isolation_delete" ON storage.objects;
CREATE POLICY "tenant_files_tenant_isolation_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-files'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

-- 5. Updated-at trigger for tenant_settings
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_settings_updated_at ON public.tenant_settings;
CREATE TRIGGER trg_tenant_settings_updated_at
  BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Convenience view: current user's effective tenant context
CREATE OR REPLACE VIEW public.my_tenant_context AS
SELECT
  public.current_tenant_id() AS tenant_id,
  public.current_workspace_ids() AS workspace_ids,
  public.is_super_admin() AS is_super_admin;

GRANT SELECT ON public.my_tenant_context TO authenticated;
