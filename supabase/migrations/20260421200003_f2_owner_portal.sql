-- ============================================================
-- F2 · Owner Portal — reuses F1 portal_memberships + portal_invitations.
-- Adds owner-scoped RLS + an audit log for owner actions.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.owner_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,             -- 'oco.approve' | 'oco.reject' | 'pay_app.approve' | 'pay_app.reject'
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip inet,
  user_agent text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oal_tenant_time
  ON public.owner_audit_log(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_oal_object
  ON public.owner_audit_log(object_type, object_id);

ALTER TABLE public.owner_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY oal_tenant_read ON public.owner_audit_log FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());
-- Writes only via service role (edge functions / SECURITY DEFINER routines).

-- Prime contract: owner sees contracts where owner_org_id matches their orgs
CREATE POLICY prime_contract_owner_portal_select ON public.prime_contracts FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'owner'
    AND owner_org_id = ANY(public.current_user_orgs())
  );

-- Change orders: owner sees PCO/OCO on their prime contracts (not CCOs)
CREATE POLICY co_owner_portal_select ON public.change_orders FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'owner'
    AND co_type IN ('PCO','OCO')
    AND EXISTS (
      SELECT 1 FROM public.prime_contracts pc
      WHERE pc.id = change_orders.prime_contract_id
        AND pc.owner_org_id = ANY(public.current_user_orgs())
    )
  );

-- Pay apps: owner sees pay apps on their prime contracts
CREATE POLICY payapps_owner_portal_select ON public.prime_contract_pay_apps FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'owner'
    AND EXISTS (
      SELECT 1 FROM public.prime_contracts pc
      WHERE pc.id = prime_contract_pay_apps.prime_contract_id
        AND pc.owner_org_id = ANY(public.current_user_orgs())
    )
  );

-- Pay-app approval update: owner can update status + approved_amount on their own
CREATE POLICY payapps_owner_portal_update ON public.prime_contract_pay_apps FOR UPDATE TO authenticated
  USING (
    public.current_portal_kind() = 'owner'
    AND EXISTS (
      SELECT 1 FROM public.prime_contracts pc
      WHERE pc.id = prime_contract_pay_apps.prime_contract_id
        AND pc.owner_org_id = ANY(public.current_user_orgs())
    )
  )
  WITH CHECK (
    public.current_portal_kind() = 'owner'
    AND EXISTS (
      SELECT 1 FROM public.prime_contracts pc
      WHERE pc.id = prime_contract_pay_apps.prime_contract_id
        AND pc.owner_org_id = ANY(public.current_user_orgs())
    )
  );

-- RPC: owner approves an OCO (sets status=executed + executed_date, writes audit row)
CREATE OR REPLACE FUNCTION public.owner_approve_oco(
  p_co_id uuid,
  p_signature_path text DEFAULT NULL
)
RETURNS public.change_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.change_orders;
  v_portal text := public.current_portal_kind();
BEGIN
  IF v_portal <> 'owner' THEN
    RAISE EXCEPTION 'Only owner portal users can approve OCOs';
  END IF;

  SELECT * INTO v_row FROM public.change_orders WHERE id = p_co_id;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'CO not found'; END IF;
  IF v_row.co_type NOT IN ('PCO','OCO') THEN
    RAISE EXCEPTION 'Only PCO/OCO can be approved by owner';
  END IF;

  UPDATE public.change_orders
    SET co_type = 'OCO',
        status = 'executed',
        executed_date = COALESCE(executed_date, current_date)
    WHERE id = p_co_id
    RETURNING * INTO v_row;

  INSERT INTO public.owner_audit_log (tenant_id, user_id, action, object_type, object_id, meta)
    VALUES (v_row.tenant_id, auth.uid(), 'oco.approve', 'change_order', p_co_id,
            jsonb_build_object('signature_path', p_signature_path));

  RETURN v_row;
END;
$$;

-- RPC: owner rejects an OCO
CREATE OR REPLACE FUNCTION public.owner_reject_oco(
  p_co_id uuid,
  p_reason text
)
RETURNS public.change_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.change_orders;
BEGIN
  IF public.current_portal_kind() <> 'owner' THEN
    RAISE EXCEPTION 'Only owner portal users can reject OCOs';
  END IF;
  UPDATE public.change_orders
    SET status = 'rejected'
    WHERE id = p_co_id
    RETURNING * INTO v_row;

  INSERT INTO public.owner_audit_log (tenant_id, user_id, action, object_type, object_id, meta)
    VALUES (v_row.tenant_id, auth.uid(), 'oco.reject', 'change_order', p_co_id,
            jsonb_build_object('reason', p_reason));
  RETURN v_row;
END;
$$;

-- Signature storage bucket for owner e-signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('owner-signatures', 'owner-signatures', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS owner_signatures_read ON storage.objects;
CREATE POLICY owner_signatures_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'owner-signatures' AND (storage.foldername(name))[1] = public.current_tenant_id()::text);
DROP POLICY IF EXISTS owner_signatures_write ON storage.objects;
CREATE POLICY owner_signatures_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'owner-signatures' AND (storage.foldername(name))[1] = public.current_tenant_id()::text);
