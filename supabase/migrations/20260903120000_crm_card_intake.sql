-- APAS CRM business-card intake foundation.
-- Proj OS remains authoritative for identity, project authorization, approvals,
-- CRM writes, and audit. The replaceable agent runtime never receives database access.

CREATE TABLE IF NOT EXISTS public.crm_card_scan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cohort text NOT NULL CHECK (cohort IN ('admin', 'pilot')),
  status text NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, project_id)
);

CREATE TABLE IF NOT EXISTS public.crm_card_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  correlation_id uuid NOT NULL,
  idempotency_key_hash text NOT NULL CHECK (idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'awaiting_upload' CHECK (
    status IN ('awaiting_upload', 'processing', 'processed', 'review_required', 'failed', 'completed')
  ),
  front_object_path text NOT NULL,
  back_object_path text,
  media_type text NOT NULL CHECK (media_type IN ('image/jpeg', 'image/png', 'image/heic')),
  front_sha256 text NOT NULL CHECK (front_sha256 ~ '^[a-f0-9]{64}$'),
  back_sha256 text CHECK (back_sha256 IS NULL OR back_sha256 ~ '^[a-f0-9]{64}$'),
  source_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  extracted_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  duplicate_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_reason text CHECK (review_reason IS NULL OR review_reason IN (
    'low_confidence', 'possible_duplicate', 'image_quality', 'missing_required_field'
  )),
  guidance text,
  failure_code text CHECK (failure_code IS NULL OR failure_code IN (
    'unsupported_image', 'unreadable', 'service_unavailable', 'processing_error'
  )),
  failure_message text,
  failure_retryable boolean,
  processed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, project_id, idempotency_key_hash),
  CHECK (back_object_path IS NULL = (back_sha256 IS NULL))
);

CREATE TABLE IF NOT EXISTS public.crm_contact_actions (
  id uuid PRIMARY KEY,
  intake_id uuid NOT NULL REFERENCES public.crm_card_intakes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  correlation_id uuid NOT NULL,
  idempotency_key_hash text NOT NULL CHECK (idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  action_kind text NOT NULL CHECK (action_kind IN ('create', 'update', 'link_existing')),
  target_contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE RESTRICT,
  reviewed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_action_sha256 text NOT NULL CHECK (normalized_action_sha256 ~ '^[a-f0-9]{64}$'),
  approval_token_sha256 text NOT NULL CHECK (approval_token_sha256 ~ '^[a-f0-9]{64}$'),
  approval_expires_at timestamptz NOT NULL,
  approved_at timestamptz,
  consumed_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  result_contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE RESTRICT,
  result_directory_entry_id uuid REFERENCES public.project_directory_entries(id) ON DELETE SET NULL,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, project_id, idempotency_key_hash),
  CHECK ((action_kind = 'create' AND target_contact_id IS NULL) OR
         (action_kind IN ('update', 'link_existing') AND target_contact_id IS NOT NULL)),
  CHECK (approval_expires_at > created_at AND approval_expires_at <= created_at + interval '10 minutes')
);

