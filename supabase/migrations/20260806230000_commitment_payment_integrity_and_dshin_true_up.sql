-- Commitment invoice/payment integrity and the certified D'SHIN reconciliation.
--
-- This migration deliberately fails closed.  The D'SHIN data repair runs only
-- when the exact Sewer Ext Project commitment identity validates and its ledger is either the
-- documented pre-state or the exact reconciled target state.  A clean database
-- has no such commitment, so schema-only CI applies the migration normally.

-- ---------------------------------------------------------------------------
-- 1. Invoice lifecycle provenance and durable processed/paid timestamps.
-- ---------------------------------------------------------------------------

ALTER TABLE public.commitment_invoices
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS vendor_payapp_submission_id uuid REFERENCES public.vendor_payapp_submissions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS vendor_attested_at timestamptz,
  ADD COLUMN IF NOT EXISTS vendor_attested_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS vendor_attested_org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS finalized_artifact_id uuid REFERENCES public.project_artifacts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS historical_exception_reason text;

UPDATE public.commitment_invoices
SET
  source_kind = CASE
    WHEN vendor_submission_id IS NOT NULL THEN COALESCE(
      (
        SELECT CASE
          WHEN vs.source = 'portal' THEN 'portal_submission'
          ELSE 'vendor_invoice'
        END
        FROM public.vendor_submissions vs
        WHERE vs.id = commitment_invoices.vendor_submission_id
      ),
      'vendor_invoice'
    )
    ELSE source_kind
  END,
  received_at = COALESCE(received_at, created_at),
  submitted_at = CASE
    WHEN status IN ('submitted', 'approved', 'paid')
      THEN COALESCE(submitted_at, created_at)
    ELSE submitted_at
  END,
  processed_at = CASE
    WHEN status IN ('approved', 'paid')
      THEN COALESCE(processed_at, updated_at, created_at)
    ELSE processed_at
  END,
  approved_at = CASE
    WHEN status IN ('approved', 'paid')
      THEN COALESCE(approved_at, updated_at, created_at)
    ELSE approved_at
  END,
  paid_at = CASE
    WHEN status = 'paid' THEN COALESCE(
      paid_at,
      (
        SELECT MAX(cp.paid_date)::timestamp AT TIME ZONE 'UTC'
        FROM public.commitment_payments cp
        WHERE cp.commitment_invoice_id = commitment_invoices.id
      ),
      updated_at,
      created_at
    )
    ELSE paid_at
  END;

-- Older builds linked a structured vendor pay app only in the submission row.
-- Establish the reciprocal invoice link before enforcing uniqueness/source
-- guards. Ambiguous or cross-project legacy links must be repaired explicitly;
-- silently choosing one would destroy the evidence chain.
DO $$
BEGIN
  IF EXISTS (
    SELECT vp.commitment_invoice_id
    FROM public.vendor_payapp_submissions vp
    WHERE vp.commitment_invoice_id IS NOT NULL
    GROUP BY vp.commitment_invoice_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'VENDOR_PAYAPP_LINK_CONFLICT: multiple submissions reference the same commitment invoice';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.vendor_payapp_submissions vp
    JOIN public.commitment_invoices ci ON ci.id = vp.commitment_invoice_id
    JOIN public.commitments cm ON cm.id = ci.commitment_id
    WHERE vp.commitment_invoice_id IS NOT NULL
      AND (
        vp.tenant_id <> ci.tenant_id
        OR vp.commitment_id IS DISTINCT FROM ci.commitment_id
        OR vp.project_id <> cm.project_id
        OR ci.vendor_submission_id IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION
      'VENDOR_PAYAPP_LINK_CONFLICT: legacy submission/invoice links cross tenant, project, commitment, or source';
  END IF;

  UPDATE public.commitment_invoices ci
  SET
    source_kind = 'vendor_pay_app',
    vendor_payapp_submission_id = vp.id
  FROM public.vendor_payapp_submissions vp
  WHERE vp.commitment_invoice_id = ci.id
    AND vp.commitment_invoice_id IS NOT NULL;
END;
$$;

ALTER TABLE public.commitment_invoices
  ALTER COLUMN received_at SET DEFAULT now(),
  ALTER COLUMN received_at SET NOT NULL,
  ADD CONSTRAINT commitment_invoices_source_kind_check CHECK (
    source_kind IN (
      'manual',
      'vendor_portal_invoice',
      'vendor_invoice',
      'vendor_pay_app',
      'portal_submission',
      'historical_bank_reconstruction',
      'historical_reconciliation',
      'historical_exception'
    )
  ),
  ADD CONSTRAINT commitment_invoices_historical_exception_reason_check CHECK (
    source_kind <> 'historical_exception'
    OR NULLIF(BTRIM(historical_exception_reason), '') IS NOT NULL
  ),
  ADD CONSTRAINT commitment_invoices_vendor_payapp_source_link_check CHECK (
    (source_kind = 'vendor_pay_app') = (vendor_payapp_submission_id IS NOT NULL)
  ),
  ADD CONSTRAINT commitment_invoices_vendor_portal_attestation_check CHECK (
    (
      source_kind = 'vendor_portal_invoice'
      AND vendor_attested_at IS NOT NULL
      AND vendor_attested_by IS NOT NULL
      AND vendor_attested_org_id IS NOT NULL
    ) OR (
      source_kind <> 'vendor_portal_invoice'
      AND vendor_attested_at IS NULL
      AND vendor_attested_by IS NULL
      AND vendor_attested_org_id IS NULL
    )
  ),
  ADD CONSTRAINT commitment_invoices_lifecycle_timestamps_check CHECK (
    (status NOT IN ('submitted', 'approved', 'paid') OR submitted_at IS NOT NULL)
    AND (status NOT IN ('approved', 'paid') OR (processed_at IS NOT NULL AND approved_at IS NOT NULL))
    AND (status <> 'paid' OR paid_at IS NOT NULL)
    AND (status = 'paid' OR paid_at IS NULL)
  ),
  ADD CONSTRAINT commitment_invoices_retainage_bounds_check CHECK (
    COALESCE(retainage_held, 0) >= 0
    AND COALESCE(retainage_held, 0) <= COALESCE(approved_amount, submitted_amount, 0)
  ),
  ADD CONSTRAINT commitment_invoices_amount_bounds_check CHECK (
    (submitted_amount IS NULL OR submitted_amount >= 0)
    AND (approved_amount IS NULL OR approved_amount >= 0)
    AND (
      approved_amount IS NULL
      OR (submitted_amount IS NOT NULL AND approved_amount <= submitted_amount)
    )
  ),
  ADD CONSTRAINT commitment_invoices_finalized_artifact_check CHECK (
    finalized_artifact_id IS NULL
    OR (status = 'paid' AND finalized_at IS NOT NULL)
  );

COMMENT ON COLUMN public.commitment_invoices.source_kind IS
  'Origin of the invoice/pay app. historical_exception is reserved for certified legacy reconstruction.';
COMMENT ON COLUMN public.commitment_invoices.vendor_payapp_submission_id IS
  'Structured vendor pay-app submission that originated this invoice; distinct from uploaded vendor_submissions.';
COMMENT ON COLUMN public.commitment_invoices.vendor_attested_at IS
  'Durable creation attestation for a native invoice authored by the subcontractor portal; frozen after creation.';
COMMENT ON COLUMN public.commitment_invoices.processed_at IS
  'Durable processed stamp timestamp; set when an invoice is approved for payment.';
COMMENT ON COLUMN public.commitment_invoices.paid_at IS
  'Durable paid stamp timestamp; set only after net payable is fully disbursed.';
COMMENT ON COLUMN public.commitment_invoices.finalized_artifact_id IS
  'Immutable stamped paid-PDF artifact. The original vendor upload remains in artifact_id.';

CREATE UNIQUE INDEX commitment_invoices_vendor_submission_unique
  ON public.commitment_invoices (vendor_submission_id)
  WHERE vendor_submission_id IS NOT NULL;

CREATE UNIQUE INDEX commitment_invoices_vendor_payapp_submission_unique
  ON public.commitment_invoices (vendor_payapp_submission_id)
  WHERE vendor_payapp_submission_id IS NOT NULL;

ALTER TABLE public.commitment_invoice_lines
  ADD CONSTRAINT commitment_invoice_lines_nonnegative_check CHECK (
    work_this_period >= 0
    AND materials_stored >= 0
  ),
  ADD CONSTRAINT commitment_invoice_lines_pct_bounds_check CHECK (
    pct_complete IS NULL OR (pct_complete >= 0 AND pct_complete <= 100)
  );

ALTER TABLE public.commitment_sov_lines
  ADD CONSTRAINT commitment_sov_lines_scheduled_nonnegative_check
    CHECK (scheduled_value >= 0);

-- Existing null/blank references predate the bank-reference requirement.  Give
-- them an explicit, stable legacy key rather than leaving an unauditable blank.
UPDATE public.commitment_payments
SET reference = 'LEGACY-' || id::text
WHERE NULLIF(BTRIM(reference), '') IS NULL;

ALTER TABLE public.commitment_payments
  ALTER COLUMN reference SET NOT NULL,
  ADD CONSTRAINT commitment_payments_reference_nonblank_check
    CHECK (NULLIF(BTRIM(reference), '') IS NOT NULL);

-- Tenant-scoped and normalized.  Concurrent duplicates are rejected by
-- PostgreSQL with SQLSTATE 23505 and this named index identifies the condition.
CREATE UNIQUE INDEX commitment_payments_tenant_reference_unique
  ON public.commitment_payments (tenant_id, LOWER(BTRIM(reference)));

-- Central authority check used by approval, payment, lien, historical-posting,
-- and paid-document finalization controls.  NULL auth.uid() is reserved for
-- trusted migration/service execution; authenticated callers need a finance
-- role in the installed app-role model.
CREATE OR REPLACE FUNCTION public.is_commitment_finance_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NULL
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN (
          'admin',
          'owner',
          'administrator',
          'manager',
          'project_manager'
        )
    );
$$;

REVOKE ALL ON FUNCTION public.is_commitment_finance_operator() FROM PUBLIC;

-- Historical classifications and vendor-portal attestations are backend-only.
-- The portal RPC proves the subcontractor identity and then inserts through a
-- SECURITY DEFINER boundary; a direct REST insert cannot self-label evidence.
CREATE OR REPLACE FUNCTION public.guard_commitment_invoice_restricted_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.source_kind IN (
    'historical_bank_reconstruction',
    'historical_reconciliation',
    'historical_exception'
  )
  AND (TG_OP = 'INSERT' OR NEW.source_kind IS DISTINCT FROM OLD.source_kind)
  AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION
      'HISTORICAL_SOURCE_RESTRICTED: historical invoice reconstruction is backend-only';
  END IF;

  IF NEW.source_kind = 'vendor_portal_invoice'
     AND (TG_OP = 'INSERT' OR NEW.source_kind IS DISTINCT FROM OLD.source_kind)
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION
      'VENDOR_PORTAL_SOURCE_RESTRICTED: use the subcontractor portal invoice RPC';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_00_commitment_invoice_historical_source ON public.commitment_invoices;
DROP TRIGGER IF EXISTS trg_00_commitment_invoice_restricted_source ON public.commitment_invoices;
CREATE TRIGGER trg_00_commitment_invoice_restricted_source
  BEFORE INSERT OR UPDATE ON public.commitment_invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_commitment_invoice_restricted_source();

DROP FUNCTION IF EXISTS public.guard_commitment_invoice_historical_source();

-- Stamp lifecycle events, disallow a synthetic paid status, and prevent approved
-- vendor billings from exceeding the commitment's revised value.  The commitment
-- row lock serializes concurrent approvals for the same subcontract.
CREATE OR REPLACE FUNCTION public.guard_and_stamp_commitment_invoice_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commitment_tenant uuid;
  v_commitment_status text;
  v_commitment_project uuid;
  v_original numeric(14,2);
  v_approved_changes numeric(14,2);
  v_revised numeric(14,2);
  v_other_approved numeric(14,2);
  v_payable numeric(14,2);
  v_paid numeric(14,2);
  v_last_paid date;
  v_artifact_ok boolean;
  v_line_count bigint;
  v_line_total numeric(14,2);
  v_source_line_mismatch bigint;
BEGIN
  SELECT c.tenant_id, c.status, c.project_id, c.original_value
    INTO v_commitment_tenant, v_commitment_status, v_commitment_project, v_original
  FROM public.commitments c
  WHERE c.id = NEW.commitment_id
  FOR UPDATE;

  IF v_commitment_tenant IS NULL
     OR v_commitment_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'COMMITMENT_MISMATCH: invoice commitment % is not in tenant %',
      NEW.commitment_id, NEW.tenant_id;
  END IF;

  IF NEW.source_kind = 'vendor_portal_invoice'
     AND (
       TG_OP = 'INSERT'
       OR (TG_OP = 'UPDATE' AND OLD.status IN ('draft', 'rejected'))
     )
     AND auth.uid() IS NOT NULL
     AND (
       NEW.vendor_attested_by IS DISTINCT FROM auth.uid()
       OR NEW.created_by IS DISTINCT FROM auth.uid()
       OR NEW.vendor_attested_org_id IS NULL
       OR NOT EXISTS (
         SELECT 1
         FROM public.portal_memberships pm
         JOIN public.commitments cm
           ON cm.id = NEW.commitment_id
          AND cm.vendor_org_id = pm.organization_id
         WHERE pm.user_id = auth.uid()
           AND pm.tenant_id = NEW.tenant_id
           AND pm.organization_id = NEW.vendor_attested_org_id
           AND pm.portal_kind = 'sub'
           AND pm.is_active = true
       )
     ) THEN
    RAISE EXCEPTION
      'VENDOR_ATTESTATION_REQUIRED: only an active subcontractor-portal member for this vendor may author or revise this invoice';
  END IF;

  IF TG_OP = 'INSERT'
     AND NEW.status <> 'draft'
     AND NEW.source_kind <> 'historical_exception' THEN
    RAISE EXCEPTION
      'INVOICE_WORKFLOW: normal invoices must be created as draft';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'draft' AND NEW.status = 'submitted')
      OR (OLD.status = 'submitted' AND NEW.status IN ('approved', 'rejected'))
      OR (OLD.status = 'rejected' AND NEW.status = 'draft')
      OR (OLD.status = 'approved' AND NEW.status = 'paid')
    ) THEN
      RAISE EXCEPTION
        'INVOICE_WORKFLOW: invalid status transition % -> %', OLD.status, NEW.status;
    END IF;

    IF NEW.status = 'approved'
       AND NOT public.is_commitment_finance_operator() THEN
      RAISE EXCEPTION
        'FINANCE_ROLE_REQUIRED: invoice approval requires admin, owner, or manager authority';
    END IF;

    IF OLD.status = 'draft'
       AND NEW.status = 'submitted'
       AND NEW.source_kind NOT IN (
         'historical_bank_reconstruction',
         'historical_reconciliation',
         'historical_exception'
       ) THEN
      -- Serialize submission with every mutable source-evidence row. A source
      -- edit that commits first is validated as submitted; one that waits sees
      -- the invoice locked and is rejected by the source/artifact guards.
      IF NEW.source_kind IN ('vendor_invoice', 'portal_submission') THEN
        PERFORM 1
        FROM public.vendor_submissions vs
        WHERE vs.id = NEW.vendor_submission_id
        FOR UPDATE;

        PERFORM 1
        FROM public.project_artifacts pa
        WHERE pa.id = NEW.artifact_id
        FOR UPDATE;

        PERFORM 1
        FROM storage.objects so
        JOIN public.project_artifacts pa ON pa.file_path = so.name
        WHERE so.bucket_id = 'project-artifacts'
          AND pa.id = NEW.artifact_id
        FOR UPDATE OF so;
      ELSIF NEW.source_kind = 'vendor_pay_app' THEN
        PERFORM 1
        FROM public.vendor_payapp_submissions vp
        WHERE vp.id = NEW.vendor_payapp_submission_id
        FOR UPDATE;
      ELSIF NEW.source_kind = 'vendor_portal_invoice' THEN
        PERFORM 1
        FROM public.portal_memberships pm
        WHERE pm.user_id = NEW.vendor_attested_by
          AND pm.tenant_id = NEW.tenant_id
          AND pm.organization_id = NEW.vendor_attested_org_id
          AND pm.portal_kind = 'sub'
          AND pm.is_active = true
        FOR UPDATE;

        IF auth.uid() IS NOT NULL AND NOT FOUND THEN
          RAISE EXCEPTION
            'VENDOR_ATTESTATION_REQUIRED: subcontractor portal membership is no longer active';
        END IF;
      END IF;

      SELECT
        COUNT(*),
        COALESCE(SUM(cil.work_this_period + cil.materials_stored), 0)
        INTO v_line_count, v_line_total
      FROM public.commitment_invoice_lines cil
      WHERE cil.invoice_id = NEW.id;

      IF v_line_count = 0
         OR NEW.submitted_amount IS NULL
         OR NEW.submitted_amount <> v_line_total THEN
        RAISE EXCEPTION
          'INVOICE_TOTAL_MISMATCH: submitted amount (%) must equal frozen SOV line total (%) across % lines',
          NEW.submitted_amount, v_line_total, v_line_count;
      END IF;

      IF NEW.source_kind = 'vendor_pay_app' THEN
        WITH expected AS (
          SELECT
            (item.value->>'sov_line_id')::uuid AS sov_line_id,
            COALESCE(NULLIF(item.value->>'this_period', '')::numeric, 0) AS work_this_period,
            COALESCE(NULLIF(item.value->>'materials', '')::numeric, 0) AS materials_stored
          FROM public.vendor_payapp_submissions vp
          CROSS JOIN LATERAL jsonb_array_elements(vp.lines) AS item(value)
          WHERE vp.id = NEW.vendor_payapp_submission_id
        ), actual AS (
          SELECT cil.sov_line_id, cil.work_this_period, cil.materials_stored
          FROM public.commitment_invoice_lines cil
          WHERE cil.invoice_id = NEW.id
        )
        SELECT COUNT(*)
          INTO v_source_line_mismatch
        FROM (
          (SELECT * FROM expected EXCEPT ALL SELECT * FROM actual)
          UNION ALL
          (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)
        ) diff;

        IF v_source_line_mismatch <> 0 THEN
          RAISE EXCEPTION
            'PAYAPP_SOURCE_MISMATCH: mapped invoice lines must exactly match the signed vendor pay app';
        END IF;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.commitment_invoice_lines current_line
        JOIN public.commitment_sov_lines csl
          ON csl.id = current_line.sov_line_id
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(
            prior_line.work_this_period + prior_line.materials_stored
          ), 0) AS prior_billed
          FROM public.commitment_invoice_lines prior_line
          JOIN public.commitment_invoices prior_invoice
            ON prior_invoice.id = prior_line.invoice_id
          WHERE prior_line.sov_line_id = current_line.sov_line_id
            AND prior_invoice.id <> NEW.id
            AND prior_invoice.commitment_id = NEW.commitment_id
            AND prior_invoice.status IN ('submitted', 'approved', 'paid')
        ) prior ON true
        WHERE current_line.invoice_id = NEW.id
          AND prior.prior_billed
            + current_line.work_this_period
            + current_line.materials_stored
            > csl.scheduled_value
      ) THEN
        RAISE EXCEPTION
          'SOV_OVERBILLING: submitted invoice would exceed a commitment SOV line';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND (
    NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.commitment_id IS DISTINCT FROM OLD.commitment_id
    OR (
      OLD.status IN ('submitted', 'approved', 'paid')
      AND (
        NEW.created_at IS DISTINCT FROM OLD.created_at
        OR NEW.created_by IS DISTINCT FROM OLD.created_by
      )
    )
  ) THEN
    RAISE EXCEPTION
      'INVOICE_IMMUTABLE: tenant, commitment, and submitted-record authorship cannot change';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'submitted'
     AND NEW.status <> 'approved'
     AND (
       NEW.approved_amount IS DISTINCT FROM OLD.approved_amount
       OR NEW.retainage_held IS DISTINCT FROM OLD.retainage_held
       OR NEW.processed_at IS DISTINCT FROM OLD.processed_at
       OR NEW.processed_by IS DISTINCT FROM OLD.processed_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
       OR NEW.paid_by IS DISTINCT FROM OLD.paid_by
     ) THEN
    RAISE EXCEPTION
      'FINANCE_ROLE_REQUIRED: submitted invoice accounting terms can change only during finance approval';
  END IF;

  SELECT COALESCE(SUM(cp.amount), 0), MAX(cp.paid_date)
    INTO v_paid, v_last_paid
  FROM public.commitment_payments cp
  WHERE cp.commitment_invoice_id = NEW.id;

  -- Submitted evidence is fixed until it is explicitly rejected back to draft.
  -- This prevents approval from silently changing the vendor's invoice header
  -- or replacing its source document/pay-app linkage.
  IF TG_OP = 'UPDATE' AND OLD.status IN ('submitted', 'approved', 'paid') THEN
    IF NEW.invoice_no IS DISTINCT FROM OLD.invoice_no
       OR NEW.period_end IS DISTINCT FROM OLD.period_end
       OR NEW.submitted_amount IS DISTINCT FROM OLD.submitted_amount
       OR (
         NEW.source_kind IS DISTINCT FROM OLD.source_kind
         AND NOT (
           OLD.source_kind = 'manual'
           AND NEW.source_kind = 'historical_bank_reconstruction'
         )
       )
       OR NEW.historical_exception_reason IS DISTINCT FROM OLD.historical_exception_reason
       OR NEW.received_at IS DISTINCT FROM OLD.received_at
       OR NEW.vendor_submission_id IS DISTINCT FROM OLD.vendor_submission_id
       OR NEW.vendor_payapp_submission_id IS DISTINCT FROM OLD.vendor_payapp_submission_id
       OR NEW.vendor_attested_at IS DISTINCT FROM OLD.vendor_attested_at
       OR NEW.vendor_attested_by IS DISTINCT FROM OLD.vendor_attested_by
       OR NEW.vendor_attested_org_id IS DISTINCT FROM OLD.vendor_attested_org_id
       OR NEW.artifact_id IS DISTINCT FROM OLD.artifact_id THEN
      RAISE EXCEPTION
        'INVOICE_IMMUTABLE: reject the submitted invoice back to draft before changing its evidence';
    END IF;
  END IF;

  -- Approval fixes the accounting terms and audit stamps.  The only lifecycle
  -- change left is the automatic approved -> paid transition after cash posts.
  IF TG_OP = 'UPDATE' AND OLD.status IN ('approved', 'paid') THEN
    IF NEW.approved_amount IS DISTINCT FROM OLD.approved_amount
       OR NEW.retainage_held IS DISTINCT FROM OLD.retainage_held THEN
      RAISE EXCEPTION
        'INVOICE_IMMUTABLE: approved invoice accounting terms cannot be rewritten';
    END IF;

    IF NEW.received_at IS DISTINCT FROM OLD.received_at
       OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
       OR NEW.processed_at IS DISTINCT FROM OLD.processed_at
       OR NEW.processed_by IS DISTINCT FROM OLD.processed_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR (
         NEW.paid_at IS DISTINCT FROM OLD.paid_at
         AND NOT (OLD.status = 'approved' AND NEW.status = 'paid' AND OLD.paid_at IS NULL)
       )
       OR (
         NEW.paid_by IS DISTINCT FROM OLD.paid_by
         AND NOT (OLD.status = 'approved' AND NEW.status = 'paid' AND OLD.paid_by IS NULL)
       ) THEN
      RAISE EXCEPTION
        'INVOICE_IMMUTABLE: approved invoice stamps cannot be rewritten';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status = 'approved' AND NEW.status = 'paid') THEN
      RAISE EXCEPTION
        'INVOICE_IMMUTABLE: approved invoice status cannot regress or be rewritten';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.finalized_artifact_id IS NOT NULL AND (
    NEW.finalized_artifact_id IS DISTINCT FROM OLD.finalized_artifact_id
    OR NEW.finalized_at IS DISTINCT FROM OLD.finalized_at
    OR NEW.finalized_by IS DISTINCT FROM OLD.finalized_by
  ) THEN
    RAISE EXCEPTION
      'FINALIZED_INVOICE_IMMUTABLE: the stamped paid PDF cannot be replaced';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.finalized_artifact_id IS NULL
     AND NEW.finalized_artifact_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.project_artifacts pa
      WHERE pa.id = NEW.finalized_artifact_id
        AND pa.tenant_id = NEW.tenant_id
        AND pa.project_id = v_commitment_project
        AND pa.artifact_type = 'invoice'
        AND pa.mime_type = 'application/pdf'
        AND pa.linked_entity_type = 'commitment_invoice'
        AND pa.linked_entity_id = NEW.id
    ) INTO v_artifact_ok;

    IF NEW.status <> 'paid'
       OR v_paid <= 0
       OR NOT public.is_commitment_finance_operator()
       OR v_artifact_ok IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION
        'FINALIZED_INVOICE_INVALID: paid PDF must be a linked same-project invoice artifact posted by finance';
    END IF;

    NEW.finalized_at := now();
    NEW.finalized_by := auth.uid();
  END IF;

  NEW.received_at := COALESCE(NEW.received_at, now());

  IF (TG_OP = 'INSERT' AND NEW.status IN ('submitted', 'approved', 'paid'))
     OR (
       TG_OP = 'UPDATE'
       AND OLD.status = 'draft'
       AND NEW.status = 'submitted'
     ) THEN
    NEW.submitted_at := now();
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'draft'
     AND NEW.status = 'submitted' THEN
    NEW.approved_amount := NULL;
    NEW.processed_at := NULL;
    NEW.processed_by := NULL;
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
    NEW.paid_at := NULL;
    NEW.paid_by := NULL;
  ELSIF TG_OP = 'UPDATE'
        AND OLD.status = 'rejected'
        AND NEW.status = 'draft' THEN
    NEW.approved_amount := NULL;
    NEW.processed_at := NULL;
    NEW.processed_by := NULL;
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
    NEW.paid_at := NULL;
    NEW.paid_by := NULL;
  END IF;

  IF NEW.status IN ('approved', 'paid') THEN
    IF v_commitment_status <> 'executed' THEN
      RAISE EXCEPTION
        'COMMITMENT_NOT_EXECUTED: invoice cannot be approved against commitment status %',
        v_commitment_status;
    END IF;
    IF COALESCE(NEW.approved_amount, 0) <= 0 THEN
      RAISE EXCEPTION 'INVOICE_NOT_APPROVED: approved invoices require approved_amount > 0';
    END IF;

    IF (TG_OP = 'INSERT' AND NEW.status IN ('approved', 'paid'))
       OR (
         TG_OP = 'UPDATE'
         AND OLD.status = 'submitted'
         AND NEW.status = 'approved'
       ) THEN
      NEW.processed_at := now();
      NEW.processed_by := auth.uid();
      NEW.approved_at := now();
      NEW.approved_by := auth.uid();
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.status = 'submitted'
       AND NEW.status = 'approved'
       AND NEW.source_kind = 'vendor_pay_app'
       AND (
         NEW.approved_amount IS DISTINCT FROM NEW.submitted_amount
         OR NEW.retainage_held IS DISTINCT FROM OLD.retainage_held
       ) THEN
      RAISE EXCEPTION
        'PAYAPP_APPROVAL_MISMATCH: approve the signed pay app exactly or reject it for vendor revision';
    END IF;

    SELECT COALESCE(SUM(co.amount), 0)
      INTO v_approved_changes
    FROM public.change_orders co
    WHERE co.commitment_id = NEW.commitment_id
      AND co.co_type = 'CCO'
      AND co.status IN ('approved', 'executed');

    v_revised := COALESCE(v_original, 0) + v_approved_changes;

    SELECT COALESCE(SUM(ci.approved_amount), 0)
      INTO v_other_approved
    FROM public.commitment_invoices ci
    WHERE ci.commitment_id = NEW.commitment_id
      AND ci.status IN ('approved', 'paid')
      AND ci.id <> NEW.id;

    IF v_other_approved + NEW.approved_amount > v_revised THEN
      RAISE EXCEPTION
        'COMMITMENT_OVERPAYMENT: approved invoices (%) would exceed revised commitment (%)',
        v_other_approved + NEW.approved_amount, v_revised;
    END IF;
  END IF;

  IF NEW.status = 'paid' THEN
    v_payable := GREATEST(
      COALESCE(NEW.approved_amount, 0) - COALESCE(NEW.retainage_held, 0),
      0
    );

    IF v_payable <= 0 OR v_paid < v_payable THEN
      RAISE EXCEPTION
        'INVOICE_NOT_APPROVED: invoice cannot be marked paid before net payable (%) is disbursed; paid (%)',
        v_payable, v_paid;
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.status = 'approved'
       AND NEW.status = 'paid' THEN
      NEW.paid_at := COALESCE(
        v_last_paid::timestamp AT TIME ZONE 'UTC',
        now()
      );
      NEW.paid_by := auth.uid();
    ELSIF TG_OP = 'INSERT' THEN
      NEW.paid_at := COALESCE(
        v_last_paid::timestamp AT TIME ZONE 'UTC',
        now()
      );
      NEW.paid_by := auth.uid();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commitment_invoice_lifecycle ON public.commitment_invoices;
