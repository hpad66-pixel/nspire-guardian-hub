-- Universal, upload-first vendor invoice intake for consulting and construction.
-- The PDF remains the immutable source. AI-extracted values are proposals only:
-- an administrator confirms the vendor, project, accounting path, and totals.

BEGIN;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS apas_crm_contact_id text,
  ADD COLUMN IF NOT EXISTS apas_crm_sync_status text NOT NULL DEFAULT 'not_synced',
  ADD COLUMN IF NOT EXISTS apas_crm_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS apas_crm_sync_error text;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_apas_crm_sync_status_check,
  ADD CONSTRAINT organizations_apas_crm_sync_status_check
    CHECK (apas_crm_sync_status IN ('not_synced','syncing','synced','failed')),
  DROP CONSTRAINT IF EXISTS organizations_apas_crm_sync_error_length_check,
  ADD CONSTRAINT organizations_apas_crm_sync_error_length_check
    CHECK (apas_crm_sync_error IS NULL OR char_length(apas_crm_sync_error) <= 500);

CREATE INDEX IF NOT EXISTS organizations_apas_crm_contact_idx
  ON public.organizations(tenant_id, apas_crm_contact_id)
  WHERE apas_crm_contact_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.project_vendor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  relationship_role text NOT NULL DEFAULT 'vendor'
    CHECK (relationship_role IN ('vendor','subcontractor','consultant')),
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','invoice_intake','commitment','consulting_ap','crm')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, organization_id)
);

CREATE INDEX IF NOT EXISTS project_vendor_assignments_project_idx
  ON public.project_vendor_assignments(project_id, is_active, updated_at DESC);
CREATE INDEX IF NOT EXISTS project_vendor_assignments_org_idx
  ON public.project_vendor_assignments(organization_id, project_id);

INSERT INTO public.project_vendor_assignments (
  tenant_id, project_id, organization_id, relationship_role, source, created_by
)
SELECT DISTINCT
  c.tenant_id, c.project_id, c.vendor_org_id,
  CASE WHEN c.commitment_type = 'subcontract' THEN 'subcontractor' ELSE 'vendor' END,
  'commitment', c.created_by
FROM public.commitments c
WHERE c.vendor_org_id IS NOT NULL
ON CONFLICT (project_id, organization_id) DO NOTHING;

INSERT INTO public.project_vendor_assignments (
  tenant_id, project_id, organization_id, relationship_role, source, created_by
)
SELECT DISTINCT
  a.tenant_id, a.project_id, a.organization_id, 'consultant', 'consulting_ap', a.created_by
FROM public.consulting_vendor_assignments a
ON CONFLICT (project_id, organization_id) DO NOTHING;

ALTER TABLE public.project_vendor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_vendor_assignments_read ON public.project_vendor_assignments;
CREATE POLICY project_vendor_assignments_read
  ON public.project_vendor_assignments FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      tenant_id = public.current_tenant_id()
      AND public.current_portal_kind() = 'main'
      AND public.can_access_project(auth.uid(), project_id)
    )
  );

REVOKE ALL ON public.project_vendor_assignments FROM authenticated;
GRANT SELECT ON public.project_vendor_assignments TO authenticated;

