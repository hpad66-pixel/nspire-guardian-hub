-- Administrator exception handling and vendor missing-information requests.
-- An exception may create a DRAFT, but it never bypasses approval, contractor
-- readiness, payment evidence, tenant isolation, or source-file controls.

BEGIN;

ALTER TABLE public.vendor_submissions
  ADD COLUMN IF NOT EXISTS admin_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_override_reason text,
  ADD COLUMN IF NOT EXISTS admin_override_fields text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS admin_override_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS admin_override_at timestamptz,
  ADD COLUMN IF NOT EXISTS missing_info_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS missing_info_requested_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS missing_info_requested_to text,
  ADD COLUMN IF NOT EXISTS missing_info_requirements text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.vendor_submissions
  DROP CONSTRAINT IF EXISTS vendor_submissions_admin_override_reason_check,
  ADD CONSTRAINT vendor_submissions_admin_override_reason_check CHECK (
    NOT admin_override OR length(btrim(COALESCE(admin_override_reason, ''))) >= 10
  ),
  DROP CONSTRAINT IF EXISTS vendor_submissions_missing_info_email_check,
  ADD CONSTRAINT vendor_submissions_missing_info_email_check CHECK (
    missing_info_requested_to IS NULL OR position('@' IN missing_info_requested_to) > 1
  );

CREATE OR REPLACE FUNCTION public.stamp_vendor_submission_admin_actions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admin_override AND NOT public.can_manage_consulting_ap(NEW.tenant_id) THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED: only an administrator can record an invoice exception';
  END IF;
  IF NEW.admin_override THEN
    IF TG_OP = 'INSERT' THEN
      NEW.admin_override_by := auth.uid();
      NEW.admin_override_at := now();
    ELSIF OLD.admin_override IS DISTINCT FROM NEW.admin_override
       OR OLD.admin_override_reason IS DISTINCT FROM NEW.admin_override_reason
       OR OLD.admin_override_fields IS DISTINCT FROM NEW.admin_override_fields THEN
      NEW.admin_override_by := auth.uid();
      NEW.admin_override_at := now();
    END IF;
  ELSIF NOT NEW.admin_override THEN
    NEW.admin_override_by := NULL;
    NEW.admin_override_at := NULL;
  END IF;

  IF NEW.missing_info_requested_at IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      IF NOT public.can_manage_consulting_ap(NEW.tenant_id) THEN
        RAISE EXCEPTION 'ADMIN_REQUIRED: only an administrator can request vendor invoice information';
      END IF;
      NEW.missing_info_requested_by := auth.uid();
    ELSIF OLD.missing_info_requested_at IS DISTINCT FROM NEW.missing_info_requested_at THEN
      IF NOT public.can_manage_consulting_ap(NEW.tenant_id) THEN
        RAISE EXCEPTION 'ADMIN_REQUIRED: only an administrator can request vendor invoice information';
      END IF;
      NEW.missing_info_requested_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_submission_admin_actions ON public.vendor_submissions;
CREATE TRIGGER trg_vendor_submission_admin_actions
  BEFORE INSERT OR UPDATE ON public.vendor_submissions
  FOR EACH ROW EXECUTE FUNCTION public.stamp_vendor_submission_admin_actions();

CREATE INDEX IF NOT EXISTS vendor_submissions_missing_info_idx
  ON public.vendor_submissions(project_id, missing_info_requested_at DESC)
  WHERE missing_info_requested_at IS NOT NULL;

ALTER TABLE public.consulting_costs
  ADD COLUMN IF NOT EXISTS vendor_submission_id uuid REFERENCES public.vendor_submissions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS is_admin_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_override_reason text,
  ADD COLUMN IF NOT EXISTS admin_override_fields text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.consulting_costs
  DROP CONSTRAINT IF EXISTS consulting_costs_amount_check,
  ADD CONSTRAINT consulting_costs_amount_check CHECK (
    amount > 0 OR (amount = 0 AND is_admin_override)
  ),
  DROP CONSTRAINT IF EXISTS consulting_costs_admin_override_reason_check,
  ADD CONSTRAINT consulting_costs_admin_override_reason_check CHECK (
    NOT is_admin_override OR length(btrim(COALESCE(admin_override_reason, ''))) >= 10
  );