CREATE TRIGGER trg_commitment_invoice_lifecycle
  BEFORE INSERT OR UPDATE ON public.commitment_invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_and_stamp_commitment_invoice_lifecycle();

-- A normal submitted invoice must retain a bidirectional link to either the
-- vendor document received in the inbox or the vendor's signed structured pay
-- app. Historical sources are trusted only because the earlier source trigger
-- makes those classifications backend-only.
CREATE OR REPLACE FUNCTION public.commitment_invoice_has_valid_source(p_invoice_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN ci.source_kind IN (
        'historical_bank_reconstruction',
        'historical_reconciliation',
        'historical_exception'
      ) THEN true
      -- Native structured invoices are valid only when a dedicated portal RPC
      -- recorded the subcontractor user and vendor organization. A generic
      -- GC-created manual draft deliberately cannot enter the payable ledger.
      WHEN ci.source_kind = 'vendor_portal_invoice' THEN
        ci.vendor_attested_at IS NOT NULL
        AND ci.vendor_attested_by IS NOT NULL
        AND ci.vendor_attested_by = ci.created_by
        AND ci.vendor_attested_org_id IS NOT NULL
        AND ci.vendor_attested_org_id = cm.vendor_org_id
        AND ci.vendor_submission_id IS NULL
        AND ci.vendor_payapp_submission_id IS NULL
        AND EXISTS (
        SELECT 1
        FROM public.commitment_invoice_lines cil
        JOIN public.commitment_sov_lines csl
          ON csl.id = cil.sov_line_id
        WHERE cil.invoice_id = ci.id
          AND csl.commitment_id = ci.commitment_id
        )
      WHEN ci.source_kind IN ('vendor_invoice', 'portal_submission') THEN EXISTS (
        SELECT 1
        FROM public.vendor_submissions vs
        JOIN public.project_artifacts pa ON pa.id = vs.artifact_id
        WHERE vs.id = ci.vendor_submission_id
          AND vs.tenant_id = ci.tenant_id
          AND vs.project_id = cm.project_id
          AND vs.commitment_id = ci.commitment_id
          AND vs.doc_type = 'invoice'
          AND vs.status = 'processed'
          AND vs.created_commitment_invoice_id = ci.id
          AND vs.artifact_id = ci.artifact_id
          AND pa.tenant_id = ci.tenant_id
          AND pa.project_id = cm.project_id
          AND pa.artifact_type = 'invoice'
          AND pa.linked_entity_type = 'commitment_invoice'
          AND pa.linked_entity_id = ci.id
          AND EXISTS (
            SELECT 1
            FROM storage.objects so
            WHERE so.bucket_id = 'project-artifacts'
              AND so.name = pa.file_path
          )
          AND (
            (ci.source_kind = 'portal_submission' AND vs.source = 'portal')
            OR (
              ci.source_kind = 'vendor_invoice'
              AND vs.source IN ('email', 'folder', 'manual_upload')
            )
          )
      )
      WHEN ci.source_kind = 'vendor_pay_app' THEN EXISTS (
        SELECT 1
        FROM public.vendor_payapp_submissions vp
        WHERE vp.id = ci.vendor_payapp_submission_id
          AND vp.tenant_id = ci.tenant_id
          AND vp.project_id = cm.project_id
          AND vp.commitment_id = ci.commitment_id
          AND vp.commitment_invoice_id = ci.id
          AND vp.status IN ('approved', 'paid')
          AND vp.submitted_at IS NOT NULL
          AND vp.conditional_signed_at IS NOT NULL
          AND NULLIF(BTRIM(vp.conditional_signed_name), '') IS NOT NULL
          AND vp.apas_waiver_ack = true
      )
      ELSE false
    END
    FROM public.commitment_invoices ci
    JOIN public.commitments cm ON cm.id = ci.commitment_id
    WHERE ci.id = p_invoice_id
  ), false);