ALTER TABLE public.vendor_submissions
  ADD COLUMN IF NOT EXISTS created_consulting_cost_id uuid
    REFERENCES public.consulting_costs(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.upsert_project_vendor_from_invoice(
  p_project_id uuid,
  p_existing_organization_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_kind text DEFAULT 'vendor',
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_address_line1 text DEFAULT NULL,
  p_address_line2 text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_country text DEFAULT 'US'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tenant uuid := public.current_tenant_id();
  v_org public.organizations%ROWTYPE;
  v_project_type text;
  v_kind text;
  v_role text;
  v_created boolean := false;
BEGIN
  IF v_user IS NULL OR v_tenant IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED: sign in before creating a project vendor';
  END IF;
  IF NOT public.can_manage_consulting_ap(v_tenant) THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED: only an administrator can confirm an invoice vendor';
  END IF;

  SELECT p.project_type INTO v_project_type
  FROM public.projects p
  WHERE p.id = p_project_id
    AND p.workspace_id = v_tenant
    AND p.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROJECT_NOT_FOUND: project is outside your workspace'; END IF;

  v_kind := CASE WHEN p_kind IN ('sub','vendor','consultant','other') THEN p_kind ELSE 'vendor' END;
  v_role := CASE WHEN v_kind = 'sub' THEN 'subcontractor' WHEN v_kind = 'consultant' THEN 'consultant' ELSE 'vendor' END;

  IF p_existing_organization_id IS NOT NULL THEN
    SELECT * INTO v_org FROM public.organizations
    WHERE id = p_existing_organization_id AND tenant_id = v_tenant AND is_active = true
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'VENDOR_NOT_FOUND: choose an active vendor in this workspace'; END IF;
    IF v_org.kind NOT IN ('sub','vendor','consultant','other') THEN
      RAISE EXCEPTION 'VENDOR_TYPE_REQUIRED: the selected company is not a vendor, subcontractor, or consultant';
    END IF;
  ELSE
    IF NULLIF(btrim(p_name), '') IS NULL THEN RAISE EXCEPTION 'VENDOR_NAME_REQUIRED: confirm the vendor name'; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(v_tenant::text || ':' || lower(btrim(p_name)), 0));
    SELECT * INTO v_org FROM public.organizations
    WHERE tenant_id = v_tenant AND is_active = true AND lower(btrim(name)) = lower(btrim(p_name))
    ORDER BY created_at LIMIT 1
    FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.organizations (
        tenant_id, name, legal_name, kind, email, phone, website,
        address_line1, address_line2, city, state, postal_code, country,
        notes, is_active, created_by, apas_crm_sync_status
      ) VALUES (
        v_tenant, btrim(p_name), btrim(p_name), v_kind,
        NULLIF(btrim(p_email), ''), NULLIF(btrim(p_phone), ''), NULLIF(btrim(p_website), ''),
        NULLIF(btrim(p_address_line1), ''), NULLIF(btrim(p_address_line2), ''),
        NULLIF(btrim(p_city), ''), NULLIF(btrim(p_state), ''), NULLIF(btrim(p_postal_code), ''),
        COALESCE(NULLIF(btrim(p_country), ''), 'US'),
        'Created from an administrator-reviewed vendor invoice intake.', true, v_user, 'not_synced'
      ) RETURNING * INTO v_org;
      v_created := true;
    ELSE
      UPDATE public.organizations SET
        email = COALESCE(email, NULLIF(btrim(p_email), '')),
        phone = COALESCE(phone, NULLIF(btrim(p_phone), '')),
        website = COALESCE(website, NULLIF(btrim(p_website), '')),
        address_line1 = COALESCE(address_line1, NULLIF(btrim(p_address_line1), '')),
        address_line2 = COALESCE(address_line2, NULLIF(btrim(p_address_line2), '')),
        city = COALESCE(city, NULLIF(btrim(p_city), '')),
        state = COALESCE(state, NULLIF(btrim(p_state), '')),
        postal_code = COALESCE(postal_code, NULLIF(btrim(p_postal_code), '')),
        country = COALESCE(country, NULLIF(btrim(p_country), '')),
        updated_at = now()
      WHERE id = v_org.id
      RETURNING * INTO v_org;
    END IF;
  END IF;

  INSERT INTO public.project_vendor_assignments (
    tenant_id, project_id, organization_id, relationship_role, source, created_by
  ) VALUES (
    v_tenant, p_project_id, v_org.id, v_role, 'invoice_intake', v_user
  )
  ON CONFLICT (project_id, organization_id) DO UPDATE SET
    relationship_role = EXCLUDED.relationship_role,
    source = 'invoice_intake', is_active = true, updated_at = now();

  IF lower(COALESCE(v_project_type, '')) IN ('consulting','client') THEN
    INSERT INTO public.consulting_vendor_assignments (
      tenant_id, project_id, organization_id, is_active, created_by
    ) VALUES (v_tenant, p_project_id, v_org.id, true, v_user)
    ON CONFLICT (project_id, organization_id) DO UPDATE SET is_active = true;
  END IF;

  RETURN jsonb_build_object(
    'organizationId', v_org.id,
    'name', v_org.name,
    'created', v_created,
    'crmSyncStatus', v_org.apas_crm_sync_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_project_vendor_from_invoice(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_project_vendor_from_invoice(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, text
) TO authenticated;

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
BEGIN
  IF v_user IS NULL OR v_tenant IS NULL OR NOT public.can_manage_consulting_ap(v_tenant) THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED: only an administrator can create this vendor invoice';
  END IF;
  IF COALESCE(p_amount, 0) <= 0 THEN RAISE EXCEPTION 'INVOICE_AMOUNT_REQUIRED: confirm an amount greater than zero'; END IF;
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

  INSERT INTO public.consulting_costs (
    id, tenant_id, project_id, vendor_org_id, vendor_name, cost_type,
    reference_no, description, bill_date, due_date, amount, status,
    invoice_artifact_id, source_kind, source_status, source_note,
    submitted_at, submitted_by, created_by
  ) VALUES (
    v_cost, v_tenant, v_submission.project_id, p_vendor_organization_id, v_vendor_name, p_cost_type,
    NULLIF(btrim(p_reference_no), ''), NULLIF(btrim(p_description), ''), COALESCE(p_bill_date, current_date),
    p_due_date, p_amount, 'draft', v_submission.artifact_id,
    'admin_on_behalf', 'received',
    'Vendor-supplied invoice received outside the portal and uploaded by an administrator; confirm authorship during review.',
    now(), v_user, v_user
  );

  UPDATE public.vendor_submissions
  SET status = 'processed', created_consulting_cost_id = v_cost
  WHERE id = v_submission.id;

  INSERT INTO public.consulting_ap_audit_log (
    tenant_id, project_id, entity_type, entity_id, action, actor_id, metadata
  ) VALUES (
    v_tenant, v_submission.project_id, 'invoice', v_cost,
    'created_from_ai_invoice_intake', v_user,
    jsonb_build_object('submission_id', v_submission.id, 'artifact_id', v_submission.artifact_id)
  );
  RETURN v_cost;
END;
$$;

REVOKE ALL ON FUNCTION public.create_consulting_invoice_from_submission(
  uuid, uuid, text, date, date, numeric, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_consulting_invoice_from_submission(
  uuid, uuid, text, date, date, numeric, text, text
) TO authenticated;

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
  IF COALESCE(p_amount, 0) <= 0 THEN RAISE EXCEPTION 'INVOICE_AMOUNT_REQUIRED: confirm an amount greater than zero'; END IF;

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
  IF NOT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = v_submission.project_id
      AND p.workspace_id = v_tenant AND p.deleted_at IS NULL
      AND lower(COALESCE(p.project_type, 'property')) NOT IN ('consulting','client')
  ) THEN RAISE EXCEPTION 'PROJECT_TYPE_MISMATCH: use the consulting vendor A/P workflow for this project'; END IF;
  SELECT name INTO v_vendor_name FROM public.organizations
  WHERE id = p_vendor_organization_id AND tenant_id = v_tenant AND is_active = true;
  IF v_vendor_name IS NULL THEN RAISE EXCEPTION 'VENDOR_NOT_FOUND: confirm a project vendor'; END IF;
  IF NOT EXISTS (
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
    p_vendor_organization_id, p_amount, 0, 'draft', v_user
  ) RETURNING id INTO v_commitment;

  INSERT INTO public.commitment_sov_lines (
    tenant_id, commitment_id, line_no, cost_code_id, description, scheduled_value
  ) VALUES (
    v_tenant, v_commitment, 1, p_cost_code_id,
    COALESCE(NULLIF(btrim(p_description), ''), 'Small contractor services'), p_amount
  ) RETURNING id INTO v_sov;

  v_invoice := public.process_vendor_submission_invoice(
    v_submission.id, v_commitment,
    COALESCE(NULLIF(btrim(p_invoice_no), ''), 'DOC-' || left(v_submission.id::text, 8)),
    COALESCE(p_period_end, current_date), p_amount, 0
  );

  INSERT INTO public.commitment_invoice_lines (
    invoice_id, sov_line_id, work_this_period, materials_stored, pct_complete
  ) VALUES (v_invoice, v_sov, p_amount, 0, 100);

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
    'nextStep', 'Complete contractor readiness, execute the commitment, submit and approve the invoice, then record bank evidence.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_small_vendor_invoice_from_submission(
  uuid, uuid, uuid, text, date, numeric, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_small_vendor_invoice_from_submission(
  uuid, uuid, uuid, text, date, numeric, text
) TO authenticated;

COMMIT;
