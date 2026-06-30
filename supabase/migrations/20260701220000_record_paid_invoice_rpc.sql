-- Atomic reconciliation: create the invoice + lien acknowledgment + payment and
-- mark paid in ONE transaction, then return the project's new paid-to-subs total.
-- Replaces a fragile 4-step client sequence (any step could fail mid-way and leave
-- an orphan invoice with no payment → the dashboard wouldn't move). All-or-nothing.
CREATE OR REPLACE FUNCTION public.record_paid_commitment_invoice(
  p_commitment_id uuid,
  p_invoice_no    text,
  p_amount        numeric,
  p_paid_date     date,
  p_reference     text DEFAULT NULL,
  p_vendor_name   text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant  uuid := public.current_tenant_id();
  v_user    uuid := auth.uid();
  v_project uuid;
  v_invoice uuid;
  v_paid    numeric(14,2);
BEGIN
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'No workspace for current user'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than 0'; END IF;

  -- The commitment must belong to the caller's workspace.
  SELECT project_id INTO v_project
    FROM public.commitments WHERE id = p_commitment_id AND tenant_id = v_tenant;
  IF v_project IS NULL THEN RAISE EXCEPTION 'Commitment not found in your workspace'; END IF;

  INSERT INTO public.commitment_invoices
    (tenant_id, commitment_id, invoice_no, period_end, status, submitted_amount, approved_amount, retainage_held)
  VALUES (v_tenant, p_commitment_id, p_invoice_no, p_paid_date, 'approved', p_amount, p_amount, 0)
  RETURNING id INTO v_invoice;

  -- The lien gate (trigger) requires an approved inbound release before payment.
  INSERT INTO public.lien_releases
    (tenant_id, project_id, direction, release_type, status, commitment_invoice_id, amount, through_date, claimant_name, title, created_by)
  VALUES (v_tenant, v_project, 'inbound', 'unconditional_progress', 'approved', v_invoice, p_amount, p_paid_date,
          p_vendor_name, 'Reconciliation acknowledgment (historical payment)', v_user);

  INSERT INTO public.commitment_payments
    (tenant_id, commitment_id, commitment_invoice_id, amount, paid_date, method, reference, notes, created_by)
  VALUES (v_tenant, p_commitment_id, v_invoice, p_amount, p_paid_date, 'other', p_reference, 'Reconciliation — reinstated payment', v_user);

  UPDATE public.commitment_invoices SET status = 'paid' WHERE id = v_invoice;

  SELECT COALESCE(SUM(cp.amount), 0) INTO v_paid
    FROM public.commitment_payments cp
    JOIN public.commitments cm ON cm.id = cp.commitment_id
    WHERE cm.project_id = v_project;

  RETURN jsonb_build_object('invoice_id', v_invoice, 'project_id', v_project, 'paid_to_subs', v_paid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_paid_commitment_invoice(uuid, text, numeric, date, text, text) TO authenticated;
