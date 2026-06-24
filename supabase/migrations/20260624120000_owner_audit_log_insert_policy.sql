-- Owner-portal audit log: allow authenticated owners to insert their own audit rows.
--
-- owner_audit_log shipped with RLS enabled but only a SELECT policy
-- (oal_tenant_read). The server-side SECURITY DEFINER functions (co-countersign
-- approve/reject) insert via elevated privileges, but the owner pay-app
-- approval/reject UI writes audit rows directly from the client. Without an
-- INSERT policy those writes are denied by RLS, which broke the owner
-- pay-app "Reject with reason" flow entirely.
--
-- This policy is additive and non-destructive: it only grants INSERTs that are
-- scoped to the caller's own tenant and authored by the caller themselves.

-- Idempotent: safe to re-run (DROP guard, since CREATE POLICY has no IF NOT EXISTS).
DROP POLICY IF EXISTS oal_tenant_insert ON public.owner_audit_log;
CREATE POLICY oal_tenant_insert ON public.owner_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    AND user_id = auth.uid()
  );
