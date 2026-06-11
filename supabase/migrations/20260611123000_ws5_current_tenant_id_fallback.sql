-- ============================================================
-- WS-5 · #5 · current_tenant_id() falls back to profiles.workspace_id.
-- ============================================================
-- Root cause of the blank Photo gallery: the B4 photos family RLS keys
-- on public.current_tenant_id(), which only read the JWT 'tenant_id'
-- claim:
--
--   SELECT NULLIF(auth.jwt() ->> 'tenant_id', '')::uuid;
--
-- This deployment does NOT inject that claim — the app resolves tenancy
-- via profiles.workspace_id. So current_tenant_id() returned NULL, every
-- photos SELECT matched zero rows, and the gallery was blank with no error.
--
-- IMPORTANT — do NOT call get_my_workspace_id() here. That function is
-- defined (20260504120000_fix_get_my_workspace_id_fallbacks.sql) as
--   COALESCE(current_tenant_id(), profiles.workspace_id, portal_memberships, …)
-- i.e. it ALREADY calls current_tenant_id() as its first branch. Having
-- current_tenant_id() call get_my_workspace_id() back would form a cycle:
--   current_tenant_id() → get_my_workspace_id() → current_tenant_id() → …
-- With no JWT claim (this deployment's case) there is no base case, so
-- Postgres raises "stack depth limit exceeded". current_tenant_id() is
-- referenced by ~136 RLS clauses across ~35 tables, so that would break
-- nearly every authenticated query — far worse than the blank gallery.
--
-- The fix INLINES the profiles read instead of calling the sibling
-- resolver. This is acyclic: get_my_workspace_id() may still call
-- current_tenant_id() (which now never calls back), and the gallery
-- resolves because current_tenant_id() returns profiles.workspace_id
-- when the JWT claim is absent. WITH CHECK still validates writes. Only a
-- fallback is added when the claim is absent; deployments that DO set the
-- claim short-circuit on the first COALESCE branch, unchanged.
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
    (
      SELECT p.workspace_id
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
      LIMIT 1
    )
  );
$$;

COMMIT;
