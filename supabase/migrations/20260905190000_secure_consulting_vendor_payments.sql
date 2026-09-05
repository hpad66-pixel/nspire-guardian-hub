-- Secure consulting A/P: provenance-backed vendor invoices, administrator-only
-- approval/payment, mandatory bank evidence, idempotency, reconciliation, and
-- tokenized vendor invoice requests. ProjOS records external payments; it never
-- stores online-banking credentials or executes Zelle.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.consulting_costs
  ADD COLUMN IF NOT EXISTS invoice_artifact_id uuid REFERENCES public.project_artifacts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_kind text,
  ADD COLUMN IF NOT EXISTS source_status text,
  ADD COLUMN IF NOT EXISTS source_note text,
  ADD COLUMN IF NOT EXISTS is_legacy_exception boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS vendor_attested_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Existing approved costs predate the invoice-first workflow. Preserve them as
-- explicit historical exceptions; never silently represent them as vendor-filed.
UPDATE public.consulting_costs
SET source_kind = 'historical_exception',
    source_status = 'verified',
    is_legacy_exception = true,
    source_note = COALESCE(source_note, 'Imported before secure consulting invoice controls were enabled')
WHERE source_kind IS NULL;

ALTER TABLE public.consulting_costs
  ALTER COLUMN source_kind SET DEFAULT 'admin_on_behalf',
  ALTER COLUMN source_kind SET NOT NULL,
  ALTER COLUMN source_status SET DEFAULT 'draft',
  ALTER COLUMN source_status SET NOT NULL;

ALTER TABLE public.consulting_costs
  DROP CONSTRAINT IF EXISTS consulting_costs_status_check,
  DROP CONSTRAINT IF EXISTS consulting_costs_source_kind_check,
  DROP CONSTRAINT IF EXISTS consulting_costs_source_status_check,
  ADD CONSTRAINT consulting_costs_status_check CHECK (
    status IN ('draft','submitted','approved','rejected','partially_paid','paid','void')
  ),
  ADD CONSTRAINT consulting_costs_source_kind_check CHECK (
    source_kind IN ('vendor_upload','vendor_portal','admin_on_behalf','historical_exception')
  ),
  ADD CONSTRAINT consulting_costs_source_status_check CHECK (
    source_status IN ('draft','vendor_attested','received','verified','rejected')
  ),
  ADD CONSTRAINT consulting_costs_historical_reason_check CHECK (
    source_kind <> 'historical_exception' OR length(btrim(COALESCE(source_note, ''))) >= 12
  ),
  ADD CONSTRAINT consulting_costs_historical_lock_check CHECK (
    source_kind <> 'historical_exception' OR is_legacy_exception
  );

ALTER TABLE public.consulting_cost_payments
  ADD COLUMN IF NOT EXISTS proof_artifact_id uuid REFERENCES public.project_artifacts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'recorded',
  ADD COLUMN IF NOT EXISTS idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS recorded_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reconciliation_note text;

UPDATE public.consulting_cost_payments
SET payment_status = CASE WHEN proof_artifact_id IS NULL THEN 'historical_unverified' ELSE 'recorded' END,
    recorded_by = COALESCE(recorded_by, created_by)
WHERE payment_status = 'recorded';

ALTER TABLE public.consulting_cost_payments
  DROP CONSTRAINT IF EXISTS consulting_cost_payments_payment_status_check,
  ADD CONSTRAINT consulting_cost_payments_payment_status_check CHECK (
    payment_status IN ('historical_unverified','recorded','reconciled','void')
  ),
  ADD CONSTRAINT consulting_cost_payments_reconciliation_check CHECK (
    (payment_status = 'reconciled' AND reconciled_at IS NOT NULL AND reconciled_by IS NOT NULL)
    OR payment_status <> 'reconciled'
  );

