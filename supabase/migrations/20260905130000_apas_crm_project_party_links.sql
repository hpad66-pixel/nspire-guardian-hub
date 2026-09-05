-- APAS CRM -> Proj OS project-party linkage.
--
-- APAS CRM remains authoritative for companies and contacts. Proj OS owns the
-- relationship that assigns one of those canonical records to a project.

BEGIN;

CREATE TABLE public.apas_crm_project_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  apas_organization_id uuid NOT NULL,
  party_type text NOT NULL CHECK (party_type IN ('company', 'contact')),
  apas_company_id uuid,
  apas_contact_id uuid,
  relationship_role text NOT NULL CHECK (relationship_role IN (
    'client', 'owner', 'vendor', 'subcontractor', 'consultant',
    'property_manager', 'inspector', 'regulator', 'utility', 'other'
  )),
  relationship_status text NOT NULL DEFAULT 'active'
    CHECK (relationship_status IN ('active', 'archived')),
  display_name_snapshot text NOT NULL CHECK (char_length(display_name_snapshot) BETWEEN 1 AND 240),
  company_name_snapshot text,
  primary_email_snapshot text,
  phone_snapshot text,
  website_snapshot text,
  apas_crm_url text,
  created_by_external_user_id text NOT NULL CHECK (char_length(created_by_external_user_id) BETWEEN 1 AND 240),
  updated_by_external_user_id text NOT NULL CHECK (char_length(updated_by_external_user_id) BETWEEN 1 AND 240),
  correlation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT apas_crm_project_parties_identity_check CHECK (
    (party_type = 'company' AND apas_company_id IS NOT NULL AND apas_contact_id IS NULL)
    OR
    (party_type = 'contact' AND apas_contact_id IS NOT NULL)
  ),
  CONSTRAINT apas_crm_project_parties_archive_check CHECK (
    (relationship_status = 'active' AND archived_at IS NULL)
    OR
    (relationship_status = 'archived' AND archived_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX apas_crm_project_company_unique
  ON public.apas_crm_project_parties(project_id, apas_company_id)
  WHERE party_type = 'company';

CREATE UNIQUE INDEX apas_crm_project_contact_unique
  ON public.apas_crm_project_parties(project_id, apas_contact_id)
  WHERE party_type = 'contact';

CREATE INDEX apas_crm_project_parties_project_status_idx
  ON public.apas_crm_project_parties(project_id, relationship_status, updated_at DESC);

CREATE TABLE public.apas_crm_project_party_mutations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 200),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  action text NOT NULL CHECK (action IN ('upsert', 'archive')),
  result_party_id uuid REFERENCES public.apas_crm_project_parties(id) ON DELETE SET NULL,
  correlation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE public.apas_crm_project_party_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_party_id uuid REFERENCES public.apas_crm_project_parties(id) ON DELETE SET NULL,
  apas_organization_id uuid NOT NULL,
  actor_external_user_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('project_party.linked', 'project_party.updated', 'project_party.archived')),
  relationship_role text NOT NULL,
  correlation_id uuid NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX apas_crm_project_party_audit_project_idx
  ON public.apas_crm_project_party_audit(project_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_apas_crm_project_party_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER apas_crm_project_parties_updated_at
  BEFORE UPDATE ON public.apas_crm_project_parties
  FOR EACH ROW EXECUTE FUNCTION public.set_apas_crm_project_party_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_apas_crm_project_party_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'APAS CRM project-link evidence is append-only';
END;
$$;

CREATE TRIGGER apas_crm_project_party_mutations_immutable
  BEFORE UPDATE OR DELETE ON public.apas_crm_project_party_mutations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_apas_crm_project_party_evidence_mutation();

CREATE TRIGGER apas_crm_project_party_audit_immutable
  BEFORE UPDATE OR DELETE ON public.apas_crm_project_party_audit
  FOR EACH ROW EXECUTE FUNCTION public.prevent_apas_crm_project_party_evidence_mutation();

CREATE OR REPLACE FUNCTION public.apply_apas_crm_project_party_mutation(
  p_tenant_id uuid,
  p_project_id uuid,
  p_apas_organization_id uuid,
  p_actor_external_user_id text,
  p_idempotency_key text,
  p_request_hash text,
  p_correlation_id uuid,
  p_action text,
  p_party_id uuid DEFAULT NULL,
  p_party jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt public.apas_crm_project_party_mutations%ROWTYPE;
  v_party public.apas_crm_project_parties%ROWTYPE;
  v_existing public.apas_crm_project_parties%ROWTYPE;
  v_party_type text;
  v_company_id uuid;
  v_contact_id uuid;
  v_role text;
  v_display_name text;
  v_audit_action text;
BEGIN
  IF p_action NOT IN ('upsert', 'archive') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported project-party action';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id
      AND p.workspace_id = p_tenant_id
      AND p.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Project not found';
  END IF;

  SELECT * INTO v_receipt
  FROM public.apas_crm_project_party_mutations
  WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key;

  IF v_receipt.id IS NOT NULL THEN
    IF v_receipt.request_hash <> p_request_hash OR v_receipt.project_id <> p_project_id THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Idempotency key was already used for another request';
    END IF;
    SELECT * INTO v_party FROM public.apas_crm_project_parties WHERE id = v_receipt.result_party_id;
    RETURN jsonb_build_object('party', to_jsonb(v_party), 'idempotentReplay', true);
  END IF;

  IF p_action = 'archive' THEN
    SELECT * INTO v_existing
    FROM public.apas_crm_project_parties
    WHERE id = p_party_id
      AND tenant_id = p_tenant_id
      AND project_id = p_project_id
      AND apas_organization_id = p_apas_organization_id
    FOR UPDATE;
    IF v_existing.id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Project party not found';
    END IF;
    UPDATE public.apas_crm_project_parties
    SET relationship_status = 'archived', archived_at = COALESCE(archived_at, now()),
        updated_by_external_user_id = p_actor_external_user_id,
        correlation_id = p_correlation_id
    WHERE id = v_existing.id
    RETURNING * INTO v_party;
    v_audit_action := 'project_party.archived';
  ELSE
    v_party_type := nullif(btrim(p_party ->> 'partyType'), '');
    v_company_id := nullif(btrim(p_party ->> 'apasCompanyId'), '')::uuid;
    v_contact_id := nullif(btrim(p_party ->> 'apasContactId'), '')::uuid;
    v_role := nullif(btrim(p_party ->> 'relationshipRole'), '');
    v_display_name := nullif(btrim(p_party ->> 'displayName'), '');

    IF v_party_type = 'company' THEN
      SELECT * INTO v_existing FROM public.apas_crm_project_parties
      WHERE project_id = p_project_id AND party_type = 'company' AND apas_company_id = v_company_id
      FOR UPDATE;
    ELSIF v_party_type = 'contact' THEN
      SELECT * INTO v_existing FROM public.apas_crm_project_parties
      WHERE project_id = p_project_id AND party_type = 'contact' AND apas_contact_id = v_contact_id
      FOR UPDATE;
    ELSE
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid project-party type';
    END IF;

    IF v_existing.id IS NULL THEN
      INSERT INTO public.apas_crm_project_parties (
        tenant_id, project_id, apas_organization_id, party_type,
        apas_company_id, apas_contact_id, relationship_role,
        display_name_snapshot, company_name_snapshot, primary_email_snapshot,
        phone_snapshot, website_snapshot, apas_crm_url,
        created_by_external_user_id, updated_by_external_user_id, correlation_id
      ) VALUES (
        p_tenant_id, p_project_id, p_apas_organization_id, v_party_type,
        v_company_id, v_contact_id, v_role, v_display_name,
        nullif(btrim(p_party ->> 'companyName'), ''),
        nullif(btrim(p_party ->> 'primaryEmail'), ''),
        nullif(btrim(p_party ->> 'phone'), ''),
        nullif(btrim(p_party ->> 'website'), ''),
        nullif(btrim(p_party ->> 'apasCrmUrl'), ''),
        p_actor_external_user_id, p_actor_external_user_id, p_correlation_id
      ) RETURNING * INTO v_party;
      v_audit_action := 'project_party.linked';
    ELSE
      UPDATE public.apas_crm_project_parties
      SET relationship_role = v_role,
          relationship_status = 'active',
          display_name_snapshot = v_display_name,
          company_name_snapshot = nullif(btrim(p_party ->> 'companyName'), ''),
          primary_email_snapshot = nullif(btrim(p_party ->> 'primaryEmail'), ''),
          phone_snapshot = nullif(btrim(p_party ->> 'phone'), ''),
          website_snapshot = nullif(btrim(p_party ->> 'website'), ''),
          apas_crm_url = nullif(btrim(p_party ->> 'apasCrmUrl'), ''),
          updated_by_external_user_id = p_actor_external_user_id,
          correlation_id = p_correlation_id,
          archived_at = NULL
      WHERE id = v_existing.id
      RETURNING * INTO v_party;
      v_audit_action := 'project_party.updated';
    END IF;
  END IF;

  INSERT INTO public.apas_crm_project_party_mutations (
    tenant_id, project_id, idempotency_key, request_hash, action,
    result_party_id, correlation_id
  ) VALUES (
    p_tenant_id, p_project_id, p_idempotency_key, p_request_hash, p_action,
    v_party.id, p_correlation_id
  );

  INSERT INTO public.apas_crm_project_party_audit (
    tenant_id, project_id, project_party_id, apas_organization_id,
    actor_external_user_id, action, relationship_role, correlation_id, details
  ) VALUES (
    p_tenant_id, p_project_id, v_party.id, p_apas_organization_id,
    p_actor_external_user_id, v_audit_action, v_party.relationship_role,
    p_correlation_id,
    jsonb_build_object(
      'party_type', v_party.party_type,
      'apas_company_id', v_party.apas_company_id,
      'apas_contact_id', v_party.apas_contact_id,
      'relationship_status', v_party.relationship_status
    )
  );

  RETURN jsonb_build_object('party', to_jsonb(v_party), 'idempotentReplay', false);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_apas_crm_project_party_mutation(
  uuid, uuid, uuid, text, text, text, uuid, text, uuid, jsonb
) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_apas_crm_project_party_mutation(
  uuid, uuid, uuid, text, text, text, uuid, text, uuid, jsonb
) TO service_role;

ALTER TABLE public.apas_crm_project_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apas_crm_project_party_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apas_crm_project_party_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY apas_crm_project_parties_project_read
  ON public.apas_crm_project_parties FOR SELECT TO authenticated
  USING (
    (tenant_id = public.current_tenant_id() AND public.can_access_project(auth.uid(), project_id))
    OR public.is_super_admin()
  );

CREATE POLICY apas_crm_project_party_audit_project_read
  ON public.apas_crm_project_party_audit FOR SELECT TO authenticated
  USING (
    (tenant_id = public.current_tenant_id() AND public.can_access_project(auth.uid(), project_id))
    OR public.is_super_admin()
  );

-- Only the service-role integration function mutates links or reads replay
-- receipts. Signed-in project users receive the safe display surface only.
REVOKE ALL ON public.apas_crm_project_parties FROM authenticated;
REVOKE ALL ON public.apas_crm_project_party_mutations FROM authenticated;
REVOKE ALL ON public.apas_crm_project_party_audit FROM authenticated;
GRANT SELECT ON public.apas_crm_project_parties TO authenticated;
GRANT SELECT ON public.apas_crm_project_party_audit TO authenticated;

COMMENT ON TABLE public.apas_crm_project_parties IS
  'Proj OS-owned project roles linked to canonical APAS CRM companies or contacts.';
COMMENT ON TABLE public.apas_crm_project_party_mutations IS
  'Replay protection for signed APAS CRM project-party mutations.';
COMMENT ON TABLE public.apas_crm_project_party_audit IS
  'Append-only evidence for APAS CRM initiated project-party changes.';

COMMIT;
