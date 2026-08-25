-- Administrators may correct an owner receipt only while it is still
-- unallocated. Once any allocation exists, the cash record is part of the
-- reconciliation trail and must be corrected through an explicit reversal.

CREATE OR REPLACE FUNCTION public.can_correct_unallocated_prime_payment(_payment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'owner', 'administrator')
      )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.prime_payment_allocations ppa
      WHERE ppa.payment_id = _payment_id
    );
$$;

REVOKE ALL ON FUNCTION public.can_correct_unallocated_prime_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_correct_unallocated_prime_payment(uuid) TO authenticated;

DROP POLICY IF EXISTS prime_contract_payments_admin_update_unallocated
  ON public.prime_contract_payments;
CREATE POLICY prime_contract_payments_admin_update_unallocated
  ON public.prime_contract_payments
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (public.can_correct_unallocated_prime_payment(id))
  WITH CHECK (public.can_correct_unallocated_prime_payment(id));

DROP POLICY IF EXISTS prime_contract_payments_admin_delete_unallocated
  ON public.prime_contract_payments;
CREATE POLICY prime_contract_payments_admin_delete_unallocated
  ON public.prime_contract_payments
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (public.can_correct_unallocated_prime_payment(id));

COMMENT ON FUNCTION public.can_correct_unallocated_prime_payment(uuid) IS
  'True only for workspace administrator roles (or super admin) when an owner receipt has no allocation rows.';
