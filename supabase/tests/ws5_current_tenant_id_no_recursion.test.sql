-- ============================================================
-- WS-5 · #5 regression — current_tenant_id() must not recurse.
-- ============================================================
-- get_my_workspace_id() calls current_tenant_id() as its first COALESCE
-- branch. If current_tenant_id() calls get_my_workspace_id() back, a
-- claimless caller (no JWT 'tenant_id', which is this deployment's case)
-- recurses with no base case and Postgres raises "stack depth limit
-- exceeded". In a plain test session there is no request JWT and
-- auth.uid() is null, so a correct (acyclic) current_tenant_id() returns
-- NULL without raising. The pre-fix version raised here.
-- Run via: supabase test db
-- ============================================================

BEGIN;
SELECT plan(2);

SELECT lives_ok(
  $$ SELECT public.current_tenant_id() $$,
  'current_tenant_id() resolves without recursion for a claimless caller'
);

SELECT lives_ok(
  $$ SELECT public.get_my_workspace_id() $$,
  'get_my_workspace_id() resolves without recursion (it calls current_tenant_id)'
);

SELECT * FROM finish();
ROLLBACK;