$$;

REVOKE ALL ON FUNCTION public.commitment_invoice_has_valid_source(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.enforce_commitment_invoice_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('submitted', 'approved', 'paid')
     AND (
       TG_OP = 'INSERT'
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.source_kind IS DISTINCT FROM OLD.source_kind
       OR NEW.vendor_submission_id IS DISTINCT FROM OLD.vendor_submission_id
       OR NEW.vendor_payapp_submission_id IS DISTINCT FROM OLD.vendor_payapp_submission_id
       OR NEW.artifact_id IS DISTINCT FROM OLD.artifact_id
    )
     AND NOT public.commitment_invoice_has_valid_source(NEW.id) THEN
    RAISE EXCEPTION
      'INVOICE_SOURCE_REQUIRED: submitted invoices require a vendor-attested portal invoice, linked vendor document, or signed vendor pay app; historical sources are backend-only';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commitment_invoice_source ON public.commitment_invoices;
CREATE TRIGGER trg_commitment_invoice_source
  AFTER INSERT OR UPDATE ON public.commitment_invoices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_commitment_invoice_source();

CREATE OR REPLACE FUNCTION public.enforce_vendor_payapp_commitment_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.commitment_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.commitments cm
       WHERE cm.id = NEW.commitment_id
         AND cm.tenant_id = NEW.tenant_id
         AND cm.project_id = NEW.project_id
     ) THEN
    RAISE EXCEPTION
      'COMMITMENT_MISMATCH: every vendor pay app must belong to a same-workspace project commitment';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_00_vendor_payapp_commitment_scope ON public.vendor_payapp_submissions;
CREATE TRIGGER trg_00_vendor_payapp_commitment_scope
  BEFORE INSERT OR UPDATE ON public.vendor_payapp_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vendor_payapp_commitment_scope();

-- Authenticated subcontractors can author a native structured invoice without
-- uploading a duplicate PDF. The RPC records who attested, which vendor they
-- represented, and the portal context; those fields become immutable evidence.
CREATE OR REPLACE FUNCTION public.create_vendor_portal_commitment_invoice(
  p_commitment_id uuid,
  p_invoice_no text,
  p_period_end date
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tenant uuid := public.current_tenant_id();
  v_project uuid;
  v_vendor_org uuid;
  v_invoice uuid;
BEGIN
  IF v_user IS NULL OR v_tenant IS NULL THEN
    RAISE EXCEPTION 'VENDOR_ATTESTATION_REQUIRED: sign in through the subcontractor portal';
  END IF;

  IF NULLIF(BTRIM(p_invoice_no), '') IS NULL OR p_period_end IS NULL THEN
    RAISE EXCEPTION 'Invoice number and period end are required';
  END IF;

  SELECT cm.project_id, cm.vendor_org_id
    INTO v_project, v_vendor_org
  FROM public.commitments cm
  WHERE cm.id = p_commitment_id
    AND cm.tenant_id = v_tenant
    AND cm.vendor_org_id IS NOT NULL
  FOR UPDATE;

  IF v_project IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.portal_memberships pm
       WHERE pm.user_id = v_user
         AND pm.tenant_id = v_tenant
         AND pm.organization_id = v_vendor_org
         AND pm.portal_kind = 'sub'
         AND pm.is_active = true
     ) THEN
    RAISE EXCEPTION
      'VENDOR_ATTESTATION_REQUIRED: this subcontract is not assigned to your active vendor portal membership';
  END IF;

  INSERT INTO public.commitment_invoices (
    tenant_id,
    commitment_id,
    invoice_no,
    period_end,
    status,
    submitted_amount,
    retainage_held,
    source_kind,
    received_at,
    vendor_attested_at,
    vendor_attested_by,
    vendor_attested_org_id,
    created_by
  ) VALUES (
    v_tenant,
    p_commitment_id,
    BTRIM(p_invoice_no),
    p_period_end,
    'draft',
    0,
    0,
    'vendor_portal_invoice',
    now(),
    now(),
    v_user,
    v_vendor_org,
    v_user
  )
  RETURNING id INTO v_invoice;

  RETURN v_invoice;
END;
$$;

REVOKE ALL ON FUNCTION public.create_vendor_portal_commitment_invoice(uuid, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_vendor_portal_commitment_invoice(uuid, text, date) TO authenticated;

-- Turn an uploaded/emailed/portal invoice in the Vendor Inbox into a draft and
-- establish both directions of the source-document link in one transaction.
CREATE OR REPLACE FUNCTION public.process_vendor_submission_invoice(
  p_submission_id uuid,
  p_commitment_id uuid,
  p_invoice_no text DEFAULT NULL,
  p_period_end date DEFAULT NULL,
  p_submitted_amount numeric DEFAULT NULL,
  p_retainage_held numeric DEFAULT 0
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tenant uuid := public.current_tenant_id();
  v_project uuid;
  v_source text;
  v_doc_type text;
  v_status text;
  v_artifact uuid;
  v_received timestamptz;
  v_existing uuid;
  v_invoice uuid;
  v_invoice_no text;
  v_artifact_link_type text;
  v_artifact_link_id uuid;
BEGIN
  IF v_user IS NULL OR v_tenant IS NULL THEN
    RAISE EXCEPTION 'Vendor invoice processing requires an authenticated workspace user';
  END IF;

  SELECT
    vs.project_id,
    vs.source,
    vs.doc_type,
    vs.status,
    vs.artifact_id,
    vs.received_at,
    vs.created_commitment_invoice_id
  INTO
    v_project,
    v_source,
    v_doc_type,
    v_status,
    v_artifact,
    v_received,
    v_existing
  FROM public.vendor_submissions vs
  WHERE vs.id = p_submission_id
    AND vs.tenant_id = v_tenant
  FOR UPDATE;

  IF v_project IS NULL THEN
    RAISE EXCEPTION 'Vendor submission not found in your workspace';
  END IF;

  IF v_existing IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.commitment_invoices ci
      WHERE ci.id = v_existing
        AND ci.commitment_id = p_commitment_id
        AND ci.vendor_submission_id = p_submission_id
    ) THEN
      RETURN v_existing;
    END IF;
    RAISE EXCEPTION 'Vendor submission is already linked to a different invoice';
  END IF;

  IF v_doc_type <> 'invoice'
     OR v_status NOT IN ('received', 'parsed', 'needs_review', 'processed')
     OR v_artifact IS NULL THEN
    RAISE EXCEPTION
      'INVOICE_SOURCE_REQUIRED: classify the submission as an invoice with an uploaded source document first';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.commitments cm
    WHERE cm.id = p_commitment_id
      AND cm.tenant_id = v_tenant
      AND cm.project_id = v_project
  ) THEN
    RAISE EXCEPTION 'Commitment is not in the submission project/workspace';
  END IF;

  SELECT pa.linked_entity_type, pa.linked_entity_id
    INTO v_artifact_link_type, v_artifact_link_id
  FROM public.project_artifacts pa
  WHERE pa.id = v_artifact
    AND pa.tenant_id = v_tenant
    AND pa.project_id = v_project
    AND pa.artifact_type = 'invoice'
  FOR UPDATE;

  IF NOT FOUND
     OR v_artifact_link_type IS NOT NULL
     OR v_artifact_link_id IS NOT NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.project_artifacts pa
       JOIN storage.objects so
         ON so.bucket_id = 'project-artifacts'
        AND so.name = pa.file_path
       WHERE pa.id = v_artifact
     ) THEN
    RAISE EXCEPTION
      'INVOICE_SOURCE_REQUIRED: source artifact must be an unclaimed invoice document in the same project';
  END IF;

  PERFORM 1
  FROM storage.objects so
  JOIN public.project_artifacts pa ON pa.file_path = so.name
  WHERE so.bucket_id = 'project-artifacts'
    AND pa.id = v_artifact
  FOR UPDATE OF so;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVOICE_SOURCE_REQUIRED: source artifact bytes are missing';
  END IF;

  v_invoice_no := NULLIF(BTRIM(p_invoice_no), '');
  IF v_invoice_no IS NULL THEN
    v_invoice_no := 'SUB-' || LEFT(p_submission_id::text, 8);
  END IF;

  IF COALESCE(p_submitted_amount, 0) < 0
     OR COALESCE(p_retainage_held, 0) < 0
     OR COALESCE(p_retainage_held, 0) > COALESCE(p_submitted_amount, 0) THEN
    RAISE EXCEPTION 'Invoice amount/retainage is outside the allowed range';
  END IF;

  v_invoice := gen_random_uuid();

  UPDATE public.project_artifacts
  SET
    linked_entity_type = 'commitment_invoice',
    linked_entity_id = v_invoice
  WHERE id = v_artifact;

  INSERT INTO public.commitment_invoices (
    id,
    tenant_id,
    commitment_id,
    invoice_no,
    period_end,
    status,
    submitted_amount,
    retainage_held,
    source_kind,
    received_at,
    artifact_id,
    vendor_submission_id,
    created_by
  ) VALUES (
    v_invoice,
    v_tenant,
    p_commitment_id,
    v_invoice_no,
    COALESCE(p_period_end, CURRENT_DATE),
    'draft',
    COALESCE(p_submitted_amount, 0),
    COALESCE(p_retainage_held, 0),
    CASE WHEN v_source = 'portal' THEN 'portal_submission' ELSE 'vendor_invoice' END,
    v_received,
    v_artifact,
    p_submission_id,
    v_user
  );

  UPDATE public.vendor_submissions
  SET
    status = 'processed',
    commitment_id = p_commitment_id,
    created_commitment_invoice_id = v_invoice
  WHERE id = p_submission_id;

  RETURN v_invoice;
END;
$$;

