-- ============================================================
-- WS-5 · #5 · current_tenant_id() falls back to get_my_workspace_id().
-- ============================================================
-- Root cause of the blank Photo gallery: the B4 photos family RLS keys
-- on public.current_tenant_id(), which only read the JWT 'tenant_id'
-- claim:
--
--   SELECT NULLIF(auth.jwt() ->> 'tenant_id', '')::uuid;
--
-- This deployment does NOT inject that claim — the app resolves tenancy
-- via public.get_my_workspace_id() (profiles.workspace_id). So
-- current_tenant_id() returned NULL, every photos SELECT matched zero
-- rows, and the gallery was blank with no error.
--
-- This redefines current_tenant_id() to COALESCE the JWT claim with
-- get_my_workspace_id(). It only ADDS a fallback when the claim is
-- absent; deployments that DO set the claim are unaffected. This is not
-- a weakening of isolation — it aligns the two tenant resolvers so the
-- photos RLS (and any other current_tenant_id()-keyed policy) resolves
-- the caller's real workspace. WITH CHECK still validates writes.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'tenant_id', '')::uuid,
    public.get_my_workspace_id()
  );
$$;

COMMIT;
