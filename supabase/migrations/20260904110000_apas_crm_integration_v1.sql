-- Proj OS -> APAS CRM integration contract v1.
--
-- Proj OS retains project-private intake, approval, retry, link and audit state.
-- APAS CRM remains the only master-contact system. Authenticated browser users
-- can read permitted project state; all mutations pass through the server-side
-- orchestration functions and the signed event receiver.

BEGIN;

ALTER TABLE public.workspace_modules
  ADD COLUMN IF NOT EXISTS apas_crm_integration_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_apas_crm_integration boolean NOT NULL DEFAULT true;

-- The APAS operating workspace commissioned this integration. Other tenants
-- remain opt-in through Modules & Packages.
UPDATE public.workspace_modules wm
SET apas_crm_integration_enabled = true,
    platform_apas_crm_integration = true
WHERE EXISTS (
  SELECT 1
  FROM public.workspaces w
  WHERE w.id = wm.workspace_id
    AND (lower(w.name) LIKE '%apas%' OR lower(w.name) LIKE '%project controls%')
);

CREATE TABLE public.crm_integration_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submitter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  source_contract_version text NOT NULL DEFAULT 'crm-integration.v1'
    CHECK (source_contract_version = 'crm-integration.v1'),
  status text NOT NULL DEFAULT 'uploading_securely' CHECK (status IN (
    'uploading_securely', 'reading_card', 'review_uncertain_fields',
    'possible_matches_found', 'waiting_proj_os_approval',
    'approved_for_submission', 'sent_to_apas_crm', 'waiting_crm_review',
    'linked_to_master_contact', 'retry_queued', 'rejected',
    'returned_for_correction'
  )),
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 16 AND 200),
  source_envelope jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_signature text,
  source_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  project_private_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  upload_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_proposal jsonb,
  proposal_hash text,
  external_intake_id text,
  canonical_apas_contact_id text,
  current_remote_status text,
  last_processed_apas_event_id text,
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  retryable boolean NOT NULL DEFAULT false,
  next_retry_at timestamptz,
  safe_failure_code text,
  safe_failure_reason text CHECK (safe_failure_reason IS NULL OR char_length(safe_failure_reason) <= 500),
  project_directory_entry_id uuid,
  submitted_at timestamptz,
  approved_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (correlation_id)
);

CREATE UNIQUE INDEX crm_integration_intakes_external_id_unique
  ON public.crm_integration_intakes(external_intake_id)
  WHERE external_intake_id IS NOT NULL;
CREATE INDEX crm_integration_intakes_project_created_idx
  ON public.crm_integration_intakes(project_id, created_at DESC);
CREATE INDEX crm_integration_intakes_retry_idx
  ON public.crm_integration_intakes(next_retry_at)
  WHERE retryable AND status = 'retry_queued';