REVOKE ALL ON FUNCTION public.process_vendor_submission_invoice(uuid, uuid, text, date, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_vendor_submission_invoice(uuid, uuid, text, date, numeric, numeric) TO authenticated;

-- Finance approval of a signed structured pay app atomically creates its draft
-- invoice, the approved inbound conditional waiver, and both source backlinks.
CREATE OR REPLACE FUNCTION public.convert_vendor_payapp_to_commitment_invoice(
  p_submission_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tenant uuid := public.current_tenant_id();
  v_project uuid;
  v_commitment uuid;
  v_status text;
  v_app_no integer;
  v_period date;
  v_current_due numeric(14,2);
  v_lines jsonb;
  v_retainage_pct numeric;
  v_commitment_retainage_pct numeric;
  v_current_gross numeric(14,2);
  v_current_retainage numeric(14,2);
  v_submitted_at timestamptz;
  v_signed_at timestamptz;
  v_signed_name text;
  v_ack boolean;
  v_waiver_type text;
  v_vendor_name text;
  v_existing uuid;
  v_invoice uuid;
BEGIN
  IF v_user IS NULL
     OR v_tenant IS NULL
     OR NOT public.is_commitment_finance_operator() THEN
    RAISE EXCEPTION
      'FINANCE_ROLE_REQUIRED: approving a vendor pay app requires admin or manager authority';
  END IF;

  SELECT
    vp.project_id,
    vp.commitment_id,
    vp.status,
    vp.app_no,
    vp.period_to,
    vp.current_due,
    vp.lines,
    vp.retainage_pct,
    vp.submitted_at,
    vp.conditional_signed_at,
    vp.conditional_signed_name,
    vp.apas_waiver_ack,
    vp.waiver_type,
    vp.vendor_name,
    vp.commitment_invoice_id
  INTO
    v_project,
    v_commitment,
    v_status,
    v_app_no,
    v_period,
    v_current_due,
    v_lines,
    v_retainage_pct,
    v_submitted_at,
    v_signed_at,
    v_signed_name,
    v_ack,
    v_waiver_type,
    v_vendor_name,
    v_existing
  FROM public.vendor_payapp_submissions vp
  WHERE vp.id = p_submission_id
    AND vp.tenant_id = v_tenant
  FOR UPDATE;

  IF v_project IS NULL THEN
    RAISE EXCEPTION 'Vendor pay app not found in your workspace';
  END IF;

  IF v_existing IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.commitment_invoices ci
      WHERE ci.id = v_existing
        AND ci.vendor_payapp_submission_id = p_submission_id
    ) THEN
      RETURN v_existing;
    END IF;
    RAISE EXCEPTION 'Vendor pay app is already linked to a different invoice';
  END IF;

  IF v_commitment IS NULL
     OR v_status NOT IN ('submitted', 'approved')
     OR v_submitted_at IS NULL
     OR v_signed_at IS NULL
     OR NULLIF(BTRIM(v_signed_name), '') IS NULL
     OR v_ack IS DISTINCT FROM true
     OR COALESCE(v_current_due, 0) <= 0 THEN
    RAISE EXCEPTION
      'INVOICE_SOURCE_REQUIRED: vendor pay app must be submitted, signed, acknowledged, and have a positive amount';
  END IF;

  SELECT cm.retainage_pct
    INTO v_commitment_retainage_pct
  FROM public.commitments cm
  WHERE cm.id = v_commitment
    AND cm.tenant_id = v_tenant
    AND cm.project_id = v_project
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor pay app commitment is not in the submission project/workspace';
  END IF;

  IF v_retainage_pct IS DISTINCT FROM v_commitment_retainage_pct THEN
    RAISE EXCEPTION
      'PAYAPP_RETAINAGE_MISMATCH: signed pay app rate (%) must equal subcontract rate (%)',
      v_retainage_pct, v_commitment_retainage_pct;
  END IF;

  IF jsonb_typeof(COALESCE(v_lines, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(COALESCE(v_lines, '[]'::jsonb)) = 0
     OR EXISTS (
       SELECT 1
       FROM jsonb_array_elements(v_lines) AS item(value)
       WHERE COALESCE(item.value->>'sov_line_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          OR COALESCE(NULLIF(item.value->>'this_period', '')::numeric, 0) < 0
          OR COALESCE(NULLIF(item.value->>'materials', '')::numeric, 0) < 0
     )
     OR EXISTS (
       SELECT item.value->>'sov_line_id'
       FROM jsonb_array_elements(v_lines) AS item(value)
       GROUP BY item.value->>'sov_line_id'
       HAVING COUNT(*) > 1
     )
     OR EXISTS (
       SELECT 1
       FROM jsonb_array_elements(v_lines) AS item(value)
       LEFT JOIN public.commitment_sov_lines csl
         ON csl.id = (item.value->>'sov_line_id')::uuid
        AND csl.commitment_id = v_commitment
       WHERE csl.id IS NULL
     ) THEN
    RAISE EXCEPTION
      'PAYAPP_SOV_REQUIRED: every vendor pay-app row must map once to this commitment''s SOV';
  END IF;

  -- AIA rows are cumulative, while each commitment invoice must represent only
  -- the current billing period. Derive that period's gross work and retainage
  -- from this_period + materials instead of rebilling from_previous values.
  SELECT ROUND(COALESCE(SUM(
    COALESCE(NULLIF(item.value->>'this_period', '')::numeric, 0)
    + COALESCE(NULLIF(item.value->>'materials', '')::numeric, 0)
  ), 0), 2)
    INTO v_current_gross
  FROM jsonb_array_elements(COALESCE(v_lines, '[]'::jsonb)) AS item(value);

  v_current_retainage := ROUND(
    v_current_gross * COALESCE(v_commitment_retainage_pct, 0) / 100,
    2
  );

  IF v_current_gross <= 0
     OR ABS((v_current_gross - v_current_retainage) - v_current_due) > 0.01 THEN
    RAISE EXCEPTION
      'PAYAPP_TOTAL_MISMATCH: current-period gross (%) less retainage (%) must equal requested payment (%)',
      v_current_gross, v_current_retainage, v_current_due;
  END IF;

  INSERT INTO public.commitment_invoices (
    tenant_id,
    commitment_id,
    invoice_no,
    period_end,
    status,
    submitted_amount,
    retainage_held,
    source_kind,
    received_at,
    vendor_payapp_submission_id,
    created_by
  ) VALUES (
    v_tenant,
    v_commitment,
    'SUBAPP-' || COALESCE(v_app_no::text, LEFT(p_submission_id::text, 6)),
    COALESCE(v_period, CURRENT_DATE),
    'draft',
    v_current_gross,
    v_current_retainage,
    'vendor_pay_app',
    v_submitted_at,
    p_submission_id,
    v_user
  )
  RETURNING id INTO v_invoice;

  INSERT INTO public.commitment_invoice_lines (
    invoice_id,
    sov_line_id,
    work_this_period,
    materials_stored,
    pct_complete
  )
  SELECT
    v_invoice,
    csl.id,
    COALESCE(NULLIF(item.value->>'this_period', '')::numeric, 0),
    COALESCE(NULLIF(item.value->>'materials', '')::numeric, 0),
    CASE
      WHEN csl.scheduled_value > 0 THEN
        ROUND(
          100 * (
            COALESCE(NULLIF(item.value->>'this_period', '')::numeric, 0)
            + COALESCE(NULLIF(item.value->>'materials', '')::numeric, 0)
          ) / csl.scheduled_value,
          2
        )
      ELSE NULL
    END
  FROM jsonb_array_elements(v_lines) AS item(value)
  JOIN public.commitment_sov_lines csl
    ON csl.id = (item.value->>'sov_line_id')::uuid
   AND csl.commitment_id = v_commitment;

  UPDATE public.vendor_payapp_submissions
  SET
    status = 'approved',
    commitment_invoice_id = v_invoice
  WHERE id = p_submission_id;

  INSERT INTO public.lien_releases (
    tenant_id,
    project_id,
    direction,
    release_type,
    status,
    commitment_invoice_id,
    amount,
    through_date,
    claimant_name,
    claimant_signed_at,
    claimant_signed_name,
    executed_at,
    executed_by,
    locked,
    title,
    created_by
  ) VALUES (
    v_tenant,
    v_project,
    'inbound',
    COALESCE(v_waiver_type, 'conditional_progress'),
    'approved',
    v_invoice,
    v_current_due,
    COALESCE(v_period, CURRENT_DATE),
    v_vendor_name,
    v_signed_at,
    v_signed_name,
    now(),
    v_user,
    true,
    'Vendor-signed conditional waiver for pay app',
    v_user
  );

  RETURN v_invoice;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_vendor_payapp_to_commitment_invoice(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_vendor_payapp_to_commitment_invoice(uuid) TO authenticated;

-- Once an invoice is submitted, its inbound source row is accounting evidence.
-- Corrections go through invoice rejection/reprocessing, never an in-place edit
-- of the already-reviewed vendor document metadata.
CREATE OR REPLACE FUNCTION public.prevent_linked_vendor_submission_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_status text;
  v_draft_unlink boolean := false;
BEGIN
  IF OLD.created_commitment_invoice_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  SELECT ci.status
    INTO v_invoice_status
  FROM public.commitment_invoices ci
  WHERE ci.id = OLD.created_commitment_invoice_id;

  IF TG_OP = 'UPDATE' THEN
    v_draft_unlink := v_invoice_status = 'draft'
      AND NEW.created_commitment_invoice_id IS NULL
      AND NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id
      AND NEW.project_id IS NOT DISTINCT FROM OLD.project_id
      AND NEW.commitment_id IS NOT DISTINCT FROM OLD.commitment_id
      AND NEW.source IS NOT DISTINCT FROM OLD.source
      AND NEW.from_email IS NOT DISTINCT FROM OLD.from_email
      AND NEW.subject IS NOT DISTINCT FROM OLD.subject
      AND NEW.received_at IS NOT DISTINCT FROM OLD.received_at
      AND NEW.doc_type IS NOT DISTINCT FROM OLD.doc_type
      AND NEW.status IS NOT DISTINCT FROM OLD.status
      AND NEW.parsed IS NOT DISTINCT FROM OLD.parsed
      AND NEW.artifact_id IS NOT DISTINCT FROM OLD.artifact_id
      AND NEW.created_lien_release_id IS NOT DISTINCT FROM OLD.created_lien_release_id
      AND NEW.error IS NOT DISTINCT FROM OLD.error
      AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at;
  END IF;

  IF v_invoice_status IS NOT NULL AND NOT v_draft_unlink THEN
    IF TG_OP = 'DELETE'
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
       OR NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.commitment_id IS DISTINCT FROM OLD.commitment_id
       OR NEW.source IS DISTINCT FROM OLD.source
       OR NEW.from_email IS DISTINCT FROM OLD.from_email
       OR NEW.subject IS DISTINCT FROM OLD.subject
       OR NEW.received_at IS DISTINCT FROM OLD.received_at
       OR NEW.doc_type IS DISTINCT FROM OLD.doc_type
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.parsed IS DISTINCT FROM OLD.parsed
       OR NEW.artifact_id IS DISTINCT FROM OLD.artifact_id
       OR NEW.created_commitment_invoice_id IS DISTINCT FROM OLD.created_commitment_invoice_id
       OR NEW.created_lien_release_id IS DISTINCT FROM OLD.created_lien_release_id
       OR NEW.error IS DISTINCT FROM OLD.error
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
      RAISE EXCEPTION
        'INVOICE_SOURCE_IMMUTABLE: submitted vendor-document evidence cannot be changed or deleted';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_linked_vendor_submission_immutable ON public.vendor_submissions;
CREATE TRIGGER trg_linked_vendor_submission_immutable
  BEFORE UPDATE OR DELETE ON public.vendor_submissions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_vendor_submission_mutation();

CREATE OR REPLACE FUNCTION public.prevent_linked_vendor_payapp_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_status text;
  v_evidence_same boolean := false;
  v_paid_transition boolean := false;
  v_draft_unlink boolean := false;
  v_conversion_transition boolean := false;
  v_void_transition boolean := false;
  v_backend_requested_update boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL
       AND NOT public.is_commitment_finance_operator() THEN
      RAISE EXCEPTION
        'FINANCE_ROLE_REQUIRED: only finance may request a vendor pay app';
    END IF;

    IF NEW.status <> 'requested'
       OR NEW.submitted_at IS NOT NULL
       OR NEW.conditional_signed_at IS NOT NULL
       OR NEW.conditional_signed_name IS NOT NULL
       OR NEW.commitment_invoice_id IS NOT NULL
       OR COALESCE(jsonb_array_length(NEW.lines), 0) <> 0 THEN
      RAISE EXCEPTION
        'PAYAPP_REQUEST_INVALID: a new request cannot contain vendor-submitted evidence';
    END IF;

    IF auth.uid() IS NOT NULL
       AND NEW.created_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION
        'PAYAPP_REQUEST_INVALID: request author must be the authenticated finance user';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_evidence_same := (
      to_jsonb(NEW) - 'status' - 'commitment_invoice_id'
    ) IS NOT DISTINCT FROM (
      to_jsonb(OLD) - 'status' - 'commitment_invoice_id'
    );

    IF NEW.status = 'void'
       AND OLD.status <> 'void'
       AND NOT public.is_commitment_finance_operator() THEN
      RAISE EXCEPTION
        'FINANCE_ROLE_REQUIRED: voiding a vendor pay app requires finance authority';
    END IF;

    SELECT ci.status
      INTO v_invoice_status
    FROM public.commitment_invoices ci
    WHERE ci.id = COALESCE(OLD.commitment_invoice_id, NEW.commitment_invoice_id);

    v_paid_transition := OLD.status = 'approved'
      AND NEW.status = 'paid'
      AND NEW.commitment_invoice_id IS NOT DISTINCT FROM OLD.commitment_invoice_id
      AND v_evidence_same;

    v_draft_unlink := v_invoice_status = 'draft'
      AND NEW.commitment_invoice_id IS NULL
      AND (
        NEW.status IS NOT DISTINCT FROM OLD.status
        OR (
          OLD.status = 'approved'
          AND NEW.status = 'submitted'
          AND public.is_commitment_finance_operator()
        )
      )
      AND v_evidence_same;

    v_conversion_transition := OLD.commitment_invoice_id IS NULL
      AND OLD.status = 'submitted'
      AND NEW.status = 'approved'
      AND NEW.commitment_invoice_id IS NOT NULL
      AND v_evidence_same
      AND public.is_commitment_finance_operator()
      AND EXISTS (
        SELECT 1
        FROM public.commitment_invoices ci
        JOIN public.commitments cm ON cm.id = ci.commitment_id
        WHERE ci.id = NEW.commitment_invoice_id
          AND ci.status = 'draft'
          AND ci.source_kind = 'vendor_pay_app'
          AND ci.vendor_payapp_submission_id = OLD.id
          AND ci.tenant_id = OLD.tenant_id
          AND ci.commitment_id = OLD.commitment_id
          AND cm.project_id = OLD.project_id
      );

    v_void_transition := OLD.status IN ('requested', 'submitted')
      AND NEW.status = 'void'
      AND NEW.commitment_invoice_id IS NOT DISTINCT FROM OLD.commitment_invoice_id
      AND v_evidence_same
      AND public.is_commitment_finance_operator();

    -- Only the service-role token endpoint can save or submit vendor-authored
    -- fields. Authenticated tenant users may inspect requests, but cannot forge
    -- a signature or bypass the public vendor token flow through direct REST.
    v_backend_requested_update := OLD.status = 'requested'
      AND NEW.status IN ('requested', 'submitted')
      AND auth.uid() IS NULL
      AND NEW.commitment_invoice_id IS NULL
      AND NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id
      AND NEW.project_id IS NOT DISTINCT FROM OLD.project_id
      AND NEW.commitment_id IS NOT DISTINCT FROM OLD.commitment_id
      AND NEW.token IS NOT DISTINCT FROM OLD.token
      AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by
      AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at;

    IF OLD.status = 'requested'
       AND NOT v_backend_requested_update
       AND NOT v_void_transition THEN
      RAISE EXCEPTION
        'VENDOR_SUBMISSION_BACKEND_REQUIRED: save and submit through the token-scoped vendor endpoint';
    END IF;
  END IF;

  IF OLD.submitted_at IS NOT NULL
     OR OLD.status IN ('submitted', 'approved', 'paid', 'void')
     OR OLD.commitment_invoice_id IS NOT NULL THEN
    IF TG_OP = 'DELETE'
       OR (
         NOT v_paid_transition
         AND NOT v_draft_unlink
         AND NOT v_conversion_transition
         AND NOT v_void_transition
       ) THEN
      RAISE EXCEPTION
        'INVOICE_SOURCE_IMMUTABLE: signed vendor pay-app evidence cannot be changed or deleted';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.submitted_at IS NOT NULL OR OLD.status <> 'requested' THEN
      RAISE EXCEPTION
        'INVOICE_SOURCE_IMMUTABLE: signed vendor pay-app evidence cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.status = 'submitted'
     AND (
       NEW.submitted_at IS NULL
       OR NEW.conditional_signed_at IS NULL
       OR NULLIF(BTRIM(NEW.conditional_signed_name), '') IS NULL
       OR NEW.apas_waiver_ack IS DISTINCT FROM true
     ) THEN
    RAISE EXCEPTION
      'INVOICE_SOURCE_REQUIRED: submitted pay apps require signature, acknowledgment, and submitted timestamp';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_linked_vendor_payapp_immutable ON public.vendor_payapp_submissions;
CREATE TRIGGER trg_linked_vendor_payapp_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON public.vendor_payapp_submissions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_vendor_payapp_mutation();

CREATE OR REPLACE FUNCTION public.guard_commitment_invoice_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status <> 'draft'
     OR EXISTS (
       SELECT 1
       FROM public.commitment_payments cp
       WHERE cp.commitment_invoice_id = OLD.id
     ) THEN
    RAISE EXCEPTION
      'INVOICE_IMMUTABLE: only an unpaid draft invoice may be deleted';
  END IF;

  IF OLD.source_kind = 'vendor_portal_invoice'
     AND auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM OLD.vendor_attested_by THEN
    RAISE EXCEPTION
      'VENDOR_ATTESTATION_REQUIRED: only the attesting subcontractor can delete this draft';
  END IF;

  -- Conversion approves the signed pay-app source before its invoice is
  -- reviewed. If finance discards that still-draft invoice, restore the frozen
  -- pay app to submitted and clear its backlink so the same signed evidence can
  -- be processed again instead of becoming stranded in approved-without-invoice.
  IF OLD.vendor_payapp_submission_id IS NOT NULL THEN
    UPDATE public.vendor_payapp_submissions
    SET status = 'submitted', commitment_invoice_id = NULL
    WHERE id = OLD.vendor_payapp_submission_id
      AND commitment_invoice_id = OLD.id
      AND status = 'approved';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_commitment_invoice_delete_guard ON public.commitment_invoices;
CREATE TRIGGER trg_commitment_invoice_delete_guard
  BEFORE DELETE ON public.commitment_invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_commitment_invoice_delete();

-- If an uploaded draft is deliberately discarded, release the artifact claim
-- so the same immutable source document can be reviewed and processed again.
CREATE OR REPLACE FUNCTION public.release_deleted_draft_invoice_artifact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'draft' AND OLD.artifact_id IS NOT NULL THEN
    UPDATE public.project_artifacts
    SET linked_entity_type = NULL, linked_entity_id = NULL
    WHERE id = OLD.artifact_id
      AND linked_entity_type = 'commitment_invoice'
      AND linked_entity_id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_commitment_invoice_release_artifact ON public.commitment_invoices;
CREATE TRIGGER trg_commitment_invoice_release_artifact
  AFTER DELETE ON public.commitment_invoices
  FOR EACH ROW EXECUTE FUNCTION public.release_deleted_draft_invoice_artifact();

-- Invoice SOV detail is part of the submitted evidence. It remains editable
-- only while the parent is a draft; rejection must transition back to draft
-- before correction. Locking the parent serializes line edits with submit.
CREATE OR REPLACE FUNCTION public.guard_commitment_invoice_line_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  v_status text;
  v_invoice_commitment uuid;
  v_sov_commitment uuid;
  v_source_kind text;
  v_attested_by uuid;
  v_attested_org uuid;
  v_tenant uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.invoice_id IS DISTINCT FROM OLD.invoice_id THEN
    RAISE EXCEPTION
      'INVOICE_LINE_IMMUTABLE: an invoice line cannot be moved to another invoice';
  END IF;

  SELECT
    ci.status,
    ci.commitment_id,
    ci.source_kind,
    ci.vendor_attested_by,
    ci.vendor_attested_org_id,
    ci.tenant_id
    INTO
      v_status,
      v_invoice_commitment,
      v_source_kind,
      v_attested_by,
      v_attested_org,
      v_tenant
  FROM public.commitment_invoices ci
  WHERE ci.id = v_invoice
  FOR UPDATE;

  IF v_status IS NULL THEN
    -- ON DELETE CASCADE removes child SOV rows after the draft parent has
    -- entered deletion, so it is no longer visible to this row trigger. The
    -- parent delete guard has already proved that only an unpaid draft can
    -- reach this cascade. Direct inserts/updates still require a live parent.
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'INVOICE_LINE_IMMUTABLE: parent invoice does not exist';
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT csl.commitment_id
      INTO v_sov_commitment
    FROM public.commitment_sov_lines csl
    WHERE csl.id = NEW.sov_line_id;

    IF v_sov_commitment IS NULL
       OR v_sov_commitment <> v_invoice_commitment THEN
      RAISE EXCEPTION
        'COMMITMENT_MISMATCH: invoice line SOV must belong to the same commitment';
    END IF;
  END IF;

  IF v_status <> 'draft'
     OR EXISTS (
       SELECT 1
       FROM public.commitment_payments cp
       WHERE cp.commitment_invoice_id = v_invoice
     ) THEN
    RAISE EXCEPTION
      'INVOICE_LINE_IMMUTABLE: invoice lines are editable only while the invoice is draft';
  END IF;

  IF v_source_kind = 'vendor_portal_invoice'
     AND auth.uid() IS NOT NULL
     AND (
       auth.uid() IS DISTINCT FROM v_attested_by
       OR NOT EXISTS (
         SELECT 1
         FROM public.portal_memberships pm
         WHERE pm.user_id = auth.uid()
           AND pm.tenant_id = v_tenant
           AND pm.organization_id = v_attested_org
           AND pm.portal_kind = 'sub'
           AND pm.is_active = true
       )
     ) THEN
    RAISE EXCEPTION
      'VENDOR_ATTESTATION_REQUIRED: only the attesting subcontractor can edit this portal invoice';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commitment_invoice_line_immutable ON public.commitment_invoice_lines;
CREATE TRIGGER trg_commitment_invoice_line_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON public.commitment_invoice_lines
  FOR EACH ROW EXECUTE FUNCTION public.guard_commitment_invoice_line_mutation();

-- SOV amendments remain bounded by the revised subcontract and cannot rewrite
-- a line that is already part of submitted accounting evidence. The commitment
-- lock serializes SOV edits with approvals, CCO amendments, and cash posting.
CREATE OR REPLACE FUNCTION public.guard_commitment_sov_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commitment uuid := COALESCE(NEW.commitment_id, OLD.commitment_id);
  v_tenant uuid;
  v_status text;
  v_original numeric(14,2);
  v_changes numeric(14,2);
  v_revised numeric(14,2);
  v_projected_sov numeric(14,2);
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       NEW.id IS DISTINCT FROM OLD.id
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
       OR NEW.commitment_id IS DISTINCT FROM OLD.commitment_id
     ) THEN
    RAISE EXCEPTION
      'SOV_IMMUTABLE: a commitment SOV row cannot move across tenant or commitment';
  END IF;

  SELECT cm.tenant_id, cm.status, cm.original_value
    INTO v_tenant, v_status, v_original
  FROM public.commitments cm
  WHERE cm.id = v_commitment
  FOR UPDATE;

  IF v_tenant IS NULL
     OR (TG_OP <> 'DELETE' AND NEW.tenant_id <> v_tenant)
     OR (TG_OP = 'DELETE' AND OLD.tenant_id <> v_tenant) THEN
    RAISE EXCEPTION 'COMMITMENT_MISMATCH: SOV row is outside its commitment workspace';
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE')
     AND EXISTS (
       SELECT 1
       FROM public.commitment_invoice_lines cil
       JOIN public.commitment_invoices ci ON ci.id = cil.invoice_id
       WHERE cil.sov_line_id = OLD.id
         AND ci.status IN ('submitted', 'approved', 'paid')
     ) THEN
    RAISE EXCEPTION
      'SOV_IMMUTABLE: a line referenced by submitted, approved, or paid invoice evidence cannot change';
  END IF;

  IF v_status IN ('executed', 'closed')
     AND auth.uid() IS NOT NULL
     AND NOT public.is_commitment_finance_operator() THEN
    RAISE EXCEPTION
      'FINANCE_ROLE_REQUIRED: only finance may allocate an executed subcontract CCO to its SOV';
  END IF;

  SELECT COALESCE(SUM(co.amount), 0)
    INTO v_changes
  FROM public.change_orders co
  WHERE co.commitment_id = v_commitment
    AND co.co_type = 'CCO'
    AND co.status IN ('approved', 'executed');

  v_revised := COALESCE(v_original, 0) + v_changes;

  SELECT COALESCE(SUM(csl.scheduled_value), 0)
    INTO v_projected_sov
  FROM public.commitment_sov_lines csl
  WHERE csl.commitment_id = v_commitment
    AND (TG_OP = 'INSERT' OR csl.id <> OLD.id);

  IF TG_OP <> 'DELETE' THEN
    v_projected_sov := v_projected_sov + NEW.scheduled_value;
  END IF;

  IF v_projected_sov > v_revised THEN
    RAISE EXCEPTION
      'SOV_EXCEEDS_REVISED_COMMITMENT: projected SOV (%) exceeds revised subcontract (%)',
      v_projected_sov, v_revised;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commitment_sov_integrity ON public.commitment_sov_lines;
CREATE TRIGGER trg_commitment_sov_integrity
  BEFORE INSERT OR UPDATE OR DELETE ON public.commitment_sov_lines
  FOR EACH ROW EXECUTE FUNCTION public.guard_commitment_sov_mutation();

-- Once invoices, SOV allocations, or payments rely on a revised subcontract,
-- an approved/executed CCO cannot be removed or reduced below that live floor.
CREATE OR REPLACE FUNCTION public.guard_commitment_cco_posthoc_reduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commitment uuid;
  v_old_contribution numeric(14,2) := 0;
  v_new_contribution numeric(14,2) := 0;
  v_original numeric(14,2);
  v_current_changes numeric(14,2);
  v_projected_revised numeric(14,2);
  v_invoice_floor numeric(14,2);
  v_payment_floor numeric(14,2);
  v_sov_floor numeric(14,2);
  v_required_floor numeric(14,2);
BEGIN
  IF TG_OP <> 'INSERT'
     AND OLD.co_type = 'CCO'
     AND OLD.status IN ('approved', 'executed') THEN
    v_commitment := OLD.commitment_id;
    v_old_contribution := OLD.amount;
  END IF;

  IF TG_OP <> 'DELETE'
     AND NEW.co_type = 'CCO'
     AND NEW.status IN ('approved', 'executed') THEN
    IF v_commitment IS NOT NULL
       AND NEW.commitment_id IS DISTINCT FROM v_commitment THEN
      RAISE EXCEPTION
        'CCO_IMMUTABLE: an approved/executed CCO cannot move to another commitment';
    END IF;
    v_commitment := NEW.commitment_id;
    v_new_contribution := NEW.amount;
  END IF;

  IF v_commitment IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.is_commitment_finance_operator() THEN
    RAISE EXCEPTION
      'FINANCE_ROLE_REQUIRED: approved/executed commitment change orders require finance authority';
  END IF;

  SELECT cm.original_value
    INTO v_original
  FROM public.commitments cm
  WHERE cm.id = v_commitment
  FOR UPDATE;

  IF v_original IS NULL THEN
    RAISE EXCEPTION 'COMMITMENT_MISMATCH: CCO commitment does not exist';
  END IF;

  SELECT COALESCE(SUM(co.amount), 0)
    INTO v_current_changes
  FROM public.change_orders co
  WHERE co.commitment_id = v_commitment
    AND co.co_type = 'CCO'
    AND co.status IN ('approved', 'executed');

  v_projected_revised := COALESCE(v_original, 0)
    + v_current_changes - v_old_contribution + v_new_contribution;

  SELECT COALESCE(SUM(ci.approved_amount), 0)
    INTO v_invoice_floor
  FROM public.commitment_invoices ci
  WHERE ci.commitment_id = v_commitment
    AND ci.status IN ('approved', 'paid');

  SELECT COALESCE(SUM(cp.amount), 0)
    INTO v_payment_floor
  FROM public.commitment_payments cp
  WHERE cp.commitment_id = v_commitment;

  SELECT COALESCE(SUM(csl.scheduled_value), 0)
    INTO v_sov_floor
  FROM public.commitment_sov_lines csl
  WHERE csl.commitment_id = v_commitment;

  v_required_floor := GREATEST(v_invoice_floor, v_payment_floor, v_sov_floor);

  IF v_projected_revised < v_required_floor THEN
    RAISE EXCEPTION
      'CCO_POSTHOC_REDUCTION: revised subcontract (%) cannot fall below invoice/payment/SOV reliance floor (%)',
      v_projected_revised, v_required_floor;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_00_commitment_cco_posthoc_reduction ON public.change_orders;
CREATE TRIGGER trg_00_commitment_cco_posthoc_reduction
  BEFORE INSERT OR UPDATE OR DELETE ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_commitment_cco_posthoc_reduction();

-- ---------------------------------------------------------------------------
-- 2. Payment posting guards: approved invoice, same commitment, net invoice
--    ceiling, and revised-commitment ceiling.  Invoice + commitment locks make
--    SUM-based checks safe against concurrent payment inserts.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_commitment_payment_overpay()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_tenant uuid;
  v_invoice_commitment uuid;
  v_invoice_status text;
  v_invoice_payable numeric(14,2);
  v_commitment_tenant uuid;
  v_commitment_status text;
  v_commitment_project uuid;
  v_original numeric(14,2);
  v_approved_changes numeric(14,2);
  v_revised numeric(14,2);
  v_invoice_paid numeric(14,2);
  v_commitment_paid numeric(14,2);
  v_lien_coverage numeric(14,2);
BEGIN
  IF NOT public.is_commitment_finance_operator() THEN
    RAISE EXCEPTION
      'FINANCE_ROLE_REQUIRED: recording a subcontractor payment requires admin, owner, or manager authority';
  END IF;

  SELECT
    ci.tenant_id,
    ci.commitment_id,
    ci.status,
    GREATEST(COALESCE(ci.approved_amount, 0) - COALESCE(ci.retainage_held, 0), 0)
  INTO
    v_invoice_tenant,
    v_invoice_commitment,
    v_invoice_status,
    v_invoice_payable
  FROM public.commitment_invoices ci
  WHERE ci.id = NEW.commitment_invoice_id
  FOR UPDATE;

  SELECT c.tenant_id, c.status, c.original_value, c.project_id
    INTO v_commitment_tenant, v_commitment_status, v_original, v_commitment_project
  FROM public.commitments c
  WHERE c.id = v_invoice_commitment
  FOR UPDATE;

  IF v_invoice_tenant IS NULL
     OR v_invoice_tenant <> NEW.tenant_id
     OR v_invoice_commitment <> NEW.commitment_id THEN
    RAISE EXCEPTION
      'COMMITMENT_MISMATCH: payment commitment % does not match invoice % commitment',
      NEW.commitment_id, NEW.commitment_invoice_id;
  END IF;

  IF v_commitment_tenant <> NEW.tenant_id
     OR v_commitment_status <> 'executed' THEN
    RAISE EXCEPTION
      'COMMITMENT_NOT_EXECUTED: payment requires an executed same-tenant commitment';
  END IF;

  IF NOT public.commitment_invoice_has_valid_source(NEW.commitment_invoice_id) THEN
    RAISE EXCEPTION
      'INVOICE_SOURCE_REQUIRED: payment requires frozen structured SOV detail, a linked vendor invoice, or a signed vendor pay app';
  END IF;

  IF NEW.artifact_id IS NOT NULL THEN
    PERFORM 1
    FROM public.project_artifacts pa
    JOIN storage.objects so
      ON so.bucket_id = 'project-artifacts'
     AND so.name = pa.file_path
    WHERE pa.id = NEW.artifact_id
      AND pa.tenant_id = NEW.tenant_id
      AND pa.project_id = v_commitment_project
    FOR UPDATE OF pa, so;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'PAYMENT_ARTIFACT_INVALID: payment evidence must exist in this project''s artifact storage';
    END IF;
  END IF;

  IF v_invoice_status <> 'approved' THEN
    RAISE EXCEPTION
      'INVOICE_NOT_APPROVED: invoice % has status %',
      NEW.commitment_invoice_id, v_invoice_status;
  END IF;

  PERFORM 1
  FROM public.lien_releases lr
  WHERE lr.commitment_invoice_id = NEW.commitment_invoice_id
    AND lr.direction = 'inbound'
    AND lr.status = 'approved'
  FOR UPDATE;

  SELECT COALESCE(MAX(lr.amount), 0)
    INTO v_lien_coverage
  FROM public.lien_releases lr
  WHERE lr.commitment_invoice_id = NEW.commitment_invoice_id
    AND lr.direction = 'inbound'
    AND lr.status = 'approved';

  IF v_lien_coverage < v_invoice_payable THEN
    RAISE EXCEPTION
      'LIEN_REQUIRED: approved inbound waiver coverage (%) must cover invoice net payable (%)',
      v_lien_coverage, v_invoice_payable;
  END IF;

  SELECT COALESCE(SUM(cp.amount), 0)
    INTO v_invoice_paid
  FROM public.commitment_payments cp
  WHERE cp.commitment_invoice_id = NEW.commitment_invoice_id
    AND cp.id <> NEW.id;

  IF v_invoice_paid + NEW.amount > v_invoice_payable THEN
    RAISE EXCEPTION
      'OVERPAYMENT: payments (%) would exceed invoice net payable ceiling (%)',
      v_invoice_paid + NEW.amount, v_invoice_payable;
  END IF;

  SELECT COALESCE(SUM(co.amount), 0)
    INTO v_approved_changes
  FROM public.change_orders co
  WHERE co.commitment_id = NEW.commitment_id
    AND co.co_type = 'CCO'
    AND co.status IN ('approved', 'executed');

  v_revised := COALESCE(v_original, 0) + v_approved_changes;

  SELECT COALESCE(SUM(cp.amount), 0)
    INTO v_commitment_paid
  FROM public.commitment_payments cp
  WHERE cp.commitment_id = NEW.commitment_id
    AND cp.id <> NEW.id;

  IF v_commitment_paid + NEW.amount > v_revised THEN
    RAISE EXCEPTION
      'COMMITMENT_OVERPAYMENT: payments (%) would exceed revised commitment (%)',
      v_commitment_paid + NEW.amount, v_revised;
  END IF;

  RETURN NEW;
END;
$$;

-- The existing trigger already points at this replaced function.  Recreate it
-- explicitly so migration order or drift cannot leave an obsolete binding.
DROP TRIGGER IF EXISTS trg_commitment_payment_overpay ON public.commitment_payments;
DROP TRIGGER IF EXISTS trg_00_commitment_payment_integrity ON public.commitment_payments;
CREATE TRIGGER trg_00_commitment_payment_integrity
  BEFORE INSERT ON public.commitment_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_commitment_payment_overpay();

-- Cash evidence is append-only.  Corrections require the separately approved
-- historical reconciliation procedure; users never rewrite or delete the
-- original bank-linked row in place.
CREATE OR REPLACE FUNCTION public.prevent_commitment_payment_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'PAYMENT_IMMUTABLE: use the controlled finance reconciliation procedure instead of updating or deleting a payment';
END;
$$;

DROP TRIGGER IF EXISTS trg_01_commitment_payment_immutable ON public.commitment_payments;
CREATE TRIGGER trg_01_commitment_payment_immutable
  BEFORE UPDATE OR DELETE ON public.commitment_payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_commitment_payment_mutation();

-- An approved inbound release is part of the paid invoice's evidence chain.
-- It can be prepared/rejected before payment, but once any cash is linked to
-- its invoice it becomes immutable.  Approval itself is finance-authorized.
CREATE OR REPLACE FUNCTION public.guard_paid_invoice_lien_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT'
     AND OLD.commitment_invoice_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.commitment_payments cp
       WHERE cp.commitment_invoice_id = OLD.commitment_invoice_id
     ) THEN
    RAISE EXCEPTION
      'LIEN_EVIDENCE_IMMUTABLE: a release supporting a posted payment cannot be changed or deleted';
  END IF;

  IF TG_OP <> 'DELETE'
     AND NEW.direction = 'inbound'
     AND NEW.status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved')
     AND NOT public.is_commitment_finance_operator() THEN
    RAISE EXCEPTION
      'FINANCE_ROLE_REQUIRED: approving an inbound lien release requires admin, owner, or manager authority';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_paid_invoice_lien_evidence ON public.lien_releases;
CREATE TRIGGER trg_paid_invoice_lien_evidence
  BEFORE INSERT OR UPDATE OR DELETE ON public.lien_releases
  FOR EACH ROW EXECUTE FUNCTION public.guard_paid_invoice_lien_evidence();

-- Paid means the approved amount less retained funds has been disbursed.
CREATE OR REPLACE FUNCTION public.sync_commitment_invoice_paid_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv uuid := COALESCE(NEW.commitment_invoice_id, OLD.commitment_invoice_id);
  v_payable numeric(14,2);
  v_paid numeric(14,2);
  v_status text;
BEGIN
  SELECT
    GREATEST(COALESCE(approved_amount, 0) - COALESCE(retainage_held, 0), 0),
    status
  INTO v_payable, v_status
  FROM public.commitment_invoices
  WHERE id = v_inv;

  SELECT COALESCE(SUM(amount), 0)
    INTO v_paid
  FROM public.commitment_payments
  WHERE commitment_invoice_id = v_inv;

  IF v_payable > 0 AND v_paid >= v_payable THEN
    UPDATE public.commitment_invoices
    SET status = 'paid'
    WHERE id = v_inv AND status = 'approved';

    UPDATE public.vendor_payapp_submissions
    SET status = 'paid'
    WHERE commitment_invoice_id = v_inv
      AND status = 'approved'
      AND EXISTS (
        SELECT 1
        FROM public.commitment_invoices ci
        WHERE ci.id = v_inv
          AND ci.status = 'paid'
      );
  ELSIF v_status = 'paid' AND v_paid < v_payable THEN
    UPDATE public.commitment_invoices
    SET status = 'approved'
    WHERE id = v_inv;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_commitment_invoice_paid_status ON public.commitment_payments;
CREATE TRIGGER trg_commitment_invoice_paid_status
  AFTER INSERT OR UPDATE OR DELETE ON public.commitment_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_commitment_invoice_paid_status();

-- Keep the AP balance view on the same net-payable definition as the hard guard.
CREATE OR REPLACE VIEW public.v_commitment_invoice_balances
WITH (security_invoker = on)
AS
SELECT
  ci.id AS commitment_invoice_id,
  ci.tenant_id,
  ci.commitment_id,
  cm.project_id,
  ci.invoice_no,
  ci.status,
  COALESCE(ci.approved_amount, ci.submitted_amount, 0) AS billed_amount,
  COALESCE(ci.retainage_held, 0) AS retainage_held,
  COALESCE(p.paid_to_date, 0) AS paid_to_date,
  COALESCE(ci.approved_amount, ci.submitted_amount, 0)
    - COALESCE(ci.retainage_held, 0)
    - COALESCE(p.paid_to_date, 0) AS balance_due,
  COALESCE(p.payment_count, 0) AS payment_count,
  EXISTS (
    SELECT 1
    FROM public.lien_releases lr
    WHERE lr.commitment_invoice_id = ci.id
      AND lr.direction = 'inbound'
      AND lr.status = 'approved'
  ) AS lien_satisfied
FROM public.commitment_invoices ci
JOIN public.commitments cm ON cm.id = ci.commitment_id
LEFT JOIN (
  SELECT commitment_invoice_id, SUM(amount) AS paid_to_date, COUNT(*) AS payment_count
  FROM public.commitment_payments
  GROUP BY commitment_invoice_id
) p ON p.commitment_invoice_id = ci.id;

COMMENT ON VIEW public.v_commitment_invoice_balances IS
  'AP invoice balances; balance_due is approved/submitted gross less retainage held less payments.';

-- Preserve the ledger column contract while making each AP payment visibly trace
-- to its invoice and allowing the invoice artifact to supply the paid document.
CREATE OR REPLACE VIEW public.v_project_financial_ledger
WITH (security_invoker = on)
AS
SELECT
  ('prime_contract:' || pc.id) AS ledger_id,
  pc.tenant_id, pc.project_id,
  (SELECT CASE WHEN COUNT(DISTINCT sl.cost_code_id) = 1 THEN (array_agg(DISTINCT sl.cost_code_id))[1] END
   FROM public.prime_contract_sov_lines sl WHERE sl.prime_contract_id = pc.id) AS cost_code_id,
  'receivable'::text AS direction,
  'prime_contract'::text AS entry_type,
  pc.executed_date AS entry_date,
  o.name AS party_name,
  pc.contract_no AS reference,
  pc.title AS description,
  pc.original_value AS amount,
  pc.status,
  NULL::uuid AS artifact_id,
  pc.created_at
FROM public.prime_contracts pc
LEFT JOIN public.organizations o ON o.id = pc.owner_org_id

UNION ALL
SELECT
  ('change_order:' || co.id),
  co.tenant_id, co.project_id,
  (SELECT CASE WHEN COUNT(DISTINCT col.cost_code_id) = 1 THEN (array_agg(DISTINCT col.cost_code_id))[1] END
   FROM public.change_order_lines col WHERE col.change_order_id = co.id),
  CASE WHEN co.commitment_id IS NOT NULL THEN 'payable' ELSE 'receivable' END,
  'change_order',
  COALESCE(co.executed_date, co.created_at::date),
  NULL,
  COALESCE(co.co_type, 'CO') || '-' || COALESCE(co.co_no::text, ''),
  co.title,
  co.amount, co.status, NULL::uuid, co.created_at
FROM public.change_orders co
WHERE co.co_type IS NOT NULL

UNION ALL
SELECT
  ('pay_app:' || pa.id),
  pa.tenant_id, pc.project_id,
  (SELECT CASE WHEN COUNT(DISTINCT sl.cost_code_id) = 1 THEN (array_agg(DISTINCT sl.cost_code_id))[1] END
   FROM public.prime_contract_pay_app_lines pal
   JOIN public.prime_contract_sov_lines sl ON sl.id = pal.sov_line_id
   WHERE pal.pay_app_id = pa.id),
  'receivable', 'pay_app',
  COALESCE(pa.approved_date, pa.period_end),
  o.name,
  COALESCE(pa.invoice_no, 'Pay App #' || pa.pay_app_no),
  'Pay Application #' || pa.pay_app_no,
  COALESCE(pa.approved_amount, pa.submitted_amount, 0), pa.status, pa.artifact_id, pa.created_at
FROM public.prime_contract_pay_apps pa
JOIN public.prime_contracts pc ON pc.id = pa.prime_contract_id
LEFT JOIN public.organizations o ON o.id = pc.owner_org_id

UNION ALL
SELECT
  ('prime_payment:' || pp.id),
  pp.tenant_id, pc.project_id, NULL::uuid,
  'receivable', 'payment',
  pp.received_date, o.name,
  COALESCE(pp.reference, pp.method, 'Receipt'),
  'Payment received', pp.amount, 'received', pp.artifact_id, pp.created_at
FROM public.prime_contract_payments pp
JOIN public.prime_contracts pc ON pc.id = pp.prime_contract_id
LEFT JOIN public.organizations o ON o.id = pc.owner_org_id

UNION ALL
SELECT
  ('commitment:' || cm.id),
  cm.tenant_id, cm.project_id,
  (SELECT CASE WHEN COUNT(DISTINCT sl.cost_code_id) = 1 THEN (array_agg(DISTINCT sl.cost_code_id))[1] END
   FROM public.commitment_sov_lines sl WHERE sl.commitment_id = cm.id),
  'payable', 'commitment',
  cm.executed_date, o.name, cm.commitment_no, cm.title,
  cm.original_value, cm.status, NULL::uuid, cm.created_at
FROM public.commitments cm
LEFT JOIN public.organizations o ON o.id = cm.vendor_org_id

UNION ALL
SELECT
  ('commitment_invoice:' || ci.id),
  ci.tenant_id, cm.project_id,
  (SELECT CASE WHEN COUNT(DISTINCT sl.cost_code_id) = 1 THEN (array_agg(DISTINCT sl.cost_code_id))[1] END
   FROM public.commitment_invoice_lines cil
   JOIN public.commitment_sov_lines sl ON sl.id = cil.sov_line_id
   WHERE cil.invoice_id = ci.id),
  'payable', 'invoice',
  ci.period_end, o.name, ci.invoice_no, 'Vendor invoice ' || ci.invoice_no,
  COALESCE(ci.approved_amount, ci.submitted_amount, 0), ci.status,
  COALESCE(ci.finalized_artifact_id, ci.artifact_id), ci.created_at
FROM public.commitment_invoices ci
JOIN public.commitments cm ON cm.id = ci.commitment_id
LEFT JOIN public.organizations o ON o.id = cm.vendor_org_id

UNION ALL
SELECT
  ('commitment_payment:' || cp.id),
  cp.tenant_id, cm.project_id, NULL::uuid,
  'payable', 'payment',
  cp.paid_date, o.name,
  cp.reference,
  'Payment to vendor · Invoice ' || ci.invoice_no,
  cp.amount, 'paid', COALESCE(ci.finalized_artifact_id, cp.artifact_id, ci.artifact_id), cp.created_at
FROM public.commitment_payments cp
JOIN public.commitments cm ON cm.id = cp.commitment_id
JOIN public.commitment_invoices ci ON ci.id = cp.commitment_invoice_id
LEFT JOIN public.organizations o ON o.id = cm.vendor_org_id

UNION ALL
SELECT
  ('lien_release:' || lr.id),
  lr.tenant_id, lr.project_id, NULL::uuid,
  CASE WHEN lr.direction = 'inbound' THEN 'payable' ELSE 'receivable' END,
  'lien_release',
  COALESCE(lr.through_date, lr.created_at::date), NULL,
  lr.release_type, 'Lien release (' || lr.direction || ')',
  COALESCE(lr.amount, 0), lr.status, lr.artifact_id, lr.created_at
FROM public.lien_releases lr;

COMMENT ON VIEW public.v_project_financial_ledger IS
  'F0 unified AR/AP event ledger. AP payment descriptions identify their invoice and inherit its artifact when needed.';

-- ---------------------------------------------------------------------------
-- 3. Certified reconciliation control: an immutable expected-vs-live snapshot
--    plus a live view that turns false immediately if the ledger later drifts.
-- ---------------------------------------------------------------------------

CREATE TABLE public.commitment_payment_reconciliation_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  commitment_id uuid NOT NULL REFERENCES public.commitments(id) ON DELETE RESTRICT,
  certification_key text NOT NULL,
  as_of_date date NOT NULL,
  expected_payment_count integer NOT NULL CHECK (expected_payment_count >= 0),
  expected_invoice_count integer NOT NULL CHECK (expected_invoice_count >= 0),
  expected_total numeric(14,2) NOT NULL CHECK (expected_total >= 0),
  observed_payment_count integer NOT NULL CHECK (observed_payment_count >= 0),
  observed_invoice_count integer NOT NULL CHECK (observed_invoice_count >= 0),
  observed_total numeric(14,2) NOT NULL CHECK (observed_total >= 0),
  exception_invoice_id uuid REFERENCES public.commitment_invoices(id) ON DELETE RESTRICT,
  exception_payment_id uuid REFERENCES public.commitment_payments(id) ON DELETE RESTRICT,
  source_kind text NOT NULL CHECK (source_kind IN ('bank_reconciliation', 'historical_exception', 'manual_control')),
  certification_note text NOT NULL,
  certified_by uuid REFERENCES auth.users(id),
  certified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, certification_key),
  CHECK (
    expected_payment_count = observed_payment_count
    AND expected_invoice_count = observed_invoice_count
    AND expected_total = observed_total
  )
);

CREATE INDEX idx_commitment_payment_recon_control_commitment
  ON public.commitment_payment_reconciliation_controls(commitment_id);

ALTER TABLE public.commitment_payment_reconciliation_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY commitment_payment_recon_control_select
ON public.commitment_payment_reconciliation_controls
FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

REVOKE INSERT, UPDATE, DELETE ON public.commitment_payment_reconciliation_controls FROM authenticated;
GRANT SELECT ON public.commitment_payment_reconciliation_controls TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_reconciliation_control_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'RECONCILIATION_CONTROL_IMMUTABLE: certification rows cannot be changed or deleted';
END;
$$;

CREATE TRIGGER trg_reconciliation_control_immutable
  BEFORE UPDATE OR DELETE ON public.commitment_payment_reconciliation_controls
  FOR EACH ROW EXECUTE FUNCTION public.prevent_reconciliation_control_mutation();

CREATE VIEW public.v_commitment_payment_reconciliation_certified
WITH (security_invoker = on)
AS
SELECT
  rc.id AS reconciliation_control_id,
  rc.tenant_id,
  rc.project_id,
  rc.commitment_id,
  rc.certification_key,
  rc.as_of_date,
  rc.expected_payment_count,
  rc.expected_invoice_count,
  rc.expected_total,
  COALESCE(p.payment_count, 0)::integer AS live_payment_count,
  COALESCE(p.invoice_count, 0)::integer AS live_invoice_count,
  COALESCE(p.payment_total, 0)::numeric(14,2) AS live_total,
  (COALESCE(p.payment_total, 0) - rc.expected_total)::numeric(14,2) AS total_delta,
  (
    COALESCE(p.payment_count, 0) = rc.expected_payment_count
    AND COALESCE(p.invoice_count, 0) = rc.expected_invoice_count
    AND COALESCE(p.payment_total, 0) = rc.expected_total
  ) AS is_reconciled,
  rc.exception_invoice_id,
  rc.exception_payment_id,
  rc.source_kind,
  rc.certification_note,
  rc.certified_by,
  rc.certified_at
FROM public.commitment_payment_reconciliation_controls rc
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS payment_count,
    COUNT(DISTINCT cp.commitment_invoice_id) AS invoice_count,
    COALESCE(SUM(cp.amount), 0) AS payment_total
  FROM public.commitment_payments cp
  WHERE cp.commitment_id = rc.commitment_id
    AND cp.paid_date <= rc.as_of_date
) p ON TRUE
;