CREATE UNIQUE INDEX IF NOT EXISTS consulting_cost_payments_idempotency_idx
  ON public.consulting_cost_payments(tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.consulting_vendor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.consulting_invoice_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  recipient_email text NOT NULL,
  token_digest text NOT NULL UNIQUE,
  message text,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','submitted','expired','revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  submitted_at timestamptz,
  consulting_cost_id uuid REFERENCES public.consulting_costs(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK (token_digest ~ '^[0-9a-f]{64}$'),
  CHECK (position('@' IN recipient_email) > 1)
);

CREATE INDEX IF NOT EXISTS consulting_invoice_requests_project_idx
  ON public.consulting_invoice_requests(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS consulting_vendor_assignments_org_idx
  ON public.consulting_vendor_assignments(organization_id, project_id);

CREATE TABLE IF NOT EXISTS public.consulting_ap_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('invoice','payment','invoice_request')),
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.can_manage_consulting_ap(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text = 'admin'
      AND p_tenant_id = public.current_tenant_id()
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_consulting_ap(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_consulting_ap(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_secure_consulting_cost_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text := COALESCE(current_setting('app.consulting_ap_action', true), '');
  v_art_tenant uuid;
  v_art_project uuid;
  v_paid numeric(14,2) := 0;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.source_kind = 'historical_exception' THEN
    RAISE EXCEPTION 'Historical exceptions are migration-only and cannot be created by users';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.source_kind = 'historical_exception'
     AND OLD.source_kind IS DISTINCT FROM 'historical_exception' THEN
    RAISE EXCEPTION 'An invoice cannot be converted into a historical exception';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IN ('approved','partially_paid','paid') AND (
    NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.vendor_org_id IS DISTINCT FROM OLD.vendor_org_id OR NEW.vendor_name IS DISTINCT FROM OLD.vendor_name
    OR NEW.reference_no IS DISTINCT FROM OLD.reference_no OR NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.invoice_artifact_id IS DISTINCT FROM OLD.invoice_artifact_id
    OR NEW.source_kind IS DISTINCT FROM OLD.source_kind OR NEW.vendor_attested_at IS DISTINCT FROM OLD.vendor_attested_at
  ) THEN RAISE EXCEPTION 'Approved consulting invoice fields are immutable; return or replace the invoice before payment'; END IF;

  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    IF v_action <> 'approve' THEN RAISE EXCEPTION 'Use the guarded invoice approval action'; END IF;
    IF NOT public.can_manage_consulting_ap(NEW.tenant_id) THEN RAISE EXCEPTION 'Administrator approval required'; END IF;
    IF NEW.invoice_artifact_id IS NULL AND NEW.source_kind <> 'historical_exception' THEN
      RAISE EXCEPTION 'INVOICE_SOURCE_REQUIRED: attach the invoice before approval';
    END IF;
    IF NEW.source_kind = 'historical_exception' AND NOT NEW.is_legacy_exception THEN
      RAISE EXCEPTION 'New invoices cannot bypass source controls as historical exceptions';
    END IF;
    IF NEW.invoice_artifact_id IS NOT NULL THEN
      SELECT tenant_id, project_id INTO v_art_tenant, v_art_project FROM public.project_artifacts WHERE id = NEW.invoice_artifact_id;
      IF v_art_tenant IS DISTINCT FROM NEW.tenant_id OR v_art_project IS DISTINCT FROM NEW.project_id THEN
        RAISE EXCEPTION 'Invoice artifact crosses the project or tenant boundary';
      END IF;
    END IF;
    IF NEW.source_kind IN ('vendor_upload','vendor_portal') AND NEW.vendor_attested_at IS NULL THEN
      RAISE EXCEPTION 'VENDOR_ATTESTATION_REQUIRED: vendor attestation is missing';
    END IF;
    IF NEW.vendor_org_id IS NOT NULL AND NOT public.contractor_can_proceed(NEW.project_id, NEW.vendor_org_id, 'payment') THEN
      RAISE EXCEPTION 'CONTRACTOR_READINESS_BLOCKED: vendor is not payment-ready';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IN ('partially_paid','paid') AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF v_action <> 'payment' THEN RAISE EXCEPTION 'Settlement status is derived from guarded payment records'; END IF;
    SELECT COALESCE(sum(amount),0) INTO v_paid FROM public.consulting_cost_payments
    WHERE cost_id = OLD.id AND payment_status <> 'void';
    IF NEW.status = 'paid' AND v_paid < NEW.amount - 0.005 THEN RAISE EXCEPTION 'Invoice cannot be marked paid before full payment evidence exists'; END IF;
    IF NEW.status = 'partially_paid' AND (v_paid <= 0 OR v_paid >= NEW.amount - 0.005) THEN RAISE EXCEPTION 'Partially-paid status does not match recorded payments'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS secure_consulting_cost_lifecycle_trg ON public.consulting_costs;
CREATE TRIGGER secure_consulting_cost_lifecycle_trg
  BEFORE INSERT OR UPDATE ON public.consulting_costs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_secure_consulting_cost_lifecycle();

ALTER TABLE public.consulting_vendor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consulting_invoice_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consulting_ap_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consulting_costs_tenant ON public.consulting_costs;
DROP POLICY IF EXISTS consulting_costs_main_read ON public.consulting_costs;
DROP POLICY IF EXISTS consulting_costs_sub_read ON public.consulting_costs;
DROP POLICY IF EXISTS consulting_costs_staff_insert_draft ON public.consulting_costs;
DROP POLICY IF EXISTS consulting_costs_staff_update_draft ON public.consulting_costs;
DROP POLICY IF EXISTS consulting_costs_admin_write ON public.consulting_costs;
CREATE POLICY consulting_costs_main_read ON public.consulting_costs FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.current_portal_kind() = 'main')
  );
CREATE POLICY consulting_costs_sub_read ON public.consulting_costs FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_portal_kind() = 'sub'
    AND vendor_org_id = ANY(public.current_user_orgs())
  );
CREATE POLICY consulting_costs_staff_insert_draft ON public.consulting_costs FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_portal_kind() = 'main'
    AND created_by = auth.uid()
    AND status IN ('draft','submitted')
    AND approved_at IS NULL AND approved_by IS NULL
  );
