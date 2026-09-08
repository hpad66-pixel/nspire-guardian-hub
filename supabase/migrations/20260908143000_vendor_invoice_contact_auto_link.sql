-- Make invoice requests the single, deterministic vendor-onboarding action.
-- An existing CRM contact is resolved to its vendor organization, attached to
-- the project directory, enrolled in project A/P, and made eligible for the
-- APAS CRM adapter before the one-time request is created.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_consulting_invoice_request_v2(
  p_project_id uuid,
  p_recipient_email text,
  p_token_digest text,
  p_organization_id uuid DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_request uuid;
  v_org public.organizations%ROWTYPE;
  v_contact public.crm_contacts%ROWTYPE;
  v_email text := lower(btrim(COALESCE(p_recipient_email, '')));
  v_company_key text;
  v_linked_contacts integer := 0;
BEGIN
  SELECT workspace_id INTO v_tenant
  FROM public.projects
  WHERE id = p_project_id
    AND lower(COALESCE(project_type, '')) IN ('consulting', 'client')
    AND deleted_at IS NULL;

  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Consulting project not found'; END IF;
  IF NOT public.can_manage_consulting_ap(v_tenant) THEN RAISE EXCEPTION 'Administrator approval required'; END IF;
  IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'A valid vendor recipient email is required';
  END IF;
  IF p_token_digest !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid secure token digest'; END IF;
  IF p_organization_id IS NULL AND p_contact_id IS NULL THEN
    RAISE EXCEPTION 'Choose an existing vendor company or CRM contact';
  END IF;

  IF p_contact_id IS NOT NULL THEN
    SELECT * INTO v_contact
    FROM public.crm_contacts
    WHERE id = p_contact_id
      AND workspace_id = v_tenant
      AND COALESCE(is_active, true)
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Active CRM contact not found in this workspace'; END IF;
  END IF;

  IF p_organization_id IS NOT NULL THEN
    SELECT * INTO v_org
    FROM public.organizations
    WHERE id = p_organization_id
      AND tenant_id = v_tenant
      AND is_active
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Active vendor organization not found'; END IF;
    IF v_org.kind NOT IN ('sub', 'vendor', 'consultant', 'other') THEN
      RAISE EXCEPTION 'The selected company is not a vendor, subcontractor, or consultant';
    END IF;
  ELSE
    v_company_key := regexp_replace(
      lower(btrim(COALESCE(NULLIF(v_contact.company_name, ''),
        concat_ws(' ', v_contact.first_name, v_contact.last_name)))),
      '[^a-z0-9]+', '', 'g'
    );
    IF v_company_key = '' THEN RAISE EXCEPTION 'The CRM contact needs a company or contact name'; END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(v_tenant::text || ':invoice-vendor:' || v_company_key, 0));
    SELECT * INTO v_org
    FROM public.organizations o
    WHERE o.tenant_id = v_tenant
      AND o.is_active
      AND (
        regexp_replace(lower(btrim(o.name)), '[^a-z0-9]+', '', 'g') = v_company_key
        OR (v_contact.email IS NOT NULL AND lower(btrim(o.email)) = lower(btrim(v_contact.email)))
      )
    ORDER BY
      CASE WHEN regexp_replace(lower(btrim(o.name)), '[^a-z0-9]+', '', 'g') = v_company_key THEN 0 ELSE 1 END,
      o.created_at
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO public.organizations (
        tenant_id, name, legal_name, kind, email, phone, website,
        address_line1, address_line2, city, state, postal_code, country,
        notes, is_active, created_by, apas_crm_sync_status
      ) VALUES (
        v_tenant,
        COALESCE(NULLIF(btrim(v_contact.company_name), ''), concat_ws(' ', v_contact.first_name, v_contact.last_name)),
        NULLIF(btrim(v_contact.company_name), ''),
        CASE WHEN v_contact.contact_type::text = 'contractor' THEN 'sub' ELSE 'vendor' END,
        COALESCE(NULLIF(btrim(v_contact.email), ''), v_email),
        COALESCE(NULLIF(btrim(v_contact.mobile), ''), NULLIF(btrim(v_contact.phone), '')),
        NULLIF(btrim(v_contact.website), ''),
        NULLIF(btrim(v_contact.address_line1), ''), NULLIF(btrim(v_contact.address_line2), ''),
        NULLIF(btrim(v_contact.city), ''), NULLIF(btrim(v_contact.state), ''),
        NULLIF(btrim(v_contact.zip_code), ''), COALESCE(NULLIF(btrim(v_contact.country), ''), 'US'),
        'Created from an existing ProjOS CRM contact during vendor invoice request.',
        true, auth.uid(), 'not_synced'
      )
      RETURNING * INTO v_org;
    END IF;
  END IF;

  UPDATE public.organizations
  SET email = COALESCE(NULLIF(email, ''), v_email),
      phone = COALESCE(NULLIF(phone, ''), NULLIF(btrim(v_contact.mobile), ''), NULLIF(btrim(v_contact.phone), '')),
      website = COALESCE(NULLIF(website, ''), NULLIF(btrim(v_contact.website), '')),
      address_line1 = COALESCE(NULLIF(address_line1, ''), NULLIF(btrim(v_contact.address_line1), '')),
      address_line2 = COALESCE(NULLIF(address_line2, ''), NULLIF(btrim(v_contact.address_line2), '')),
      city = COALESCE(NULLIF(city, ''), NULLIF(btrim(v_contact.city), '')),
      state = COALESCE(NULLIF(state, ''), NULLIF(btrim(v_contact.state), '')),
      postal_code = COALESCE(NULLIF(postal_code, ''), NULLIF(btrim(v_contact.zip_code), '')),
      updated_at = now()
  WHERE id = v_org.id
  RETURNING * INTO v_org;

  INSERT INTO public.consulting_vendor_assignments
    (tenant_id, project_id, organization_id, is_active, created_by)
  VALUES (v_tenant, p_project_id, v_org.id, true, auth.uid())
  ON CONFLICT (project_id, organization_id) DO UPDATE SET is_active = true;

  INSERT INTO public.project_vendor_assignments
    (tenant_id, project_id, organization_id, relationship_role, source, is_active, created_by)
  VALUES (
    v_tenant, p_project_id, v_org.id,
    CASE WHEN v_org.kind = 'sub' THEN 'subcontractor' WHEN v_org.kind = 'consultant' THEN 'consultant' ELSE 'vendor' END,
    'consulting_ap', true, auth.uid()
  )
  ON CONFLICT (project_id, organization_id) DO UPDATE SET
    relationship_role = EXCLUDED.relationship_role,
    source = 'consulting_ap',
    is_active = true,
    updated_at = now();

  v_company_key := regexp_replace(lower(btrim(v_org.name)), '[^a-z0-9]+', '', 'g');
  INSERT INTO public.project_directory_entries (
    tenant_id, project_id, contact_id, organization_id, role_label, is_key_contact
  )
  SELECT
    v_tenant, p_project_id, c.id, v_org.id,
    CASE WHEN lower(btrim(COALESCE(c.email, ''))) = v_email THEN 'Vendor invoice contact' ELSE 'Vendor contact' END,
    lower(btrim(COALESCE(c.email, ''))) = v_email
  FROM public.crm_contacts c
  WHERE c.workspace_id = v_tenant
    AND COALESCE(c.is_active, true)
    AND (
      c.id = p_contact_id
      OR lower(btrim(COALESCE(c.email, ''))) = v_email
      OR (
        v_company_key <> ''
        AND regexp_replace(lower(btrim(COALESCE(c.company_name, ''))), '[^a-z0-9]+', '', 'g') = v_company_key
      )
    )
  ON CONFLICT (project_id, contact_id) WHERE contact_id IS NOT NULL
  DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    role_label = CASE
      WHEN EXCLUDED.is_key_contact THEN EXCLUDED.role_label
      ELSE COALESCE(project_directory_entries.role_label, EXCLUDED.role_label)
    END,
    is_key_contact = project_directory_entries.is_key_contact OR EXCLUDED.is_key_contact;
  GET DIAGNOSTICS v_linked_contacts = ROW_COUNT;

  INSERT INTO public.consulting_invoice_requests (
    tenant_id, project_id, organization_id, recipient_email,
    token_digest, due_date, message, created_by
  ) VALUES (
    v_tenant, p_project_id, v_org.id, v_email,
    lower(p_token_digest), p_due_date, NULLIF(btrim(p_message), ''), auth.uid()
  ) RETURNING id INTO v_request;

  INSERT INTO public.consulting_ap_audit_log
    (tenant_id, project_id, entity_type, entity_id, action, actor_id, metadata)
  VALUES (
    v_tenant, p_project_id, 'invoice_request', v_request, 'request_created', auth.uid(),
    jsonb_build_object(
      'organization_id', v_org.id,
      'contact_id', p_contact_id,
      'due_date', p_due_date,
      'linked_contact_count', v_linked_contacts,
      'project_vendor_assignment', true
    )
  );

  RETURN jsonb_build_object(
    'requestId', v_request,
    'organizationId', v_org.id,
    'vendorName', v_org.name,
    'linkedContactCount', v_linked_contacts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_consulting_invoice_request_v2(
  uuid, text, text, uuid, uuid, date, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_consulting_invoice_request_v2(
  uuid, text, text, uuid, uuid, date, text
) TO authenticated;

-- Repair prior invoice requests, including requests created before the general
-- project-vendor registry existed.
INSERT INTO public.project_vendor_assignments (
  tenant_id, project_id, organization_id, relationship_role, source, is_active, created_by
)
SELECT DISTINCT
  r.tenant_id, r.project_id, r.organization_id,
  CASE WHEN o.kind = 'sub' THEN 'subcontractor' WHEN o.kind = 'consultant' THEN 'consultant' ELSE 'vendor' END,
  'consulting_ap', true, r.created_by
FROM public.consulting_invoice_requests r
JOIN public.organizations o ON o.id = r.organization_id AND o.tenant_id = r.tenant_id
ON CONFLICT (project_id, organization_id) DO UPDATE SET
  is_active = true,
  source = 'consulting_ap',
  updated_at = now();

INSERT INTO public.project_directory_entries (
  tenant_id, project_id, contact_id, organization_id, role_label, is_key_contact
)
SELECT DISTINCT ON (r.project_id, c.id)
  r.tenant_id, r.project_id, c.id, r.organization_id,
  CASE WHEN lower(btrim(COALESCE(c.email, ''))) = lower(btrim(r.recipient_email))
    THEN 'Vendor invoice contact' ELSE 'Vendor contact' END,
  lower(btrim(COALESCE(c.email, ''))) = lower(btrim(r.recipient_email))
FROM public.consulting_invoice_requests r
JOIN public.organizations o ON o.id = r.organization_id AND o.tenant_id = r.tenant_id
JOIN public.crm_contacts c ON c.workspace_id = r.tenant_id AND COALESCE(c.is_active, true)
  AND (
    lower(btrim(COALESCE(c.email, ''))) = lower(btrim(r.recipient_email))
    OR regexp_replace(lower(btrim(COALESCE(c.company_name, ''))), '[^a-z0-9]+', '', 'g')
       = regexp_replace(lower(btrim(o.name)), '[^a-z0-9]+', '', 'g')
  )
ORDER BY r.project_id, c.id, r.created_at DESC
ON CONFLICT (project_id, contact_id) WHERE contact_id IS NOT NULL
DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  role_label = CASE WHEN EXCLUDED.is_key_contact THEN EXCLUDED.role_label ELSE project_directory_entries.role_label END,
  is_key_contact = project_directory_entries.is_key_contact OR EXCLUDED.is_key_contact;

COMMIT;