GRANT SELECT ON public.v_commitment_payment_reconciliation_certified TO authenticated;

-- Compatibility/control surface consumed by the vendor dashboard.  One latest
-- certification row is exposed per commitment, with the exact stable contract
-- expected by the application.
CREATE VIEW public.v_vendor_reconciliation_status
WITH (security_invoker = on)
AS
WITH latest AS (
  SELECT DISTINCT ON (v.commitment_id)
    v.*
  FROM public.v_commitment_payment_reconciliation_certified v
  ORDER BY v.commitment_id, v.as_of_date DESC, v.certified_at DESC
)
SELECT
  l.commitment_id,
  l.tenant_id,
  l.as_of_date,
  l.expected_total AS expected_paid_to_date,
  l.expected_payment_count,
  l.expected_invoice_count,
  l.live_total AS actual_paid_to_date,
  l.live_payment_count AS actual_payment_count,
  l.live_invoice_count AS actual_invoice_count,
  COALESCE(m.missing_reference_count, 0)::integer AS missing_reference_count,
  l.total_delta AS variance,
  (
    l.is_reconciled
    AND COALESCE(m.missing_reference_count, 0) = 0
  ) AS is_reconciled,
  l.certified_at,
  l.certification_note AS control_note
FROM latest l
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS missing_reference_count
  FROM public.commitment_payments cp
  WHERE cp.commitment_id = l.commitment_id
    AND cp.paid_date <= l.as_of_date
    AND NULLIF(BTRIM(cp.reference), '') IS NULL
) m ON TRUE;