CREATE POLICY consulting_costs_staff_update_draft ON public.consulting_costs FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_portal_kind() = 'main'
    AND created_by = auth.uid() AND status IN ('draft','rejected')
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND created_by = auth.uid() AND status IN ('draft','submitted')
    AND approved_at IS NULL AND approved_by IS NULL
  );
CREATE POLICY consulting_costs_admin_write ON public.consulting_costs FOR UPDATE TO authenticated
  USING (public.can_manage_consulting_ap(tenant_id))
  WITH CHECK (public.can_manage_consulting_ap(tenant_id));

DROP POLICY IF EXISTS consulting_cost_payments_tenant ON public.consulting_cost_payments;
DROP POLICY IF EXISTS consulting_cost_payments_read ON public.consulting_cost_payments;
CREATE POLICY consulting_cost_payments_read ON public.consulting_cost_payments FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.current_portal_kind() = 'main')
    OR (public.current_portal_kind() = 'sub' AND EXISTS (
      SELECT 1 FROM public.consulting_costs c
      WHERE c.id = cost_id AND c.vendor_org_id = ANY(public.current_user_orgs())
    ))
  );

CREATE POLICY consulting_vendor_assignments_main ON public.consulting_vendor_assignments
  FOR ALL TO authenticated
  USING (public.can_manage_consulting_ap(tenant_id))
  WITH CHECK (public.can_manage_consulting_ap(tenant_id));
CREATE POLICY consulting_vendor_assignments_sub_read ON public.consulting_vendor_assignments
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_portal_kind() = 'sub'
    AND organization_id = ANY(public.current_user_orgs())
  );

CREATE POLICY consulting_invoice_requests_admin ON public.consulting_invoice_requests
  FOR ALL TO authenticated
  USING (public.can_manage_consulting_ap(tenant_id))
  WITH CHECK (public.can_manage_consulting_ap(tenant_id));

CREATE POLICY consulting_ap_audit_read ON public.consulting_ap_audit_log
  FOR SELECT TO authenticated
  USING (public.can_manage_consulting_ap(tenant_id));

DROP POLICY IF EXISTS projects_sub_consulting_select ON public.projects;

CREATE OR REPLACE FUNCTION public.can_view_assigned_consulting_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_portal_kind() = 'sub' AND EXISTS (
    SELECT 1
    FROM public.consulting_vendor_assignments a
    JOIN public.portal_memberships pm
      ON pm.tenant_id = a.tenant_id
     AND pm.organization_id = a.organization_id
     AND pm.user_id = auth.uid()
     AND pm.is_active
    WHERE a.project_id = p_project_id
      AND a.is_active
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_assigned_consulting_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_assigned_consulting_project(uuid) TO authenticated;

CREATE POLICY projects_sub_consulting_select ON public.projects FOR SELECT TO authenticated
  USING (public.can_view_assigned_consulting_project(id));

-- Client administrators create client-scoped projects through the audited
-- create_client_project RPC. Keep direct REST inserts closed so required
-- defaults, tenant boundaries, and audit records cannot be bypassed.
DROP POLICY IF EXISTS enterprise_project_insert_permission ON public.projects;
CREATE POLICY enterprise_project_insert_permission ON public.projects AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(public.current_portal_kind(), 'main') <> 'main'
    OR public.is_super_admin()
    OR public.is_workspace_admin(auth.uid())
    OR (
      property_id IS NOT NULL
      AND public.effective_property_permission(auth.uid(), property_id, 'projects', 'create')
    )
  );