CREATE INDEX IF NOT EXISTS consulting_costs_vendor_submission_idx
  ON public.consulting_costs(vendor_submission_id)
  WHERE vendor_submission_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_consulting_invoice_from_submission(
  p_submission_id uuid,
  p_vendor_organization_id uuid,
  p_reference_no text,
  p_bill_date date,
  p_due_date date,
  p_amount numeric,
  p_description text,
  p_cost_type text DEFAULT 'subcontractor'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tenant uuid := public.current_tenant_id();
  v_submission public.vendor_submissions%ROWTYPE;
  v_vendor_name text;
  v_cost uuid := gen_random_uuid();
  v_source_note text;
BEGIN
  IF v_user IS NULL OR v_tenant IS NULL OR NOT public.can_manage_consulting_ap(v_tenant) THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED: only an administrator can create this vendor invoice';
  END IF;
  IF p_cost_type NOT IN ('subcontractor','consultant','reimbursable','internal_labor','other') THEN
    RAISE EXCEPTION 'INVALID_COST_TYPE: choose a supported cost type';
  END IF;

  SELECT * INTO v_submission FROM public.vendor_submissions
  WHERE id = p_submission_id AND tenant_id = v_tenant
    AND doc_type = 'invoice' AND status IN ('parsed','needs_review','received')
  FOR UPDATE;
  IF NOT FOUND OR v_submission.artifact_id IS NULL THEN
    RAISE EXCEPTION 'INVOICE_SOURCE_REQUIRED: save the uploaded PDF before processing';
  END IF;
  IF v_submission.created_commitment_invoice_id IS NOT NULL OR v_submission.created_consulting_cost_id IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE_INVOICE: this uploaded invoice has already been processed';
  END IF;
  IF COALESCE(p_amount, 0) < 0 OR (COALESCE(p_amount, 0) = 0 AND NOT v_submission.admin_override) THEN
    RAISE EXCEPTION 'INVOICE_AMOUNT_REQUIRED: confirm an amount greater than zero or document an administrator exception';
  END IF;
  IF v_submission.admin_override AND length(btrim(COALESCE(v_submission.admin_override_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'ADMIN_OVERRIDE_REASON_REQUIRED: explain the administrator exception';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = v_submission.project_id
      AND p.workspace_id = v_tenant AND p.deleted_at IS NULL
      AND lower(COALESCE(p.project_type, '')) IN ('consulting','client')
  ) THEN RAISE EXCEPTION 'PROJECT_TYPE_MISMATCH: use the construction commitment workflow for this project'; END IF;
  SELECT name INTO v_vendor_name FROM public.organizations
  WHERE id = p_vendor_organization_id AND tenant_id = v_tenant AND is_active = true;
  IF v_vendor_name IS NULL THEN RAISE EXCEPTION 'VENDOR_NOT_FOUND: confirm a project vendor'; END IF;

  UPDATE public.project_artifacts SET linked_entity_type = 'consulting_cost', linked_entity_id = v_cost
  WHERE id = v_submission.artifact_id AND tenant_id = v_tenant
    AND project_id = v_submission.project_id AND artifact_type = 'invoice'
    AND linked_entity_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVOICE_SOURCE_REQUIRED: source PDF is missing, mismatched, or already claimed'; END IF;

  v_source_note := CASE WHEN v_submission.admin_override
    THEN 'Administrator exception: ' || btrim(v_submission.admin_override_reason)
    ELSE 'Vendor-supplied invoice received outside the portal and uploaded by an administrator; confirm authorship during review.'
  END;

  INSERT INTO public.consulting_costs (
    id, tenant_id, project_id, vendor_org_id, vendor_name, cost_type,
    reference_no, description, bill_date, due_date, amount, status,
    invoice_artifact_id, vendor_submission_id, source_kind, source_status, source_note,
    is_admin_override, admin_override_reason, admin_override_fields,
    submitted_at, submitted_by, created_by
  ) VALUES (
    v_cost, v_tenant, v_submission.project_id, p_vendor_organization_id, v_vendor_name, p_cost_type,
    NULLIF(btrim(p_reference_no), ''), NULLIF(btrim(p_description), ''), COALESCE(p_bill_date, current_date),
    p_due_date, COALESCE(p_amount, 0), 'draft', v_submission.artifact_id, v_submission.id,
    'admin_on_behalf', 'received', v_source_note,
    v_submission.admin_override, v_submission.admin_override_reason, v_submission.admin_override_fields,
    now(), v_user, v_user
  );

  UPDATE public.vendor_submissions
  SET status = 'processed', created_consulting_cost_id = v_cost
  WHERE id = v_submission.id;

  INSERT INTO public.consulting_ap_audit_log (
    tenant_id, project_id, entity_type, entity_id, action, actor_id, metadata
  ) VALUES (
    v_tenant, v_submission.project_id, 'invoice', v_cost,
    CASE WHEN v_submission.admin_override THEN 'created_with_admin_override' ELSE 'created_from_ai_invoice_intake' END,
    v_user,
    jsonb_build_object(
      'submission_id', v_submission.id,
      'artifact_id', v_submission.artifact_id,
      'admin_override', v_submission.admin_override,
      'override_reason', v_submission.admin_override_reason,
      'override_fields', v_submission.admin_override_fields
    )
  );
  RETURN v_cost;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_small_vendor_invoice_from_submission(
  p_submission_id uuid,
  p_vendor_organization_id uuid,
  p_cost_code_id uuid,
  p_invoice_no text,
  p_period_end date,
  p_amount numeric,
  p_description text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tenant uuid := public.current_tenant_id();
  v_submission public.vendor_submissions%ROWTYPE;
  v_vendor_name text;
  v_commitment uuid;
  v_invoice uuid;
  v_sov uuid;
  v_commitment_no text;
BEGIN
  IF v_user IS NULL OR v_tenant IS NULL OR NOT public.can_manage_consulting_ap(v_tenant) THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED: only an administrator can create this small-vendor commitment';
  END IF;

  SELECT * INTO v_submission FROM public.vendor_submissions
  WHERE id = p_submission_id AND tenant_id = v_tenant
    AND doc_type = 'invoice' AND status IN ('parsed','needs_review','received')
  FOR UPDATE;
  IF NOT FOUND OR v_submission.artifact_id IS NULL THEN
    RAISE EXCEPTION 'INVOICE_SOURCE_REQUIRED: save the uploaded PDF before processing';
  END IF;
  IF v_submission.created_commitment_invoice_id IS NOT NULL OR v_submission.created_consulting_cost_id IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE_INVOICE: this uploaded invoice has already been processed';
  END IF;
  IF COALESCE(p_amount, 0) < 0 OR (COALESCE(p_amount, 0) = 0 AND NOT v_submission.admin_override) THEN
    RAISE EXCEPTION 'INVOICE_AMOUNT_REQUIRED: confirm an amount greater than zero or document an administrator exception';
  END IF;
  IF v_submission.admin_override AND length(btrim(COALESCE(v_submission.admin_override_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'ADMIN_OVERRIDE_REASON_REQUIRED: explain the administrator exception';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = v_submission.project_id
      AND p.workspace_id = v_tenant AND p.deleted_at IS NULL
      AND lower(COALESCE(p.project_type, 'property')) NOT IN ('consulting','client')
  ) THEN RAISE EXCEPTION 'PROJECT_TYPE_MISMATCH: use the consulting vendor A/P workflow for this project'; END IF;
  SELECT name INTO v_vendor_name FROM public.organizations
  WHERE id = p_vendor_organization_id AND tenant_id = v_tenant AND is_active = true;
  IF v_vendor_name IS NULL THEN RAISE EXCEPTION 'VENDOR_NOT_FOUND: confirm a project vendor'; END IF;

  IF p_cost_code_id IS NULL AND NOT v_submission.admin_override THEN
    RAISE EXCEPTION 'COST_CODE_REQUIRED: choose an active cost code from this workspace';
  END IF;
  IF p_cost_code_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cost_codes cc JOIN public.cost_code_libraries lib ON lib.id = cc.library_id
    WHERE cc.id = p_cost_code_id AND cc.is_active = true AND lib.tenant_id = v_tenant
  ) THEN RAISE EXCEPTION 'COST_CODE_REQUIRED: choose an active cost code from this workspace'; END IF;

  v_commitment_no := 'PO-' || upper(regexp_replace(COALESCE(NULLIF(btrim(p_invoice_no), ''), left(v_submission.id::text, 8)), '[^A-Za-z0-9]+', '-', 'g'));
  IF EXISTS (SELECT 1 FROM public.commitments WHERE project_id = v_submission.project_id AND commitment_no = v_commitment_no) THEN
    v_commitment_no := left(v_commitment_no, 32) || '-' || left(v_submission.id::text, 6);
  END IF;

  INSERT INTO public.commitments (
    tenant_id, project_id, commitment_type, commitment_no, title,
    vendor_org_id, original_value, retainage_pct, status, created_by
  ) VALUES (
    v_tenant, v_submission.project_id, 'purchase_order', v_commitment_no,
    v_vendor_name || ' - ' || COALESCE(NULLIF(btrim(p_description), ''), 'Small contractor services'),
    p_vendor_organization_id, COALESCE(p_amount, 0), 0, 'draft', v_user
  ) RETURNING id INTO v_commitment;

  IF p_cost_code_id IS NOT NULL THEN
    INSERT INTO public.commitment_sov_lines (
      tenant_id, commitment_id, line_no, cost_code_id, description, scheduled_value
    ) VALUES (
      v_tenant, v_commitment, 1, p_cost_code_id,
      COALESCE(NULLIF(btrim(p_description), ''), 'Small contractor services'), COALESCE(p_amount, 0)
    ) RETURNING id INTO v_sov;
  END IF;

  v_invoice := public.process_vendor_submission_invoice(
    v_submission.id, v_commitment,
    COALESCE(NULLIF(btrim(p_invoice_no), ''), 'DOC-' || left(v_submission.id::text, 8)),
    COALESCE(p_period_end, current_date), COALESCE(p_amount, 0), 0
  );

  IF v_sov IS NOT NULL THEN
    INSERT INTO public.commitment_invoice_lines (
      invoice_id, sov_line_id, work_this_period, materials_stored, pct_complete
    ) VALUES (v_invoice, v_sov, COALESCE(p_amount, 0), 0, 100);
  END IF;

  INSERT INTO public.project_vendor_assignments (
    tenant_id, project_id, organization_id, relationship_role, source, created_by
  ) VALUES (
    v_tenant, v_submission.project_id, p_vendor_organization_id, 'vendor', 'invoice_intake', v_user
  ) ON CONFLICT (project_id, organization_id) DO UPDATE SET
    source = 'invoice_intake', is_active = true, updated_at = now();

  RETURN jsonb_build_object(
    'commitmentId', v_commitment,
    'invoiceId', v_invoice,
    'commitmentNo', v_commitment_no,
    'status', 'draft',
    'adminOverride', v_submission.admin_override,
    'nextStep', CASE WHEN v_submission.admin_override
      THEN 'Resolve the documented exception, complete contractor readiness, execute the commitment, and approve before payment.'
      ELSE 'Complete contractor readiness, execute the commitment, submit and approve the invoice, then record bank evidence.' END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_consulting_cost(p_cost_id uuid)
RETURNS public.consulting_costs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost public.consulting_costs%ROWTYPE;
  v_result public.consulting_costs%ROWTYPE;
  v_artifact public.project_artifacts%ROWTYPE;
BEGIN
  SELECT * INTO v_cost FROM public.consulting_costs WHERE id = p_cost_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulting vendor invoice not found'; END IF;
  IF NOT public.can_manage_consulting_ap(v_cost.tenant_id) THEN RAISE EXCEPTION 'Administrator approval required'; END IF;
  IF v_cost.status NOT IN ('draft','submitted','rejected') THEN RAISE EXCEPTION 'Only a draft or submitted invoice can be approved'; END IF;
  IF COALESCE(v_cost.amount, 0) <= 0 THEN
    RAISE EXCEPTION 'ADMIN_EXCEPTION_UNRESOLVED: enter and verify an invoice amount greater than zero before approval';
  END IF;
  IF v_cost.invoice_artifact_id IS NULL AND v_cost.source_kind <> 'historical_exception' THEN
    RAISE EXCEPTION 'INVOICE_SOURCE_REQUIRED: attach the vendor invoice or generated on-behalf invoice before approval';
  END IF;
  IF v_cost.invoice_artifact_id IS NOT NULL THEN
    SELECT * INTO v_artifact FROM public.project_artifacts WHERE id = v_cost.invoice_artifact_id;
    IF NOT FOUND OR v_artifact.tenant_id IS DISTINCT FROM v_cost.tenant_id
       OR v_artifact.project_id IS DISTINCT FROM v_cost.project_id THEN
      RAISE EXCEPTION 'Invoice artifact crosses the project or tenant boundary';
    END IF;
    IF v_artifact.artifact_type::text <> 'invoice'
       OR COALESCE(v_artifact.file_size, 0) <= 0
       OR COALESCE(v_artifact.mime_type, '') NOT IN ('application/pdf','image/jpeg','image/png','image/webp') THEN
      RAISE EXCEPTION 'Invoice artifact is missing an approved file type or file metadata';
    END IF;
  END IF;
  IF v_cost.source_kind IN ('vendor_upload','vendor_portal') AND v_cost.vendor_attested_at IS NULL THEN
    RAISE EXCEPTION 'VENDOR_ATTESTATION_REQUIRED: vendor-submitted invoices must carry vendor attestation';
  END IF;
  IF v_cost.vendor_org_id IS NOT NULL
     AND NOT public.contractor_can_proceed(v_cost.project_id, v_cost.vendor_org_id, 'payment') THEN
    RAISE EXCEPTION 'CONTRACTOR_READINESS_BLOCKED: complete required W-9, insurance, license, and payment controls first';
  END IF;
  IF v_cost.reference_no IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.consulting_costs c
    WHERE c.id <> v_cost.id AND c.project_id = v_cost.project_id
      AND COALESCE(c.vendor_org_id::text, lower(c.vendor_name)) = COALESCE(v_cost.vendor_org_id::text, lower(v_cost.vendor_name))
      AND lower(c.reference_no) = lower(v_cost.reference_no)
      AND c.status NOT IN ('rejected','void')
  ) THEN RAISE EXCEPTION 'DUPLICATE_INVOICE: this vendor invoice number already exists on the project'; END IF;

  PERFORM set_config('app.consulting_ap_action', 'approve', true);
  UPDATE public.consulting_costs SET
    status = 'approved', source_status = 'verified', approved_at = now(), approved_by = auth.uid(),
    reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = NULL
  WHERE id = p_cost_id RETURNING * INTO v_result;

  INSERT INTO public.consulting_ap_audit_log
    (tenant_id, project_id, entity_type, entity_id, action, actor_id, metadata)
  VALUES (v_result.tenant_id, v_result.project_id, 'invoice', v_result.id, 'approved', auth.uid(),
    jsonb_build_object('amount', v_result.amount, 'source_kind', v_result.source_kind,
      'was_admin_override', v_result.is_admin_override));
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_consulting_invoice_from_submission(uuid,uuid,text,date,date,numeric,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_consulting_invoice_from_submission(uuid,uuid,text,date,date,numeric,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_small_vendor_invoice_from_submission(uuid,uuid,uuid,text,date,numeric,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_small_vendor_invoice_from_submission(uuid,uuid,uuid,text,date,numeric,text) TO authenticated;
REVOKE ALL ON FUNCTION public.approve_consulting_cost(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_consulting_cost(uuid) TO authenticated;

COMMIT;