GRANT SELECT ON public.v_vendor_reconciliation_status TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Historical posting RPC remains atomic, but is no longer a generic tenant
--    bypass. Only installed admin/owner/manager finance roles may execute it.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_paid_commitment_invoice(
  p_commitment_id uuid,
  p_invoice_no text,
  p_amount numeric,
  p_paid_date date,
  p_reference text DEFAULT NULL,
  p_vendor_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_user uuid := auth.uid();
  v_project uuid;
  v_invoice uuid;
  v_paid numeric(14,2);
BEGIN
  IF v_user IS NULL OR NOT public.is_commitment_finance_operator() THEN
    RAISE EXCEPTION
      'FINANCE_ROLE_REQUIRED: historical paid-invoice posting requires admin or finance authority';
  END IF;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'No workspace for current user';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;
  IF NULLIF(BTRIM(p_invoice_no), '') IS NULL THEN
    RAISE EXCEPTION 'Invoice number is required';
  END IF;
  IF NULLIF(BTRIM(p_reference), '') IS NULL THEN
    RAISE EXCEPTION 'Payment reference is required';
  END IF;

  SELECT c.project_id
    INTO v_project
  FROM public.commitments c
  WHERE c.id = p_commitment_id
    AND c.tenant_id = v_tenant
  FOR UPDATE;

  IF v_project IS NULL THEN
    RAISE EXCEPTION 'Commitment not found in your workspace';
  END IF;

  INSERT INTO public.commitment_invoices (
    tenant_id,
    commitment_id,
    invoice_no,
    period_end,
    status,
    submitted_amount,
    approved_amount,
    retainage_held,
    source_kind,
    historical_exception_reason,
    created_by
  ) VALUES (
    v_tenant,
    p_commitment_id,
    BTRIM(p_invoice_no),
    p_paid_date,
    'approved',
    p_amount,
    p_amount,
    0,
    'historical_exception',
    'Finance-authorized reconstruction of a payment made before invoice-first controls.',
    v_user
  )
  RETURNING id INTO v_invoice;

  INSERT INTO public.lien_releases (
    tenant_id,
    project_id,
    direction,
    release_type,
    status,
    commitment_invoice_id,
    amount,
    through_date,
    claimant_name,
    title,
    created_by
  ) VALUES (
    v_tenant,
    v_project,
    'inbound',
    'unconditional_progress',
    'approved',
    v_invoice,
    p_amount,
    p_paid_date,
    p_vendor_name,
    'Historical reconciliation acknowledgment',
    v_user
  );

  INSERT INTO public.commitment_payments (
    tenant_id,
    commitment_id,
    commitment_invoice_id,
    amount,
    paid_date,
    method,
    reference,
    notes,
    created_by
  ) VALUES (
    v_tenant,
    p_commitment_id,
    v_invoice,
    p_amount,
    p_paid_date,
    'other',
    BTRIM(p_reference),
    'Finance-authorized historical reconciliation',
    v_user
  );

  SELECT COALESCE(SUM(cp.amount), 0)
    INTO v_paid
  FROM public.commitment_payments cp
  JOIN public.commitments cm ON cm.id = cp.commitment_id
  WHERE cm.project_id = v_project;

  RETURN jsonb_build_object(
    'invoice_id', v_invoice,
    'project_id', v_project,
    'paid_to_subs', v_paid
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_paid_commitment_invoice(uuid, text, numeric, date, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_paid_commitment_invoice(uuid, text, numeric, date, text, text) FROM authenticated;

-- Persist the exact stamped PDF after the invoice reaches paid.  The original
-- vendor upload remains artifact_id; this separately linked artifact is the
-- immutable executed copy used by the ledger and reports.
CREATE OR REPLACE FUNCTION public.finalize_paid_commitment_invoice_artifact(
  p_invoice_id uuid,
  p_artifact_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tenant uuid := public.current_tenant_id();
  v_invoice_tenant uuid;
  v_project uuid;
  v_status text;
  v_existing uuid;
  v_artifact_tenant uuid;
  v_artifact_project uuid;
  v_artifact_type text;
  v_mime text;
  v_linked_entity_type text;
  v_linked_entity_id uuid;
  v_file_path text;
  v_storage_ok boolean;
BEGIN
  IF v_user IS NULL OR NOT public.is_commitment_finance_operator() THEN
    RAISE EXCEPTION
      'FINANCE_ROLE_REQUIRED: finalizing a paid invoice requires admin, owner, or manager authority';
  END IF;

  SELECT ci.tenant_id, cm.project_id, ci.status, ci.finalized_artifact_id
    INTO v_invoice_tenant, v_project, v_status, v_existing
  FROM public.commitment_invoices ci
  JOIN public.commitments cm ON cm.id = ci.commitment_id
  WHERE ci.id = p_invoice_id
  FOR UPDATE OF ci;

  IF v_invoice_tenant IS NULL
     OR (
       NOT public.is_super_admin()
       AND (v_tenant IS NULL OR v_invoice_tenant <> v_tenant)
     ) THEN
    RAISE EXCEPTION 'Invoice not found in your workspace';
  END IF;

  IF v_existing IS NOT NULL THEN
    IF v_existing = p_artifact_id THEN
      RETURN v_existing;
    END IF;
    RAISE EXCEPTION
      'FINALIZED_INVOICE_IMMUTABLE: invoice already has a finalized paid PDF';
  END IF;

  IF v_status <> 'paid' THEN
    RAISE EXCEPTION 'FINALIZED_INVOICE_INVALID: invoice must be paid first';
  END IF;

  SELECT
    pa.tenant_id,
    pa.project_id,
    pa.artifact_type::text,
    pa.mime_type,
    pa.linked_entity_type,
    pa.linked_entity_id,
    pa.file_path
    INTO
      v_artifact_tenant,
      v_artifact_project,
      v_artifact_type,
      v_mime,
      v_linked_entity_type,
      v_linked_entity_id,
      v_file_path
  FROM public.project_artifacts pa
  WHERE pa.id = p_artifact_id
  FOR UPDATE;

  PERFORM 1
  FROM storage.objects so
  WHERE so.bucket_id = 'project-artifacts'
    AND so.name = v_file_path
  FOR UPDATE;
  v_storage_ok := FOUND;

  IF v_artifact_tenant IS NULL
     OR v_artifact_tenant <> v_invoice_tenant
     OR v_artifact_project <> v_project
     OR v_artifact_type <> 'invoice'
     OR v_mime <> 'application/pdf'
     OR v_storage_ok IS DISTINCT FROM true
     OR NOT (
       (v_linked_entity_type IS NULL AND v_linked_entity_id IS NULL)
       OR (
         v_linked_entity_type = 'commitment_invoice'
         AND v_linked_entity_id = p_invoice_id
       )
     ) THEN
    RAISE EXCEPTION
      'FINALIZED_INVOICE_INVALID: artifact must be an unclaimed or already-linked same-project invoice PDF';
  END IF;

  UPDATE public.project_artifacts
  SET
    linked_entity_type = 'commitment_invoice',
    linked_entity_id = p_invoice_id
  WHERE id = p_artifact_id;

  UPDATE public.commitment_invoices
  SET
    finalized_artifact_id = p_artifact_id,
    finalized_at = now(),
    finalized_by = v_user
  WHERE id = p_invoice_id;

  RETURN p_artifact_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_paid_commitment_invoice_artifact(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_paid_commitment_invoice_artifact(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_finalized_invoice_artifact_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.commitment_invoices ci
    WHERE ci.finalized_artifact_id = OLD.id
       OR (
         ci.artifact_id = OLD.id
         AND ci.source_kind IN ('vendor_invoice', 'portal_submission')
       )
       OR EXISTS (
         SELECT 1
         FROM public.commitment_payments cp
         WHERE cp.artifact_id = OLD.id
       )
  ) THEN
    RAISE EXCEPTION
      'FINALIZED_INVOICE_IMMUTABLE: submitted/paid invoice evidence metadata cannot be changed or deleted';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finalized_invoice_artifact_immutable ON public.project_artifacts;
CREATE TRIGGER trg_finalized_invoice_artifact_immutable
  BEFORE UPDATE OR DELETE ON public.project_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_finalized_invoice_artifact_mutation();

-- Protect the bytes as well as the project_artifacts metadata. Existing
-- permissive Storage RLS policies cannot express a deny rule, so a trigger is
-- required to prevent direct Storage API overwrite/delete at an evidence path.
CREATE OR REPLACE FUNCTION public.prevent_paid_invoice_storage_object_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.bucket_id = 'project-artifacts'
     AND EXISTS (
       SELECT 1
       FROM public.project_artifacts pa
       WHERE pa.file_path = OLD.name
         AND (
           EXISTS (
             SELECT 1
             FROM public.commitment_invoices ci
             WHERE ci.finalized_artifact_id = pa.id
                OR (
                  ci.artifact_id = pa.id
                  AND ci.source_kind IN ('vendor_invoice', 'portal_submission')
                )
           )
           OR EXISTS (
             SELECT 1
             FROM public.commitment_payments cp
             WHERE cp.artifact_id = pa.id
           )
         )
     ) THEN
    RAISE EXCEPTION
      'FINALIZED_INVOICE_IMMUTABLE: submitted/paid invoice evidence bytes cannot be replaced or deleted';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_paid_invoice_storage_object_immutable ON storage.objects;
CREATE TRIGGER trg_paid_invoice_storage_object_immutable
  BEFORE UPDATE OR DELETE ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION public.prevent_paid_invoice_storage_object_mutation();

-- ---------------------------------------------------------------------------
-- 5. D'SHIN certified true-up.
--
-- Agreed 2026-06-11 baseline:                         $460,779.39
-- Subsequent reconciled payments through 2026-07-27:  $79,700.00
-- Certified paid-to-date:                            $540,479.39
--
-- The prior import had 35 payments / $532,186.27 and was short $8,293.12.
-- This reconstructs that historical exception as invoice + approved lien
-- acknowledgment + payment, all tied to the base commitment.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_commitment uuid;
  v_tenant uuid;
  v_project uuid;
  v_project_name text;
  v_commitment_no text;
  v_identity text;
  v_vendor_name text;
  v_payment_count bigint;
  v_invoice_count bigint;
  v_payment_total numeric(14,2);
  v_invoice uuid;
  v_payment uuid;
  v_match_count bigint;
  v_manifest_mismatch bigint;
  v_control uuid;
  v_is_reconciled boolean;
  v_invoice_no constant text := 'DSHIN-BASELINE-ADJ-2026-06-11';
  v_reference constant text := 'JOINT-RECON-2026-06-11';
BEGIN
  v_commitment := '7bce7dce-152d-49bf-ba13-899b9b4f04ad'::uuid;

  SELECT
    c.tenant_id,
    c.project_id,
    p.name,
    c.commitment_no,
    REGEXP_REPLACE(
      LOWER(CONCAT_WS(' ', o.name, c.title)),
      '[^a-z0-9]+',
      '',
      'g'
    ),
    o.name
  INTO
    v_tenant,
    v_project,
    v_project_name,
    v_commitment_no,
    v_identity,
    v_vendor_name
  FROM public.commitments c
  JOIN public.projects p ON p.id = c.project_id
  LEFT JOIN public.organizations o ON o.id = c.vendor_org_id
  WHERE c.id = v_commitment
  FOR UPDATE OF c;

  IF v_tenant IS NULL THEN
    RAISE NOTICE
      'D''SHIN reconciliation skipped: the production-specific commitment is absent in this database';
    RETURN;
  END IF;

  IF v_project_name <> 'Sewer Ext Project'
     OR v_commitment_no <> 'SC-001'
     OR v_identity NOT LIKE '%dshin%' THEN
    RAISE EXCEPTION
      'DSHIN_RECONCILIATION_IDENTITY_MISMATCH: id resolved to project %, commitment %, identity %',
      v_project_name, v_commitment_no, v_identity;
  END IF;

  -- Certify the exact versioned Wells Fargo reconstruction, not merely a row
  -- count and aggregate. Both directions of EXCEPT ALL catch a missing, extra,
  -- duplicated, re-dated, reclassified, or invoice-misassigned bank row.
  WITH expected(reference, paid_date, amount, method, invoice_no) AS (
    VALUES
      ('WT 250709-020416 / SRF 0W00005865399287'::text, DATE '2025-07-09', 25000.00::numeric, 'wire'::text, 'DSHIN-2025-07'::text),
      ('WT 250710-186124 / SRF 0W00005871079347', DATE '2025-07-10', 13115.29, 'wire', 'DSHIN-2025-07'),
      ('WT 250918-180957 / SRF 0W00006106779051', DATE '2025-09-18', 25000.00, 'wire', 'DSHIN-2025-09'),
      ('WT 250919-083481 / SRF 0W00006109384807', DATE '2025-09-19', 11641.39, 'wire', 'DSHIN-2025-09'),
      ('WT 251003-161443 / SRF 0W00006160047678', DATE '2025-10-03', 25000.00, 'wire', 'DSHIN-2025-10'),
      ('WT 251007-162665 / SRF 0066135280283742', DATE '2025-10-07', 25000.00, 'wire', 'DSHIN-2025-10'),
      ('WT 251106-162482 / SRF 0W00006278360086', DATE '2025-11-06', 25000.00, 'wire', 'DSHIN-2025-11'),
      ('WT 251107-085387 / SRF 0W00006281339885', DATE '2025-11-07', 17229.59, 'wire', 'DSHIN-2025-11'),
      ('WT 251210-126882 / SRF 0W00006395851829', DATE '2025-12-10', 25000.00, 'wire', 'DSHIN-2025-12'),
      ('WT 251211-186971 / SRF 0W00006400015233', DATE '2025-12-11', 25000.00, 'wire', 'DSHIN-2025-12'),
      ('WT 251219-109279 / SRF 0W00006428153848', DATE '2025-12-19', 18500.00, 'wire', 'DSHIN-2025-12'),
      ('WFCT0ZNHBHMB', DATE '2026-01-02', 5000.00, 'zelle', 'DSHIN-2026-01'),
      ('WFCT0ZNLGRWY', DATE '2026-01-05', 2000.00, 'zelle', 'DSHIN-2026-01'),
      ('WT 260123-092432 / SRF 0W00006544950953', DATE '2026-01-23', 25000.00, 'wire', 'DSHIN-2026-01'),
      ('WT 260126-029415 / SRF 0W00006549152216', DATE '2026-01-26', 25000.00, 'wire', 'DSHIN-2026-01'),
      ('WFCT0ZRLZT6N', DATE '2026-02-02', 10000.00, 'zelle', 'DSHIN-2026-02'),
      ('WT 260303-146664 / SRF 0W00006686532457', DATE '2026-03-03', 25000.00, 'wire', 'DSHIN-2026-03'),
      ('WFCT0ZVTHM42', DATE '2026-03-03', 5000.00, 'zelle', 'DSHIN-2026-03'),
      ('WFCT0ZZBYYFZ', DATE '2026-04-03', 5000.00, 'zelle', 'DSHIN-2026-04'),
      ('WFCT0ZZRW2HF', DATE '2026-04-07', 14700.00, 'zelle', 'DSHIN-2026-04'),
      ('WT 260408-112196 / SRF 0W00006821203042', DATE '2026-04-08', 5300.00, 'wire', 'DSHIN-2026-04'),
      ('WFCT123HT3VX', DATE '2026-04-23', 15000.00, 'zelle', 'DSHIN-2026-04'),
      ('WFCT123MHVGY', DATE '2026-04-24', 10000.00, 'zelle', 'DSHIN-2026-04'),
      ('WT 260508-162583 / SRF 0W00006938960641', DATE '2026-05-08', 25000.00, 'wire', 'DSHIN-2026-05'),
      ('WFCT125C85SZ', DATE '2026-05-08', 14385.00, 'zelle', 'DSHIN-2026-05'),
      ('WFCT125PNNM5', DATE '2026-05-11', 5615.00, 'zelle', 'DSHIN-2026-05'),
      ('WT 260526-048503 / SRF 0W00007003570806', DATE '2026-05-26', 25000.00, 'wire', 'DSHIN-2026-05'),
      ('WFCT12BGPKSX', DATE '2026-06-22', 11000.00, 'zelle', 'DSHIN-2026-06'),
      ('WFCT12B92WK5', DATE '2026-06-22', 9000.00, 'zelle', 'DSHIN-2026-06'),
      ('WFCT12B929T8', DATE '2026-06-22', 5000.00, 'zelle', 'DSHIN-2026-06'),
      ('WFCT12BLCBBP', DATE '2026-06-23', 5000.00, 'zelle', 'DSHIN-2026-06'),
      ('WFCT12CDNDY5', DATE '2026-06-30', 14700.00, 'zelle', 'DSHIN-2026-06'),
      ('WFCT12CQ7BHJ', DATE '2026-07-02', 10000.00, 'zelle', 'DSHIN-2026-07'),
      ('WT 260703-020083 / SRF 0W00007152783323', DATE '2026-07-03', 15000.00, 'wire', 'DSHIN-2026-07'),
      ('WFCT22G94ZS8', DATE '2026-07-27', 10000.00, 'zelle', 'DSHIN-2026-07')
  ), actual AS (
    SELECT cp.reference, cp.paid_date, cp.amount, cp.method, ci.invoice_no
    FROM public.commitment_payments cp
    JOIN public.commitment_invoices ci ON ci.id = cp.commitment_invoice_id
    WHERE cp.commitment_id = v_commitment
      AND cp.reference <> v_reference
  )
  SELECT COUNT(*)
    INTO v_manifest_mismatch
  FROM (
    (SELECT * FROM expected EXCEPT ALL SELECT * FROM actual)
    UNION ALL
    (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)
  ) diff;

  IF v_manifest_mismatch <> 0 THEN
    RAISE EXCEPTION
      'DSHIN_RECONCILIATION_MANIFEST_MISMATCH: % missing, extra, duplicated, or misassigned bank rows',
      v_manifest_mismatch;
  END IF;

  -- Certify the invoice side of the ledger independently: exact monthly
  -- headers, paid totals, and a full-value approved inbound waiver for every
  -- reconstructed bank invoice. Aggregate-only checks would miss a swapped
  -- period, understated invoice, or payment attached to the wrong pay app.
  WITH expected(invoice_no, period_end, amount) AS (
    VALUES
      ('DSHIN-2025-07'::text, DATE '2025-07-31', 38115.29::numeric),
      ('DSHIN-2025-09', DATE '2025-09-30', 36641.39),
      ('DSHIN-2025-10', DATE '2025-10-31', 50000.00),
      ('DSHIN-2025-11', DATE '2025-11-30', 42229.59),
      ('DSHIN-2025-12', DATE '2025-12-31', 68500.00),
      ('DSHIN-2026-01', DATE '2026-01-31', 57000.00),
      ('DSHIN-2026-02', DATE '2026-02-28', 10000.00),
      ('DSHIN-2026-03', DATE '2026-03-31', 30000.00),
      ('DSHIN-2026-04', DATE '2026-04-30', 50000.00),
      ('DSHIN-2026-05', DATE '2026-05-31', 70000.00),
      ('DSHIN-2026-06', DATE '2026-06-30', 44700.00),
      ('DSHIN-2026-07', DATE '2026-07-31', 35000.00)
  ), actual AS (
    SELECT
      ci.invoice_no,
      ci.period_end,
      ci.submitted_amount,
      ci.approved_amount,
      COALESCE(ci.retainage_held, 0) AS retainage_held,
      ci.status,
      COALESCE(SUM(cp.amount), 0) AS paid_total
    FROM public.commitment_invoices ci
    LEFT JOIN public.commitment_payments cp
      ON cp.commitment_invoice_id = ci.id
    WHERE ci.commitment_id = v_commitment
      AND ci.invoice_no <> v_invoice_no
    GROUP BY
      ci.id,
      ci.invoice_no,
      ci.period_end,
      ci.submitted_amount,
      ci.approved_amount,
      ci.retainage_held,
      ci.status
  ), expected_shape AS (
    SELECT
      e.invoice_no,
      e.period_end,
      e.amount AS submitted_amount,
      e.amount AS approved_amount,
      0::numeric AS retainage_held,
      'paid'::text AS status,
      e.amount AS paid_total
    FROM expected e
  )
  SELECT COUNT(*)
    INTO v_manifest_mismatch
  FROM (
    (SELECT * FROM expected_shape EXCEPT ALL SELECT * FROM actual)
    UNION ALL
    (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected_shape)
  ) diff;

  IF v_manifest_mismatch <> 0 THEN
    RAISE EXCEPTION
      'DSHIN_RECONCILIATION_INVOICE_MANIFEST_MISMATCH: % monthly invoice header/payment facts differ from the certified manifest',
      v_manifest_mismatch;
  END IF;

  IF EXISTS (
    WITH expected(invoice_no, amount) AS (
      VALUES
        ('DSHIN-2025-07'::text, 38115.29::numeric),
        ('DSHIN-2025-09', 36641.39),
        ('DSHIN-2025-10', 50000.00),
        ('DSHIN-2025-11', 42229.59),
        ('DSHIN-2025-12', 68500.00),
        ('DSHIN-2026-01', 57000.00),
        ('DSHIN-2026-02', 10000.00),
        ('DSHIN-2026-03', 30000.00),
        ('DSHIN-2026-04', 50000.00),
        ('DSHIN-2026-05', 70000.00),
        ('DSHIN-2026-06', 44700.00),
        ('DSHIN-2026-07', 35000.00)
    )
    SELECT 1
    FROM expected e
    JOIN public.commitment_invoices ci
      ON ci.commitment_id = v_commitment
     AND ci.invoice_no = e.invoice_no
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.lien_releases lr
      WHERE lr.commitment_invoice_id = ci.id
        AND lr.direction = 'inbound'
        AND lr.status = 'approved'
        AND lr.amount >= e.amount
    )
  ) THEN
    RAISE EXCEPTION
      'DSHIN_RECONCILIATION_LIEN_MANIFEST_MISMATCH: every bank invoice requires full-value approved inbound lien evidence';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.commitment_payments cp
    JOIN public.commitment_invoices ci ON ci.id = cp.commitment_invoice_id
    WHERE cp.commitment_id = v_commitment
      AND cp.reference = 'WT 260703-020083 / SRF 0W00007152783323'
      AND cp.paid_date = DATE '2026-07-03'
      AND cp.amount = 15000.00
      AND cp.method = 'wire'
      AND ci.invoice_no = 'DSHIN-2026-07'
  ) THEN
    RAISE EXCEPTION 'DSHIN_RECONCILIATION_JULY3_WIRE_MISSING_OR_MISASSIGNED';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(cp.amount), 0)
    INTO v_payment_count, v_payment_total
  FROM public.commitment_payments cp
  WHERE cp.commitment_id = v_commitment;

  SELECT COUNT(*)
    INTO v_invoice_count
  FROM public.commitment_invoices ci
  WHERE ci.commitment_id = v_commitment;

  IF v_payment_count = 35
     AND v_payment_total = 532186.27
     AND v_invoice_count = 12 THEN
    IF EXISTS (
      SELECT 1
      FROM public.commitment_payments cp
      WHERE cp.tenant_id = v_tenant
        AND LOWER(BTRIM(cp.reference)) = LOWER(v_reference)
    ) OR EXISTS (
      SELECT 1
      FROM public.commitment_invoices ci
      WHERE ci.commitment_id = v_commitment
        AND ci.invoice_no = v_invoice_no
    ) THEN
      RAISE EXCEPTION
        'DSHIN_RECONCILIATION_PARTIAL: canonical correction record exists in the documented pre-state';
    END IF;

    INSERT INTO public.commitment_invoices (
      tenant_id,
      commitment_id,
      invoice_no,
      period_end,
      status,
      submitted_amount,
      approved_amount,
      retainage_held,
      source_kind,
      historical_exception_reason
    ) VALUES (
      v_tenant,
      v_commitment,
      v_invoice_no,
      DATE '2026-06-11',
      'approved',
      8293.12,
      8293.12,
      0,
      'historical_exception',
      'Jointly agreed D''SHIN paid-to-date baseline adjustment; reconciliation control, not a Wells Fargo transaction.'
    )
    RETURNING id INTO v_invoice;

    INSERT INTO public.lien_releases (
      tenant_id,
      project_id,
      direction,
      release_type,
      status,
      commitment_invoice_id,
      amount,
      through_date,
      claimant_name,
      title
    ) VALUES (
      v_tenant,
      v_project,
      'inbound',
      'unconditional_progress',
      'approved',
      v_invoice,
      8293.12,
      DATE '2026-06-11',
      v_vendor_name,
      'Certified historical exception acknowledgment — D''SHIN true-up'
    );

    INSERT INTO public.commitment_payments (
      tenant_id,
      commitment_id,
      commitment_invoice_id,
      amount,
      paid_date,
      method,
      reference,
      notes
    ) VALUES (
      v_tenant,
      v_commitment,
      v_invoice,
      8293.12,
      DATE '2026-06-11',
      'other',
      v_reference,
      'Jointly agreed paid-to-date reconciliation control reference; not a Wells Fargo transaction.'
    )
    RETURNING id INTO v_payment;

  ELSIF v_payment_count = 36
        AND v_payment_total = 540479.39
        AND v_invoice_count = 13 THEN
    -- Already at target: certify only an exact canonical true-up.  Payment and
    -- payment-linked invoice evidence is immutable, so a near-match fails
    -- closed instead of being silently rewritten.
    SELECT COUNT(*), MIN(cp.id::text)::uuid, MIN(ci.id::text)::uuid
      INTO v_match_count, v_payment, v_invoice
    FROM public.commitment_payments cp
    JOIN public.commitment_invoices ci ON ci.id = cp.commitment_invoice_id
    WHERE cp.commitment_id = v_commitment
      AND cp.amount = 8293.12
      AND cp.paid_date = DATE '2026-06-11'
      AND cp.method = 'other'
      AND cp.reference = v_reference
      AND cp.notes = 'Jointly agreed paid-to-date reconciliation control reference; not a Wells Fargo transaction.'
      AND ci.commitment_id = v_commitment
      AND ci.invoice_no = v_invoice_no
      AND ci.status = 'paid'
      AND ci.source_kind = 'historical_exception'
      AND ci.approved_amount = 8293.12
      AND COALESCE(ci.retainage_held, 0) = 0
      AND NULLIF(BTRIM(ci.historical_exception_reason), '') IS NOT NULL;

    IF v_match_count <> 1 THEN
      RAISE EXCEPTION
        'DSHIN_RECONCILIATION_TARGET_UNPROVEN: target totals exist but exact canonical $8,293.12 chain count is %',
        v_match_count;
    END IF;

  ELSE
    RAISE EXCEPTION
      'DSHIN_RECONCILIATION_UNEXPECTED_STATE: found payments % / total % / invoices %; expected pre 35/$532186.27/12 or target 36/$540479.39/13',
      v_payment_count, v_payment_total, v_invoice_count;
  END IF;

  UPDATE public.commitment_invoices ci
  SET source_kind = 'historical_bank_reconstruction'
  WHERE ci.commitment_id = v_commitment
    AND ci.id <> v_invoice
    AND ci.source_kind = 'manual'
    AND ci.status = 'paid'
    AND EXISTS (
      SELECT 1
      FROM public.commitment_payments cp
      WHERE cp.commitment_invoice_id = ci.id
    );

  SELECT COUNT(*), COALESCE(SUM(cp.amount), 0)
    INTO v_payment_count, v_payment_total
  FROM public.commitment_payments cp
  WHERE cp.commitment_id = v_commitment;

  SELECT COUNT(*)
    INTO v_invoice_count
  FROM public.commitment_invoices ci
  WHERE ci.commitment_id = v_commitment;

  IF v_payment_count <> 36
     OR v_payment_total <> 540479.39
     OR v_invoice_count <> 13 THEN
    RAISE EXCEPTION
      'DSHIN_RECONCILIATION_POSTCONDITION: got payments % / total % / invoices %',
      v_payment_count, v_payment_total, v_invoice_count;
  END IF;

  SELECT COUNT(*)
    INTO v_match_count
  FROM public.commitment_invoices ci
  WHERE ci.commitment_id = v_commitment
    AND ci.source_kind = 'historical_bank_reconstruction'
    AND ci.status = 'paid'
    AND EXISTS (
      SELECT 1
      FROM public.commitment_payments cp
      WHERE cp.commitment_invoice_id = ci.id
    );

  IF v_match_count <> 12 THEN
    RAISE EXCEPTION
      'DSHIN_RECONCILIATION_POSTCONDITION: expected 12 bank-reconstruction invoices, found %',
      v_match_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.commitment_payments cp
    JOIN public.commitment_invoices ci ON ci.id = cp.commitment_invoice_id
    WHERE cp.commitment_id = v_commitment
      AND (
        ci.commitment_id <> cp.commitment_id
        OR ci.tenant_id <> cp.tenant_id
        OR cp.tenant_id <> v_tenant
      )
  ) THEN
    RAISE EXCEPTION
      'DSHIN_RECONCILIATION_POSTCONDITION: a payment is not connected to an invoice on the D''SHIN commitment';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.commitment_invoices ci
    JOIN public.commitment_payments cp ON cp.commitment_invoice_id = ci.id
    JOIN public.lien_releases lr ON lr.commitment_invoice_id = ci.id
    WHERE ci.id = v_invoice
      AND ci.commitment_id = v_commitment
      AND ci.invoice_no = v_invoice_no
      AND ci.status = 'paid'
      AND ci.source_kind = 'historical_exception'
      AND ci.approved_amount = 8293.12
      AND COALESCE(ci.retainage_held, 0) = 0
      AND ci.paid_at IS NOT NULL
      AND cp.id = v_payment
      AND cp.amount = 8293.12
      AND cp.reference = v_reference
      AND lr.direction = 'inbound'
      AND lr.status = 'approved'
  ) THEN
    RAISE EXCEPTION
      'DSHIN_RECONCILIATION_POSTCONDITION: exception invoice/lien/payment chain is incomplete';
  END IF;

  INSERT INTO public.commitment_payment_reconciliation_controls (
    tenant_id,
    project_id,
    commitment_id,
    certification_key,
    as_of_date,
    expected_payment_count,
    expected_invoice_count,
    expected_total,
    observed_payment_count,
    observed_invoice_count,
    observed_total,
    exception_invoice_id,
    exception_payment_id,
    source_kind,
    certification_note
  ) VALUES (
    v_tenant,
    v_project,
    v_commitment,
    'DSHIN-SEWER-EXT-THROUGH-2026-07-27-V1',
    DATE '2026-07-27',
    36,
    13,
    540479.39,
    36,
    13,
    540479.39,
    v_invoice,
    v_payment,
    'historical_exception',
    'Certified baseline $460,779.39 at 2026-06-11 plus $79,700.00 subsequent payments; total $540,479.39.'
  )
  ON CONFLICT (tenant_id, certification_key) DO NOTHING
  RETURNING id INTO v_control;

  IF v_control IS NULL THEN
    SELECT rc.id
      INTO v_control
    FROM public.commitment_payment_reconciliation_controls rc
    WHERE rc.tenant_id = v_tenant
      AND rc.certification_key = 'DSHIN-SEWER-EXT-THROUGH-2026-07-27-V1'
      AND rc.commitment_id = v_commitment
      AND rc.expected_payment_count = 36
      AND rc.expected_invoice_count = 13
      AND rc.expected_total = 540479.39
      AND rc.exception_invoice_id = v_invoice
      AND rc.exception_payment_id = v_payment;

    IF v_control IS NULL THEN
      RAISE EXCEPTION
        'DSHIN_RECONCILIATION_CONTROL_CONFLICT: existing certification does not match the reconciled chain';
    END IF;
  END IF;

  SELECT v.is_reconciled
    INTO v_is_reconciled
  FROM public.v_commitment_payment_reconciliation_certified v
  WHERE v.reconciliation_control_id = v_control;

  IF v_is_reconciled IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION
      'DSHIN_RECONCILIATION_POSTCONDITION: certified live control is not reconciled';
  END IF;
END;
$$;