CREATE OR REPLACE FUNCTION public.create_consulting_invoice_request(
  p_project_id uuid,
  p_organization_id uuid,
  p_recipient_email text,
  p_token_digest text,
  p_due_date date DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_request uuid;
BEGIN
  SELECT workspace_id INTO v_tenant FROM public.projects
  WHERE id = p_project_id AND project_type IN ('consulting','client');
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Consulting project not found'; END IF;
  IF NOT public.can_manage_consulting_ap(v_tenant) THEN RAISE EXCEPTION 'Administrator approval required'; END IF;
  IF p_token_digest !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid secure token digest'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = p_organization_id AND o.tenant_id = v_tenant AND o.is_active
  ) THEN RAISE EXCEPTION 'Active vendor organization not found'; END IF;

  INSERT INTO public.consulting_vendor_assignments
    (tenant_id, project_id, organization_id, created_by)
  VALUES (v_tenant, p_project_id, p_organization_id, auth.uid())
  ON CONFLICT (project_id, organization_id) DO UPDATE SET is_active = true;

  INSERT INTO public.consulting_invoice_requests (
    tenant_id, project_id, organization_id, recipient_email,
    token_digest, due_date, message, created_by
  ) VALUES (
    v_tenant, p_project_id, p_organization_id, lower(btrim(p_recipient_email)),
    lower(p_token_digest), p_due_date, NULLIF(btrim(p_message), ''), auth.uid()
  ) RETURNING id INTO v_request;

  INSERT INTO public.consulting_ap_audit_log
    (tenant_id, project_id, entity_type, entity_id, action, actor_id, metadata)
  VALUES (v_tenant, p_project_id, 'invoice_request', v_request, 'request_created', auth.uid(),
    jsonb_build_object('organization_id', p_organization_id, 'due_date', p_due_date));
  RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.create_consulting_invoice_request(uuid,uuid,text,text,date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_consulting_invoice_request(uuid,uuid,text,text,date,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_consulting_invoice_request(
  p_token_digest text,
  p_invoice_artifact_id uuid,
  p_invoice_no text,
  p_invoice_date date,
  p_due_date date,
  p_amount numeric,
  p_description text,
  p_attested_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.consulting_invoice_requests%ROWTYPE;
  v_vendor_name text;
  v_artifact public.project_artifacts%ROWTYPE;
  v_cost_id uuid;
BEGIN
  SELECT * INTO v_request FROM public.consulting_invoice_requests
  WHERE token_digest = lower(p_token_digest) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This secure invoice link is invalid'; END IF;
  IF v_request.status <> 'open' OR v_request.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'This invoice request has already been completed or revoked'; END IF;
  IF v_request.expires_at < now() THEN
    UPDATE public.consulting_invoice_requests SET status = 'expired' WHERE id = v_request.id;
    RAISE EXCEPTION 'This secure invoice link has expired';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invoice amount must be greater than zero'; END IF;
  IF length(btrim(COALESCE(p_invoice_no,''))) < 1 THEN RAISE EXCEPTION 'Invoice number is required'; END IF;
  IF length(btrim(COALESCE(p_attested_name,''))) < 3 THEN RAISE EXCEPTION 'Authorized submitter name is required'; END IF;
  IF p_invoice_date IS NULL OR p_invoice_date > current_date THEN RAISE EXCEPTION 'Invoice date must be today or earlier'; END IF;

  SELECT * INTO v_artifact FROM public.project_artifacts WHERE id = p_invoice_artifact_id;
  IF NOT FOUND OR v_artifact.tenant_id IS DISTINCT FROM v_request.tenant_id
     OR v_artifact.project_id IS DISTINCT FROM v_request.project_id THEN
    RAISE EXCEPTION 'Invoice document crosses the secure project boundary';
  END IF;
  IF v_artifact.artifact_type::text <> 'invoice'
     OR COALESCE(v_artifact.file_size, 0) <= 0
     OR COALESCE(v_artifact.mime_type, '') NOT IN ('application/pdf','image/jpeg','image/png','image/webp') THEN
    RAISE EXCEPTION 'Invoice artifact is missing an approved file type or file metadata';
  END IF;
  SELECT name INTO v_vendor_name FROM public.organizations WHERE id = v_request.organization_id;

  INSERT INTO public.consulting_costs (
    tenant_id, project_id, vendor_org_id, vendor_name, cost_type, reference_no,
    description, bill_date, due_date, amount, status, invoice_artifact_id,
    source_kind, source_status, source_note, submitted_at, vendor_attested_at
  ) VALUES (
    v_request.tenant_id, v_request.project_id, v_request.organization_id, v_vendor_name,
    'subcontractor', btrim(p_invoice_no), NULLIF(btrim(p_description),''),
    p_invoice_date, p_due_date, round(p_amount,2), 'submitted', p_invoice_artifact_id,
    'vendor_upload', 'vendor_attested', 'Vendor attested by ' || btrim(p_attested_name), now(), now()
  ) RETURNING id INTO v_cost_id;

  UPDATE public.project_artifacts SET
    linked_entity_type = 'consulting_cost', linked_entity_id = v_cost_id,
    reference_no = btrim(p_invoice_no), period_date = p_invoice_date, amount = round(p_amount,2)
  WHERE id = p_invoice_artifact_id;
  UPDATE public.consulting_invoice_requests SET
    status = 'submitted', submitted_at = now(), consulting_cost_id = v_cost_id
  WHERE id = v_request.id;
  INSERT INTO public.consulting_ap_audit_log
    (tenant_id, project_id, entity_type, entity_id, action, actor_id, metadata)
  VALUES (v_request.tenant_id, v_request.project_id, 'invoice', v_cost_id, 'vendor_submitted', NULL,
    jsonb_build_object('request_id', v_request.id, 'invoice_no', btrim(p_invoice_no),
      'amount', round(p_amount,2), 'attested_name', btrim(p_attested_name)));
  RETURN v_cost_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_consulting_invoice_request(text,uuid,text,date,date,numeric,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_consulting_invoice_request(text,uuid,text,date,date,numeric,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_consulting_portal_invoice(
  p_project_id uuid,
  p_organization_id uuid,
  p_invoice_artifact_id uuid,
  p_invoice_no text,
  p_invoice_date date,
  p_due_date date,
  p_amount numeric,
  p_description text,
  p_attested_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.consulting_vendor_assignments%ROWTYPE;
  v_artifact public.project_artifacts%ROWTYPE;
  v_vendor_name text;
  v_cost_id uuid;
BEGIN
  IF public.current_portal_kind() <> 'sub' THEN RAISE EXCEPTION 'Subcontractor portal access required'; END IF;
  IF NOT (p_organization_id = ANY(public.current_user_orgs())) THEN RAISE EXCEPTION 'Vendor organization access denied'; END IF;
  SELECT * INTO v_assignment FROM public.consulting_vendor_assignments
  WHERE project_id = p_project_id AND organization_id = p_organization_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'This vendor is not assigned to the consulting project'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invoice amount must be greater than zero'; END IF;
  IF length(btrim(COALESCE(p_invoice_no,''))) < 1 THEN RAISE EXCEPTION 'Invoice number is required'; END IF;
  IF length(btrim(COALESCE(p_attested_name,''))) < 3 THEN RAISE EXCEPTION 'Authorized submitter name is required'; END IF;
  IF p_invoice_date IS NULL OR p_invoice_date > current_date THEN RAISE EXCEPTION 'Invoice date must be today or earlier'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.consulting_costs c
    WHERE c.project_id = p_project_id AND c.vendor_org_id = p_organization_id
      AND lower(c.reference_no) = lower(btrim(p_invoice_no)) AND c.status NOT IN ('rejected','void')
  ) THEN RAISE EXCEPTION 'This invoice number has already been submitted'; END IF;
  SELECT * INTO v_artifact FROM public.project_artifacts WHERE id = p_invoice_artifact_id;
  IF NOT FOUND OR v_artifact.tenant_id IS DISTINCT FROM v_assignment.tenant_id
     OR v_artifact.project_id IS DISTINCT FROM p_project_id THEN
    RAISE EXCEPTION 'Invoice document crosses the secure project boundary';
  END IF;
  IF v_artifact.created_by IS DISTINCT FROM auth.uid()
     OR v_artifact.artifact_type::text <> 'invoice'
     OR NOT ('vendor-attested' = ANY(v_artifact.tags))
     OR COALESCE(v_artifact.file_size, 0) <= 0
     OR COALESCE(v_artifact.mime_type, '') NOT IN ('application/pdf','image/jpeg','image/png','image/webp') THEN
    RAISE EXCEPTION 'Invoice artifact is not a valid submission from this portal user';
  END IF;
  SELECT name INTO v_vendor_name FROM public.organizations WHERE id = p_organization_id;
  INSERT INTO public.consulting_costs (
    tenant_id, project_id, vendor_org_id, vendor_name, cost_type, reference_no,
    description, bill_date, due_date, amount, status, invoice_artifact_id,
    source_kind, source_status, source_note, submitted_at, submitted_by, vendor_attested_at
  ) VALUES (
    v_assignment.tenant_id, p_project_id, p_organization_id, v_vendor_name,
    'subcontractor', btrim(p_invoice_no), NULLIF(btrim(p_description),''),
    p_invoice_date, p_due_date, round(p_amount,2), 'submitted', p_invoice_artifact_id,
    'vendor_portal', 'vendor_attested', 'Vendor portal attestation by ' || btrim(p_attested_name),
    now(), auth.uid(), now()
  ) RETURNING id INTO v_cost_id;
  UPDATE public.project_artifacts SET linked_entity_type = 'consulting_cost', linked_entity_id = v_cost_id
  WHERE id = p_invoice_artifact_id;
  INSERT INTO public.consulting_ap_audit_log
    (tenant_id, project_id, entity_type, entity_id, action, actor_id, metadata)
  VALUES (v_assignment.tenant_id, p_project_id, 'invoice', v_cost_id, 'vendor_portal_submitted', auth.uid(),
    jsonb_build_object('invoice_no', btrim(p_invoice_no), 'amount', round(p_amount,2),
      'organization_id', p_organization_id, 'attested_name', btrim(p_attested_name)));
  RETURN v_cost_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_consulting_portal_invoice(uuid,uuid,uuid,text,date,date,numeric,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_consulting_portal_invoice(uuid,uuid,uuid,text,date,date,numeric,text,text) TO authenticated;

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
    jsonb_build_object('amount', v_result.amount, 'source_kind', v_result.source_kind));
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_consulting_cost(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_consulting_cost(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_consulting_cost(p_cost_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_cost public.consulting_costs%ROWTYPE;
BEGIN
  SELECT * INTO v_cost FROM public.consulting_costs WHERE id = p_cost_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulting vendor invoice not found'; END IF;
  IF NOT public.can_manage_consulting_ap(v_cost.tenant_id) THEN RAISE EXCEPTION 'Administrator approval required'; END IF;
  IF v_cost.status NOT IN ('draft','submitted') THEN RAISE EXCEPTION 'Only an unpaid draft or submitted invoice can be rejected'; END IF;
  IF length(btrim(COALESCE(p_reason,''))) < 5 THEN RAISE EXCEPTION 'Provide a clear rejection reason'; END IF;
  UPDATE public.consulting_costs SET status = 'rejected', source_status = 'rejected',
    rejection_reason = btrim(p_reason), reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_cost_id;
  INSERT INTO public.consulting_ap_audit_log
    (tenant_id, project_id, entity_type, entity_id, action, actor_id, metadata)
  VALUES (v_cost.tenant_id, v_cost.project_id, 'invoice', v_cost.id, 'rejected', auth.uid(),
    jsonb_build_object('reason', btrim(p_reason)));
END;
$$;

REVOKE ALL ON FUNCTION public.reject_consulting_cost(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_consulting_cost(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_consulting_cost_payment(
  p_cost_id uuid,
  p_amount numeric,
  p_paid_date date,
  p_method text,
  p_reference text,
  p_proof_artifact_id uuid,
  p_idempotency_key uuid,
  p_note text DEFAULT NULL
)
RETURNS public.consulting_cost_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost public.consulting_costs%ROWTYPE;
  v_paid numeric(14,2);
  v_artifact public.project_artifacts%ROWTYPE;
  v_result public.consulting_cost_payments%ROWTYPE;
  v_method text := lower(btrim(COALESCE(p_method,'')));
BEGIN
  SELECT * INTO v_cost FROM public.consulting_costs WHERE id = p_cost_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulting vendor invoice not found'; END IF;
  IF NOT public.can_manage_consulting_ap(v_cost.tenant_id) THEN RAISE EXCEPTION 'Administrator payment authority required'; END IF;
  IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'Payment idempotency key is required'; END IF;
  SELECT * INTO v_result FROM public.consulting_cost_payments
  WHERE tenant_id = v_cost.tenant_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_result.cost_id IS DISTINCT FROM p_cost_id
       OR v_result.amount IS DISTINCT FROM round(p_amount,2)
       OR v_result.paid_date IS DISTINCT FROM p_paid_date
       OR v_result.method IS DISTINCT FROM v_method
       OR v_result.reference IS DISTINCT FROM btrim(p_reference)
       OR v_result.proof_artifact_id IS DISTINCT FROM p_proof_artifact_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT: this request key was already used for different payment data';
    END IF;
    RETURN v_result;
  END IF;
  IF v_cost.status NOT IN ('approved','partially_paid') THEN RAISE EXCEPTION 'Only an approved invoice can be paid'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be greater than zero'; END IF;
  IF p_paid_date IS NULL OR p_paid_date > current_date THEN RAISE EXCEPTION 'Paid date must be today or earlier'; END IF;
  IF v_method NOT IN ('check','ach','wire','zelle','card','cash','other') THEN RAISE EXCEPTION 'Unsupported payment method'; END IF;
  IF length(btrim(COALESCE(p_reference,''))) < 3 THEN RAISE EXCEPTION 'Bank reference or check number is required'; END IF;
  IF p_proof_artifact_id IS NULL THEN RAISE EXCEPTION 'PAYMENT_EVIDENCE_REQUIRED: upload bank confirmation before recording payment'; END IF;
  SELECT * INTO v_artifact FROM public.project_artifacts WHERE id = p_proof_artifact_id;
  IF NOT FOUND OR v_artifact.tenant_id IS DISTINCT FROM v_cost.tenant_id
     OR v_artifact.project_id IS DISTINCT FROM v_cost.project_id THEN
    RAISE EXCEPTION 'Payment evidence crosses the project or tenant boundary';
  END IF;
  IF NOT ('payment-evidence' = ANY(v_artifact.tags))
     OR COALESCE(v_artifact.file_size, 0) <= 0
     OR COALESCE(v_artifact.mime_type, '') NOT IN ('application/pdf','image/jpeg','image/png','image/webp')
     OR v_artifact.period_date IS DISTINCT FROM p_paid_date
     OR v_artifact.reference_no IS DISTINCT FROM btrim(p_reference)
     OR v_artifact.amount IS DISTINCT FROM round(p_amount,2) THEN
    RAISE EXCEPTION 'Payment evidence metadata must match the amount, date, and bank reference';
  END IF;
  IF v_cost.vendor_org_id IS NOT NULL
     AND NOT public.contractor_can_proceed(v_cost.project_id, v_cost.vendor_org_id, 'payment') THEN
    RAISE EXCEPTION 'CONTRACTOR_READINESS_BLOCKED: vendor is not payment-ready';
  END IF;
  SELECT COALESCE(sum(amount), 0) INTO v_paid FROM public.consulting_cost_payments
  WHERE cost_id = p_cost_id AND payment_status <> 'void';
  IF v_paid + p_amount > v_cost.amount + 0.005 THEN RAISE EXCEPTION 'OVERPAYMENT: payment exceeds the approved invoice balance'; END IF;

  PERFORM set_config('app.consulting_ap_action', 'payment', true);
  INSERT INTO public.consulting_cost_payments (
    tenant_id, cost_id, amount, paid_date, method, reference, note, created_by,
    recorded_by, proof_artifact_id, payment_status, idempotency_key
  ) VALUES (
    v_cost.tenant_id, v_cost.id, round(p_amount,2), p_paid_date, v_method,
    btrim(p_reference), NULLIF(btrim(p_note),''), auth.uid(), auth.uid(),
    p_proof_artifact_id, 'recorded', p_idempotency_key
  ) RETURNING * INTO v_result;

  INSERT INTO public.consulting_ap_audit_log
    (tenant_id, project_id, entity_type, entity_id, action, actor_id, metadata)
  VALUES (v_cost.tenant_id, v_cost.project_id, 'payment', v_result.id, 'external_payment_recorded', auth.uid(),
    jsonb_build_object('cost_id', v_cost.id, 'amount', v_result.amount, 'method', v_method, 'reference', v_result.reference));
  RETURN v_result;
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_result FROM public.consulting_cost_payments
  WHERE tenant_id = v_cost.tenant_id AND idempotency_key = p_idempotency_key;
  IF NOT FOUND
     OR v_result.cost_id IS DISTINCT FROM p_cost_id
     OR v_result.amount IS DISTINCT FROM round(p_amount,2)
     OR v_result.paid_date IS DISTINCT FROM p_paid_date
     OR v_result.method IS DISTINCT FROM v_method
     OR v_result.reference IS DISTINCT FROM btrim(p_reference)
     OR v_result.proof_artifact_id IS DISTINCT FROM p_proof_artifact_id THEN
    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT: this request key was already used for different payment data';
  END IF;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.record_consulting_cost_payment(uuid,numeric,date,text,text,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_consulting_cost_payment(uuid,numeric,date,text,text,uuid,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_consulting_cost_payment(p_payment_id uuid, p_note text DEFAULT NULL)
RETURNS public.consulting_cost_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.consulting_cost_payments%ROWTYPE;
  v_project uuid;
BEGIN
  SELECT * INTO v_payment FROM public.consulting_cost_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF NOT public.can_manage_consulting_ap(v_payment.tenant_id) THEN RAISE EXCEPTION 'Administrator reconciliation authority required'; END IF;
  IF v_payment.payment_status <> 'recorded' THEN RAISE EXCEPTION 'Only a recorded payment can be reconciled'; END IF;
  SELECT project_id INTO v_project FROM public.consulting_costs WHERE id = v_payment.cost_id;
  UPDATE public.consulting_cost_payments SET payment_status = 'reconciled',
    reconciled_at = now(), reconciled_by = auth.uid(), reconciliation_note = NULLIF(btrim(p_note),'')
  WHERE id = p_payment_id RETURNING * INTO v_payment;
  INSERT INTO public.consulting_ap_audit_log
    (tenant_id, project_id, entity_type, entity_id, action, actor_id, metadata)
  VALUES (v_payment.tenant_id, v_project, 'payment', v_payment.id, 'reconciled', auth.uid(),
    jsonb_build_object('reference', v_payment.reference));
  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_consulting_cost_payment(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_consulting_cost_payment(uuid,text) TO authenticated;

-- The only authenticated payment mutation path is the guarded security-definer
-- RPC above. Direct inserts/updates/deletes have no RLS policy.

CREATE OR REPLACE FUNCTION public.validate_consulting_cost_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost public.consulting_costs%ROWTYPE;
  v_other_paid numeric(14,2);
BEGIN
  SELECT * INTO v_cost FROM public.consulting_costs WHERE id = NEW.cost_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulting cost not found'; END IF;
  IF v_cost.status NOT IN ('approved','partially_paid','paid') THEN RAISE EXCEPTION 'Only approved costs can be paid'; END IF;
  IF NEW.tenant_id IS DISTINCT FROM v_cost.tenant_id THEN RAISE EXCEPTION 'Consulting cost payment crosses the tenant boundary'; END IF;
  IF TG_OP = 'UPDATE' AND NEW.cost_id IS DISTINCT FROM OLD.cost_id THEN RAISE EXCEPTION 'A payment cannot be moved to another invoice'; END IF;
  SELECT COALESCE(sum(amount),0) INTO v_other_paid FROM public.consulting_cost_payments
  WHERE cost_id = NEW.cost_id AND payment_status <> 'void' AND (TG_OP <> 'UPDATE' OR id <> OLD.id);
  IF NEW.payment_status <> 'void' AND v_other_paid + NEW.amount > v_cost.amount + 0.005 THEN
    RAISE EXCEPTION 'Payment exceeds the remaining approved cost balance';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_consulting_cost_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost_id uuid := COALESCE(NEW.cost_id, OLD.cost_id);
  v_total numeric(14,2);
  v_paid numeric(14,2);
BEGIN
  SELECT amount INTO v_total FROM public.consulting_costs WHERE id = v_cost_id;
  IF v_total IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT COALESCE(sum(amount),0) INTO v_paid FROM public.consulting_cost_payments
  WHERE cost_id = v_cost_id AND payment_status <> 'void';
  UPDATE public.consulting_costs SET
    status = CASE WHEN v_paid >= v_total - 0.005 THEN 'paid' WHEN v_paid > 0 THEN 'partially_paid' ELSE 'approved' END,
    paid_at = CASE WHEN v_paid >= v_total - 0.005 THEN COALESCE(paid_at, now()) ELSE NULL END,
    updated_at = now()
  WHERE id = v_cost_id AND status NOT IN ('void','rejected');
  RETURN COALESCE(NEW, OLD);
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