CREATE TABLE public.crm_integration_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  intake_id uuid NOT NULL REFERENCES public.crm_integration_intakes(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL DEFAULT 'submit_contact_proposal'
    CHECK (action = 'submit_contact_proposal'),
  token_hash text NOT NULL UNIQUE,
  proposal_hash text NOT NULL,
  approved_payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'consumed', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX crm_integration_one_pending_approval
  ON public.crm_integration_approvals(intake_id, actor_user_id)
  WHERE status = 'pending';

CREATE TABLE public.crm_integration_events (
  event_id text PRIMARY KEY,
  contract_version text NOT NULL CHECK (contract_version = 'crm-integration.v1'),
  event_type text NOT NULL CHECK (event_type IN (
    'contact_intake.review_required', 'contact_intake.resolved',
    'contact.created', 'contact.updated', 'contact.canonicalized',
    'contact.merged'
  )),
  intake_id uuid REFERENCES public.crm_integration_intakes(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  external_intake_id text NOT NULL,
  correlation_id uuid NOT NULL,
  payload_digest text NOT NULL,
  event_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_status text NOT NULL DEFAULT 'received'
    CHECK (processed_status IN ('received', 'applied', 'replayed', 'invalid_target', 'rejected')),
  safe_failure_reason text CHECK (safe_failure_reason IS NULL OR char_length(safe_failure_reason) <= 500),
  occurred_at timestamptz NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX crm_integration_events_intake_idx
  ON public.crm_integration_events(intake_id, occurred_at DESC)
  WHERE intake_id IS NOT NULL;

CREATE TABLE public.crm_integration_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  intake_id uuid NOT NULL REFERENCES public.crm_integration_intakes(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('user', 'system', 'apas_crm')),
  action text NOT NULL,
  correlation_id uuid NOT NULL,
  external_intake_id text,
  event_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_integration_audit_project_idx
  ON public.crm_integration_audit_log(project_id, created_at DESC);
CREATE INDEX crm_integration_audit_correlation_idx
  ON public.crm_integration_audit_log(correlation_id, created_at);

-- A project-directory record may point to an authenticated teammate, a legacy
-- local contact, or a canonical APAS CRM contact. It never creates a second
-- master person in crm_contacts.
ALTER TABLE public.project_directory_entries
  ADD COLUMN IF NOT EXISTS apas_contact_id text,
  ADD COLUMN IF NOT EXISTS source_intake_id uuid REFERENCES public.crm_integration_intakes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_display_name text,
  ADD COLUMN IF NOT EXISTS external_company_name text,
  ADD COLUMN IF NOT EXISTS external_primary_email text,
  ADD COLUMN IF NOT EXISTS external_contact_url text;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.project_directory_entries'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%user_id IS NOT NULL%contact_id IS NOT NULL%'
  LOOP
    EXECUTE format('ALTER TABLE public.project_directory_entries DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.project_directory_entries
  ADD CONSTRAINT project_directory_entries_person_reference_check
  CHECK (user_id IS NOT NULL OR contact_id IS NOT NULL OR apas_contact_id IS NOT NULL);

CREATE UNIQUE INDEX project_directory_entries_project_apas_contact_unique
  ON public.project_directory_entries(project_id, apas_contact_id)
  WHERE apas_contact_id IS NOT NULL;

ALTER TABLE public.crm_integration_intakes
  ADD CONSTRAINT crm_integration_intakes_directory_entry_fk
  FOREIGN KEY (project_directory_entry_id)
  REFERENCES public.project_directory_entries(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_crm_integration_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_integration_intakes_updated_at
  BEFORE UPDATE ON public.crm_integration_intakes
  FOR EACH ROW EXECUTE FUNCTION public.set_crm_integration_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_crm_integration_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CRM integration audit records are append-only';
END;
$$;

CREATE TRIGGER crm_integration_audit_immutable
  BEFORE UPDATE OR DELETE ON public.crm_integration_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_crm_integration_audit_mutation();

ALTER TABLE public.crm_integration_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_integration_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_integration_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_integration_intakes_project_read
  ON public.crm_integration_intakes FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'main'
    AND tenant_id = public.current_tenant_id()
    AND public.can_access_project(auth.uid(), project_id)
  );

CREATE POLICY crm_integration_audit_project_read
  ON public.crm_integration_audit_log FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'main'
    AND tenant_id = public.current_tenant_id()
    AND public.can_access_project(auth.uid(), project_id)
  );

-- Approvals include one-time token hashes and exact approved payloads. Events
-- contain integration identifiers. Neither table is browser-readable.
REVOKE ALL ON public.crm_integration_approvals FROM authenticated;
REVOKE ALL ON public.crm_integration_events FROM authenticated;
REVOKE ALL ON public.crm_integration_intakes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.crm_integration_audit_log FROM authenticated;
GRANT SELECT (
  id, tenant_id, project_id, submitter_user_id, source_contract_version,
  status, correlation_id, source_context, project_private_context,
  review_payload, external_intake_id, canonical_apas_contact_id,
  current_remote_status, last_processed_apas_event_id, retry_count,
  retryable, next_retry_at, safe_failure_code, safe_failure_reason,
  project_directory_entry_id, submitted_at, approved_at, resolved_at,
  created_at, updated_at
) ON public.crm_integration_intakes TO authenticated;
GRANT SELECT ON public.crm_integration_audit_log TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_crm_integration_approval(
  p_approval_id uuid,
  p_token_hash text,
  p_actor_user_id uuid,
  p_proposal_hash text
)
RETURNS TABLE (
  intake_id uuid,
  tenant_id uuid,
  project_id uuid,
  external_intake_id text,
  approved_payload jsonb,
  proposal_hash text,
  correlation_id uuid,
  idempotency_key text,
  source_contract_version text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approval public.crm_integration_approvals%ROWTYPE;
  v_intake public.crm_integration_intakes%ROWTYPE;
BEGIN
  UPDATE public.crm_integration_approvals a
  SET status = CASE WHEN a.expires_at <= now() THEN 'expired' ELSE 'consumed' END,
      consumed_at = CASE WHEN a.expires_at > now() THEN now() ELSE NULL END
  WHERE a.id = p_approval_id
    AND a.actor_user_id = p_actor_user_id
    AND a.token_hash = p_token_hash
    AND a.proposal_hash = p_proposal_hash
    AND a.action = 'submit_contact_proposal'
    AND a.status = 'pending'
  RETURNING a.* INTO v_approval;

  IF v_approval.id IS NULL OR v_approval.expires_at <= now() THEN
    RETURN;
  END IF;

  SELECT * INTO v_intake
  FROM public.crm_integration_intakes i
  WHERE i.id = v_approval.intake_id
    AND i.tenant_id = v_approval.tenant_id
    AND i.project_id = v_approval.project_id
  FOR UPDATE;

  IF v_intake.id IS NULL OR v_intake.status NOT IN (
    'review_uncertain_fields', 'possible_matches_found',
    'waiting_proj_os_approval', 'returned_for_correction'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Approval is not valid for the current intake state';
  END IF;

  UPDATE public.crm_integration_intakes i
  SET status = 'approved_for_submission',
      approved_proposal = v_approval.approved_payload,
      proposal_hash = v_approval.proposal_hash,
      approved_at = now(),
      safe_failure_code = NULL,
      safe_failure_reason = NULL
  WHERE i.id = v_intake.id;

  INSERT INTO public.crm_integration_audit_log (
    tenant_id, project_id, intake_id, actor_user_id, actor_type, action,
    correlation_id, external_intake_id, details
  ) VALUES (
    v_intake.tenant_id, v_intake.project_id, v_intake.id, p_actor_user_id,
    'user', 'exact_proposal_approval_consumed', v_intake.correlation_id,
    v_intake.external_intake_id, jsonb_build_object('proposal_hash', v_approval.proposal_hash)
  );

  RETURN QUERY SELECT
    v_intake.id, v_intake.tenant_id, v_intake.project_id,
    v_intake.external_intake_id, v_approval.approved_payload,
    v_approval.proposal_hash, v_intake.correlation_id,
    v_intake.idempotency_key, v_intake.source_contract_version;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_crm_integration_approval(uuid, text, uuid, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_crm_integration_approval(uuid, text, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_crm_integration_event(
  p_event_id text,
  p_contract_version text,
  p_event_type text,
  p_external_intake_id text,
  p_correlation_id uuid,
  p_payload_digest text,
  p_event_summary jsonb,
  p_occurred_at timestamptz
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intake public.crm_integration_intakes%ROWTYPE;
  v_inserted boolean;
  v_canonical_id text;
  v_retired_id text;
  v_surviving_id text;
  v_directory_id uuid;
  v_existing_id uuid;
  v_old record;
BEGIN
  IF p_contract_version <> 'crm-integration.v1' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported CRM integration contract';
  END IF;

  INSERT INTO public.crm_integration_events (
    event_id, contract_version, event_type, external_intake_id,
    correlation_id, payload_digest, event_summary, occurred_at
  ) VALUES (
    p_event_id, p_contract_version, p_event_type, p_external_intake_id,
    p_correlation_id, p_payload_digest, p_event_summary, p_occurred_at
  )
  ON CONFLICT (event_id) DO NOTHING
  RETURNING true INTO v_inserted;

  IF NOT COALESCE(v_inserted, false) THEN
    RETURN 'replayed';
  END IF;

  SELECT * INTO v_intake
  FROM public.crm_integration_intakes i
  WHERE i.external_intake_id = p_external_intake_id
    AND i.correlation_id = p_correlation_id
  FOR UPDATE;

  IF v_intake.id IS NULL THEN
    UPDATE public.crm_integration_events
    SET processed_status = 'invalid_target',
        safe_failure_reason = 'No matching intake and correlation identifier',
        processed_at = now()
    WHERE event_id = p_event_id;
    RETURN 'invalid_target';
  END IF;

  UPDATE public.crm_integration_intakes
  SET last_processed_apas_event_id = p_event_id
  WHERE id = v_intake.id;

  UPDATE public.crm_integration_events
  SET intake_id = v_intake.id,
      tenant_id = v_intake.tenant_id,
      project_id = v_intake.project_id
  WHERE event_id = p_event_id;

  v_canonical_id := nullif(btrim(p_event_summary ->> 'canonicalContactId'), '');
  v_retired_id := nullif(btrim(p_event_summary ->> 'retiredContactId'), '');
  v_surviving_id := nullif(btrim(p_event_summary ->> 'survivingContactId'), '');

  IF p_event_type = 'contact_intake.review_required' THEN
    UPDATE public.crm_integration_intakes
    SET status = 'waiting_crm_review',
        current_remote_status = COALESCE(nullif(p_event_summary ->> 'remoteStatus', ''), 'review_required'),
        review_payload = review_payload || COALESCE(p_event_summary -> 'reviewPayload', '{}'::jsonb),
        last_processed_apas_event_id = p_event_id,
        retryable = false,
        safe_failure_code = NULL,
        safe_failure_reason = NULL
    WHERE id = v_intake.id;

  ELSIF p_event_type IN ('contact_intake.resolved', 'contact.created', 'contact.canonicalized') THEN
    IF v_canonical_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Resolved CRM event requires a canonical contact ID';
    END IF;

    INSERT INTO public.project_directory_entries (
      tenant_id, project_id, apas_contact_id, source_intake_id, role_label,
      is_key_contact, external_display_name, external_company_name,
      external_primary_email, external_contact_url
    ) VALUES (
      v_intake.tenant_id, v_intake.project_id, v_canonical_id, v_intake.id,
      nullif(v_intake.approved_proposal ->> 'projectRole', ''), false,
      nullif(p_event_summary ->> 'displayName', ''),
      nullif(p_event_summary ->> 'companyName', ''),
      nullif(p_event_summary ->> 'primaryEmail', ''),
      nullif(p_event_summary ->> 'contactUrl', '')
    )
    ON CONFLICT (project_id, apas_contact_id) WHERE apas_contact_id IS NOT NULL
    DO UPDATE SET
      source_intake_id = COALESCE(project_directory_entries.source_intake_id, EXCLUDED.source_intake_id),
      external_display_name = COALESCE(EXCLUDED.external_display_name, project_directory_entries.external_display_name),
      external_company_name = COALESCE(EXCLUDED.external_company_name, project_directory_entries.external_company_name),
      external_primary_email = COALESCE(EXCLUDED.external_primary_email, project_directory_entries.external_primary_email),
      external_contact_url = COALESCE(EXCLUDED.external_contact_url, project_directory_entries.external_contact_url)
    RETURNING id INTO v_directory_id;

    UPDATE public.crm_integration_intakes
    SET status = 'linked_to_master_contact',
        canonical_apas_contact_id = v_canonical_id,
        current_remote_status = COALESCE(nullif(p_event_summary ->> 'remoteStatus', ''), 'resolved'),
        last_processed_apas_event_id = p_event_id,
        project_directory_entry_id = v_directory_id,
        retryable = false,
        safe_failure_code = NULL,
        safe_failure_reason = NULL,
        resolved_at = COALESCE(resolved_at, now())
    WHERE id = v_intake.id;

  ELSIF p_event_type = 'contact.updated' THEN
    UPDATE public.project_directory_entries
    SET external_display_name = COALESCE(nullif(p_event_summary ->> 'displayName', ''), external_display_name),
        external_company_name = COALESCE(nullif(p_event_summary ->> 'companyName', ''), external_company_name),
        external_primary_email = COALESCE(nullif(p_event_summary ->> 'primaryEmail', ''), external_primary_email),
        external_contact_url = COALESCE(nullif(p_event_summary ->> 'contactUrl', ''), external_contact_url)
    WHERE tenant_id = v_intake.tenant_id
      AND apas_contact_id = COALESCE(v_canonical_id, v_intake.canonical_apas_contact_id);

    UPDATE public.crm_integration_intakes
    SET current_remote_status = COALESCE(nullif(p_event_summary ->> 'remoteStatus', ''), current_remote_status),
        last_processed_apas_event_id = p_event_id
    WHERE id = v_intake.id;

  ELSIF p_event_type = 'contact.merged' THEN
    IF v_retired_id IS NULL OR v_surviving_id IS NULL OR v_retired_id = v_surviving_id THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Merge event requires distinct retired and surviving contact IDs';
    END IF;

    FOR v_old IN
      SELECT id, project_id
      FROM public.project_directory_entries
      WHERE tenant_id = v_intake.tenant_id AND apas_contact_id = v_retired_id
      FOR UPDATE
    LOOP
      SELECT id INTO v_existing_id
      FROM public.project_directory_entries
      WHERE tenant_id = v_intake.tenant_id
        AND project_id = v_old.project_id
        AND apas_contact_id = v_surviving_id
        AND id <> v_old.id
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        UPDATE public.crm_integration_intakes
        SET project_directory_entry_id = v_existing_id
        WHERE tenant_id = v_intake.tenant_id
          AND project_directory_entry_id = v_old.id;
        DELETE FROM public.project_directory_entries WHERE id = v_old.id;
      ELSE
        UPDATE public.project_directory_entries
        SET apas_contact_id = v_surviving_id,
            external_contact_url = COALESCE(nullif(p_event_summary ->> 'contactUrl', ''), external_contact_url)
        WHERE id = v_old.id;
      END IF;
      v_existing_id := NULL;
    END LOOP;

    UPDATE public.crm_integration_intakes
    SET canonical_apas_contact_id = v_surviving_id,
        last_processed_apas_event_id = p_event_id,
        current_remote_status = 'merged'
    WHERE tenant_id = v_intake.tenant_id
      AND canonical_apas_contact_id = v_retired_id;
  END IF;

  UPDATE public.crm_integration_events
  SET processed_status = 'applied', processed_at = now()
  WHERE event_id = p_event_id;

  INSERT INTO public.crm_integration_audit_log (
    tenant_id, project_id, intake_id, actor_type, action, correlation_id,
    external_intake_id, event_id, details
  ) VALUES (
    v_intake.tenant_id, v_intake.project_id, v_intake.id, 'apas_crm',
    p_event_type, v_intake.correlation_id, v_intake.external_intake_id,
    p_event_id, jsonb_build_object('remote_status', p_event_summary ->> 'remoteStatus')
  );

  RETURN 'applied';
END;
$$;

REVOKE ALL ON FUNCTION public.apply_crm_integration_event(text, text, text, text, uuid, text, jsonb, timestamptz) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_crm_integration_event(text, text, text, text, uuid, text, jsonb, timestamptz) TO service_role;

COMMENT ON TABLE public.crm_integration_intakes IS
  'Proj OS-owned project context and lifecycle for APAS CRM contact intake; never a second master contact.';
COMMENT ON TABLE public.crm_integration_approvals IS
  'Exact, action-bound, expiring and one-time approvals for proposals leaving Proj OS.';
COMMENT ON TABLE public.crm_integration_events IS
  'Replay-protected APAS CRM integration events after signature and schema verification.';

COMMIT;