CREATE TABLE IF NOT EXISTS public.crm_card_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  intake_id uuid REFERENCES public.crm_card_intakes(id) ON DELETE SET NULL,
  action_id uuid REFERENCES public.crm_contact_actions(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  correlation_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'intake_created', 'ocr_processed', 'ocr_review_required', 'ocr_failed',
    'approval_created', 'approval_rejected', 'action_completed', 'action_failed'
  )),
  decision text NOT NULL CHECK (decision IN ('allowed', 'denied', 'not_applicable')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_card_intakes_scope_idx
  ON public.crm_card_intakes (tenant_id, user_id, project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_card_intakes_correlation_idx ON public.crm_card_intakes (correlation_id);
CREATE INDEX IF NOT EXISTS crm_contact_actions_intake_idx ON public.crm_contact_actions (intake_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_card_audit_scope_idx
  ON public.crm_card_audit_events (tenant_id, project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_contacts_normalized_email_idx
  ON public.crm_contacts (workspace_id, lower(trim(email))) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_contacts_normalized_phone_idx
  ON public.crm_contacts (workspace_id, regexp_replace(phone, '[^0-9]', '', 'g')) WHERE phone IS NOT NULL;

CREATE TRIGGER crm_card_scan_entitlements_updated_at
  BEFORE UPDATE ON public.crm_card_scan_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER crm_card_intakes_updated_at
  BEFORE UPDATE ON public.crm_card_intakes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.crm_card_scan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_card_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contact_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_card_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_card_scan_entitlements_select ON public.crm_card_scan_entitlements
  FOR SELECT TO authenticated USING (
    tenant_id = public.current_tenant_id()
    AND (user_id = auth.uid() OR public.is_workspace_admin(auth.uid()))
    AND public.can_access_project(auth.uid(), project_id)
  );
CREATE POLICY crm_card_intakes_select ON public.crm_card_intakes
  FOR SELECT TO authenticated USING (
    tenant_id = public.current_tenant_id()
    AND (user_id = auth.uid() OR public.is_workspace_admin(auth.uid()))
    AND public.can_access_project(auth.uid(), project_id)
  );
CREATE POLICY crm_contact_actions_select ON public.crm_contact_actions
  FOR SELECT TO authenticated USING (
    tenant_id = public.current_tenant_id()
    AND (user_id = auth.uid() OR public.is_workspace_admin(auth.uid()))
    AND public.can_access_project(auth.uid(), project_id)
  );
CREATE POLICY crm_card_audit_events_select ON public.crm_card_audit_events
  FOR SELECT TO authenticated USING (
    tenant_id = public.current_tenant_id()
    AND (user_id = auth.uid() OR public.is_workspace_admin(auth.uid()))
    AND public.can_access_project(auth.uid(), project_id)
  );

-- Private, temporary source images. Object access is only through short-lived
-- signed URLs minted by crm-card-intake after authorization; there is no broad
-- authenticated storage.objects policy for this bucket.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('crm-card-intake', 'crm-card-intake', false, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/heic'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.has_crm_card_scan_entitlement(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_card_scan_entitlements e
    WHERE e.tenant_id = public.current_tenant_id()
      AND e.user_id = auth.uid()
      AND e.project_id = p_project_id
      AND e.status = 'enabled'
      AND public.can_access_project(auth.uid(), p_project_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.set_crm_card_scan_entitlement(
  p_user_id uuid,
  p_project_id uuid,
  p_cohort text,
  p_enabled boolean
)
RETURNS public.crm_card_scan_entitlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_row public.crm_card_scan_entitlements;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL OR v_tenant IS NULL OR NOT public.is_workspace_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Workspace administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_cohort NOT IN ('admin', 'pilot') THEN
    RAISE EXCEPTION 'Invalid rollout cohort' USING ERRCODE = '22023';
  END IF;
  IF NOT public.can_access_project(p_user_id, p_project_id) THEN
    RAISE EXCEPTION 'User cannot access project' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id AND workspace_id = v_tenant AND COALESCE(status, 'active') = 'active') THEN
    RAISE EXCEPTION 'User is not active in this workspace' USING ERRCODE = '42501';
  END IF;
  IF p_enabled THEN
    SELECT count(DISTINCT user_id) INTO v_count FROM public.crm_card_scan_entitlements
    WHERE tenant_id = v_tenant AND cohort = p_cohort AND status = 'enabled'
      AND user_id <> p_user_id;
    IF (p_cohort = 'admin' AND v_count >= 1) OR (p_cohort = 'pilot' AND v_count >= 4) THEN
      RAISE EXCEPTION 'Card-scan rollout cohort is full' USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.crm_card_scan_entitlements
    (tenant_id, user_id, project_id, cohort, status, created_by)
  VALUES
    (v_tenant, p_user_id, p_project_id, p_cohort, CASE WHEN p_enabled THEN 'enabled' ELSE 'disabled' END, auth.uid())
  ON CONFLICT (tenant_id, user_id, project_id) DO UPDATE SET
    cohort = EXCLUDED.cohort,
    status = EXCLUDED.status,
    updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- Atomic, narrowly granted CRM mutation. The Edge Function authenticates the
-- user and validates the signed approval; this function locks and consumes the
-- database approval so retries cannot duplicate side effects.
CREATE OR REPLACE FUNCTION public.execute_crm_card_action(
  p_action_id uuid,
  p_actor_user_id uuid,
  p_approval_token_sha256 text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action public.crm_contact_actions;
  v_intake public.crm_card_intakes;
  v_contact_id uuid;
  v_directory_id uuid;
  v_property_id uuid;
  v_fields jsonb;
  v_first_name text;
BEGIN
  SELECT * INTO v_action FROM public.crm_contact_actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Approval not found' USING ERRCODE = 'P0002'; END IF;
  IF v_action.user_id <> p_actor_user_id THEN RAISE EXCEPTION 'Approval actor mismatch' USING ERRCODE = '42501'; END IF;
  IF v_action.approval_token_sha256 <> p_approval_token_sha256 THEN RAISE EXCEPTION 'Approval token mismatch' USING ERRCODE = '42501'; END IF;
  IF v_action.status = 'completed' THEN
    RETURN jsonb_build_object('contactId', v_action.result_contact_id, 'directoryEntryId', v_action.result_directory_entry_id, 'replayed', true);
  END IF;
  IF v_action.status <> 'pending' OR v_action.consumed_at IS NOT NULL OR v_action.approval_expires_at <= now() THEN
    UPDATE public.crm_contact_actions SET status = CASE WHEN approval_expires_at <= now() THEN 'expired' ELSE status END WHERE id = p_action_id;
    RAISE EXCEPTION 'Approval is expired or consumed' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_access_project(p_actor_user_id, v_action.project_id) THEN
    RAISE EXCEPTION 'Project access denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_intake FROM public.crm_card_intakes WHERE id = v_action.intake_id FOR UPDATE;
  IF NOT FOUND OR v_intake.tenant_id <> v_action.tenant_id OR v_intake.user_id <> v_action.user_id
    OR v_intake.project_id <> v_action.project_id THEN
    RAISE EXCEPTION 'Intake scope mismatch' USING ERRCODE = '23514';
  END IF;
  v_fields := v_action.reviewed_fields;

  IF v_action.action_kind = 'create' THEN
    v_first_name := NULLIF(trim(COALESCE(v_fields->>'firstName', v_fields->>'first_name', '')), '');
    IF v_first_name IS NULL THEN RAISE EXCEPTION 'First name is required' USING ERRCODE = '23514'; END IF;
    SELECT property_id INTO v_property_id FROM public.projects WHERE id = v_action.project_id;
    INSERT INTO public.crm_contacts (
      workspace_id, user_id, property_id, first_name, last_name, company_name, job_title,
      contact_type, email, phone, mobile, address_line1, city, state, zip_code, country,
      website, tags, notes, created_by
    ) VALUES (
      v_action.tenant_id, CASE WHEN v_property_id IS NULL THEN p_actor_user_id ELSE NULL END, v_property_id,
      v_first_name, NULLIF(trim(COALESCE(v_fields->>'lastName', v_fields->>'last_name', '')), ''),
      NULLIF(trim(COALESCE(v_fields->>'organization', v_fields->>'company_name', '')), ''),
      NULLIF(trim(COALESCE(v_fields->>'title', v_fields->>'job_title', '')), ''),
      COALESCE(NULLIF(v_fields->>'contactType', ''), 'other')::public.contact_type,
      NULLIF(lower(trim(v_fields->>'email')), ''), NULLIF(trim(v_fields->>'phone'), ''),
      NULLIF(trim(v_fields->>'mobile'), ''), NULLIF(trim(COALESCE(v_fields->>'address', v_fields->>'address_line1', '')), ''),
      NULLIF(trim(v_fields->>'city'), ''), NULLIF(trim(v_fields->>'state'), ''), NULLIF(trim(COALESCE(v_fields->>'zipCode', v_fields->>'zip_code', '')), ''),
      COALESCE(NULLIF(trim(v_fields->>'country'), ''), 'USA'), NULLIF(trim(v_fields->>'website'), ''),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_action.source_context->'tags', '[]'::jsonb))), '{}'::text[]),
      NULLIF(trim(COALESCE(v_action.source_context->>'notes', v_action.source_context->>'desiredFollowUp', '')), ''), p_actor_user_id
    ) RETURNING id INTO v_contact_id;
  ELSIF v_action.action_kind = 'update' THEN
    SELECT id INTO v_contact_id FROM public.crm_contacts
    WHERE id = v_action.target_contact_id AND workspace_id = v_action.tenant_id AND COALESCE(is_active, true)
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Contact not found in workspace' USING ERRCODE = 'P0002'; END IF;
    UPDATE public.crm_contacts SET
      first_name = COALESCE(NULLIF(trim(COALESCE(v_fields->>'firstName', v_fields->>'first_name', '')), ''), first_name),
      last_name = COALESCE(NULLIF(trim(COALESCE(v_fields->>'lastName', v_fields->>'last_name', '')), ''), last_name),
      company_name = COALESCE(NULLIF(trim(COALESCE(v_fields->>'organization', v_fields->>'company_name', '')), ''), company_name),
      job_title = COALESCE(NULLIF(trim(COALESCE(v_fields->>'title', v_fields->>'job_title', '')), ''), job_title),
      email = COALESCE(NULLIF(lower(trim(v_fields->>'email')), ''), email),
      phone = COALESCE(NULLIF(trim(v_fields->>'phone'), ''), phone),
      mobile = COALESCE(NULLIF(trim(v_fields->>'mobile'), ''), mobile),
      website = COALESCE(NULLIF(trim(v_fields->>'website'), ''), website),
      address_line1 = COALESCE(NULLIF(trim(COALESCE(v_fields->>'address', v_fields->>'address_line1', '')), ''), address_line1),
      updated_at = now()
    WHERE id = v_contact_id;
  ELSE
    SELECT id INTO v_contact_id FROM public.crm_contacts
    WHERE id = v_action.target_contact_id AND workspace_id = v_action.tenant_id AND COALESCE(is_active, true);
    IF NOT FOUND THEN RAISE EXCEPTION 'Contact not found in workspace' USING ERRCODE = 'P0002'; END IF;
  END IF;

  INSERT INTO public.project_directory_entries (tenant_id, project_id, contact_id, role_label)
  VALUES (v_action.tenant_id, v_action.project_id, v_contact_id, NULLIF(trim(v_action.source_context->>'projectRole'), ''))
  ON CONFLICT (project_id, contact_id) WHERE contact_id IS NOT NULL
  DO UPDATE SET role_label = COALESCE(EXCLUDED.role_label, public.project_directory_entries.role_label)
  RETURNING id INTO v_directory_id;

  UPDATE public.crm_contact_actions SET
    status = 'completed', approved_at = now(), consumed_at = now(),
    result_contact_id = v_contact_id, result_directory_entry_id = v_directory_id
  WHERE id = p_action_id;
  UPDATE public.crm_card_intakes SET status = 'completed', completed_at = now() WHERE id = v_intake.id;
  INSERT INTO public.crm_card_audit_events
    (tenant_id, user_id, project_id, intake_id, action_id, contact_id, correlation_id, event_type, decision, details)
  VALUES
    (v_action.tenant_id, p_actor_user_id, v_action.project_id, v_action.intake_id, v_action.id,
     v_contact_id, v_action.correlation_id, 'action_completed', 'allowed',
     jsonb_build_object('actionKind', v_action.action_kind, 'directoryEntryId', v_directory_id,
                        'normalizedActionSha256', v_action.normalized_action_sha256));
  RETURN jsonb_build_object('contactId', v_contact_id, 'directoryEntryId', v_directory_id, 'replayed', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_crm_card_audit_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'CRM card audit rows are append-only' USING ERRCODE = '55000'; END;
$$;
CREATE TRIGGER crm_card_audit_append_only
  BEFORE UPDATE OR DELETE ON public.crm_card_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_crm_card_audit_mutation();

REVOKE ALL ON TABLE public.crm_card_scan_entitlements, public.crm_card_intakes,
  public.crm_contact_actions, public.crm_card_audit_events FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.crm_card_intakes, public.crm_contact_actions,
  public.crm_card_audit_events FROM authenticated;
GRANT SELECT ON public.crm_card_scan_entitlements, public.crm_card_intakes,
  public.crm_contact_actions, public.crm_card_audit_events TO authenticated;
REVOKE ALL ON FUNCTION public.has_crm_card_scan_entitlement(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_crm_card_scan_entitlement(uuid, uuid, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.execute_crm_card_action(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_crm_card_scan_entitlement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_crm_card_scan_entitlement(uuid, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_crm_card_action(uuid, uuid, text) TO service_role;

COMMENT ON TABLE public.crm_card_intakes IS 'Tenant/user/project-scoped temporary card images and OCR provenance; APAS CRM remains the master contact store.';
COMMENT ON TABLE public.crm_contact_actions IS 'Exact, short-lived, single-use approvals for create/update/link operations in APAS CRM.';
COMMENT ON TABLE public.crm_card_audit_events IS 'Append-only actor, approval, correlation, and CRM result audit without card images or approval tokens.';

NOTIFY pgrst, 'reload schema';
