-- Separate consultant and contractor onboarding while preserving one reusable
-- company portfolio and the existing deterministic readiness controls.

BEGIN;

ALTER TABLE public.contractor_qualification_cases
  ADD COLUMN IF NOT EXISTS engagement_type text NOT NULL DEFAULT 'contractor',
  ADD COLUMN IF NOT EXISTS certificate_holder_name text,
  ADD COLUMN IF NOT EXISTS certificate_holder_address text,
  ADD COLUMN IF NOT EXISTS additional_insured_name text,
  ADD COLUMN IF NOT EXISTS insurance_instructions text;

ALTER TABLE public.contractor_qualification_cases
  DROP CONSTRAINT IF EXISTS contractor_qualification_cases_engagement_type_check;
ALTER TABLE public.contractor_qualification_cases
  ADD CONSTRAINT contractor_qualification_cases_engagement_type_check
  CHECK (engagement_type IN ('contractor','consultant'));

ALTER TABLE public.contractor_requirement_items
  ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'both';
ALTER TABLE public.contractor_requirement_items
  DROP CONSTRAINT IF EXISTS contractor_requirement_items_applies_to_check;
ALTER TABLE public.contractor_requirement_items
  ADD CONSTRAINT contractor_requirement_items_applies_to_check
  CHECK (applies_to IN ('both','contractor','consultant'));

ALTER TABLE public.contractor_case_requirements
  ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'both';
ALTER TABLE public.contractor_case_requirements
  DROP CONSTRAINT IF EXISTS contractor_case_requirements_applies_to_check;
ALTER TABLE public.contractor_case_requirements
  ADD CONSTRAINT contractor_case_requirements_applies_to_check
  CHECK (applies_to IN ('both','contractor','consultant'));

DROP INDEX IF EXISTS public.contractor_case_workspace_unique;
DROP INDEX IF EXISTS public.contractor_case_client_unique;
DROP INDEX IF EXISTS public.contractor_case_project_unique;
CREATE UNIQUE INDEX contractor_case_workspace_unique
  ON public.contractor_qualification_cases(tenant_id, organization_id, engagement_type)
  WHERE scope_type = 'workspace';
CREATE UNIQUE INDEX contractor_case_client_unique
  ON public.contractor_qualification_cases(tenant_id, organization_id, client_id, engagement_type)
  WHERE scope_type = 'client';
CREATE UNIQUE INDEX contractor_case_project_unique
  ON public.contractor_qualification_cases(tenant_id, organization_id, project_id, engagement_type)
  WHERE scope_type = 'project';

UPDATE public.contractor_requirement_items
SET applies_to = CASE
  WHEN requirement_code IN ('trade_license','auto_liability','safety_program') THEN 'contractor'
  ELSE 'both'
END
WHERE requirement_code IN (
  'w9','trade_license','general_liability','workers_comp','auto_liability',
  'safety_program','experience','vendor_policy'
);

INSERT INTO public.contractor_requirement_items (
  tenant_id, template_id, requirement_code, title, description, category,
  gate_type, required, legally_required, verification_required,
  expiration_required, instructions, sort_order, response_type, applies_to
)
SELECT
  t.tenant_id, t.id, 'professional_liability', 'Professional liability insurance',
  'Current errors and omissions or professional liability coverage appropriate to the professional services.',
  'insurance', 'work', true, false, true, true,
  'Upload the current certificate or declarations page showing the insured firm, coverage limit, and expiration date.',
  45, 'document', 'consultant'
FROM public.contractor_requirement_templates t
WHERE t.is_active
ON CONFLICT (template_id, requirement_code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  gate_type = EXCLUDED.gate_type,
  required = EXCLUDED.required,
  verification_required = EXCLUDED.verification_required,
  expiration_required = EXCLUDED.expiration_required,
  instructions = EXCLUDED.instructions,
  response_type = EXCLUDED.response_type,
  applies_to = EXCLUDED.applies_to;

INSERT INTO public.contractor_requirement_items (
  tenant_id, template_id, requirement_code, title, description, category,
  gate_type, required, legally_required, verification_required,
  expiration_required, instructions, sort_order, response_type, applies_to
)
SELECT
  t.tenant_id, t.id, 'professional_license', 'Applicable professional or business license',
  'Current license or registration required for the professional services and jurisdiction, when applicable.',
  'license', 'work', true, true, true, true,
  'Upload the current professional license or firm registration showing the license number, issuing authority, and expiration date.',
  20, 'document', 'consultant'
FROM public.contractor_requirement_templates t
WHERE t.is_active
ON CONFLICT (template_id, requirement_code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  gate_type = EXCLUDED.gate_type,
  required = EXCLUDED.required,
  legally_required = EXCLUDED.legally_required,
  verification_required = EXCLUDED.verification_required,
  expiration_required = EXCLUDED.expiration_required,
  instructions = EXCLUDED.instructions,
  response_type = EXCLUDED.response_type,
  applies_to = EXCLUDED.applies_to;

DROP FUNCTION IF EXISTS public.create_contractor_qualification_case(uuid,uuid,uuid,text);

CREATE FUNCTION public.create_contractor_qualification_case(
  p_organization_id uuid,
  p_client_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_risk_tier text DEFAULT 'standard',
  p_engagement_type text DEFAULT 'contractor',
  p_certificate_holder_name text DEFAULT NULL,
  p_certificate_holder_address text DEFAULT NULL,
  p_additional_insured_name text DEFAULT NULL,
  p_insurance_instructions text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_template uuid;
  v_case uuid;
  v_scope text;
  v_project_client uuid;
BEGIN
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Workspace context is required'; END IF;
  IF p_engagement_type NOT IN ('contractor','consultant') THEN
    RAISE EXCEPTION 'Engagement type must be contractor or consultant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_organization_id AND tenant_id = v_tenant) THEN
    RAISE EXCEPTION 'Company is outside this workspace';
  END IF;
  IF p_project_id IS NOT NULL THEN
    SELECT client_id INTO v_project_client FROM public.projects
    WHERE id = p_project_id AND workspace_id = v_tenant;
    IF NOT FOUND THEN RAISE EXCEPTION 'Project is outside this workspace'; END IF;
    IF NOT public.effective_project_permission(auth.uid(), p_project_id, 'projects', 'edit') THEN
      RAISE EXCEPTION 'Project administrator access is required';
    END IF;
    p_client_id := COALESCE(p_client_id, v_project_client);
    v_scope := 'project';
  ELSIF p_client_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id AND workspace_id = v_tenant) THEN
      RAISE EXCEPTION 'Client is outside this workspace';
    END IF;
    IF NOT public.can_manage_client_projects(auth.uid(), p_client_id) THEN
      RAISE EXCEPTION 'Client administrator access is required';
    END IF;
    v_scope := 'client';
  ELSE
    IF NOT public.can_manage_contractor_readiness(v_tenant) THEN
      RAISE EXCEPTION 'Workspace administrator access is required for company-wide qualification';
    END IF;
    v_scope := 'workspace';
  END IF;

  v_template := public.ensure_default_contractor_template();

  -- A newly-created workspace template is normalized at first use.
  UPDATE public.contractor_requirement_items
  SET applies_to = CASE
    WHEN requirement_code IN ('trade_license','auto_liability','safety_program') THEN 'contractor'
    ELSE 'both'
  END
  WHERE template_id = v_template
    AND requirement_code IN (
      'w9','trade_license','general_liability','workers_comp','auto_liability',
      'safety_program','experience','vendor_policy'
    );

  INSERT INTO public.contractor_requirement_items (
    tenant_id, template_id, requirement_code, title, description, category,
    gate_type, required, legally_required, verification_required,
    expiration_required, instructions, sort_order, response_type, applies_to
  ) VALUES (
    v_tenant, v_template, 'professional_liability', 'Professional liability insurance',
    'Current errors and omissions or professional liability coverage appropriate to the professional services.',
    'insurance', 'work', true, false, true, true,
    'Upload the current certificate or declarations page showing the insured firm, coverage limit, and expiration date.',
    45, 'document', 'consultant'
  ) ON CONFLICT (template_id, requirement_code) DO NOTHING;

  INSERT INTO public.contractor_requirement_items (
    tenant_id, template_id, requirement_code, title, description, category,
    gate_type, required, legally_required, verification_required,
    expiration_required, instructions, sort_order, response_type, applies_to
  ) VALUES (
    v_tenant, v_template, 'professional_license', 'Applicable professional or business license',
    'Current license or registration required for the professional services and jurisdiction, when applicable.',
    'license', 'work', true, true, true, true,
    'Upload the current professional license or firm registration showing the license number, issuing authority, and expiration date.',
    20, 'document', 'consultant'
  ) ON CONFLICT (template_id, requirement_code) DO NOTHING;

  INSERT INTO public.contractor_profiles (tenant_id, organization_id, profile_status, created_by)
  VALUES (v_tenant, p_organization_id, 'draft', auth.uid())
  ON CONFLICT (tenant_id, organization_id) DO NOTHING;

  SELECT id INTO v_case
  FROM public.contractor_qualification_cases
  WHERE tenant_id = v_tenant AND organization_id = p_organization_id
    AND scope_type = v_scope
    AND engagement_type = p_engagement_type
    AND (v_scope <> 'client' OR client_id = p_client_id)
    AND (v_scope <> 'project' OR project_id = p_project_id)
  LIMIT 1;

  IF v_case IS NULL THEN
    INSERT INTO public.contractor_qualification_cases (
      tenant_id, organization_id, client_id, project_id, template_id,
      scope_type, risk_tier, engagement_type, certificate_holder_name,
      certificate_holder_address, additional_insured_name, insurance_instructions, created_by
    ) VALUES (
      v_tenant, p_organization_id, p_client_id, p_project_id, v_template,
      v_scope, p_risk_tier, p_engagement_type,
      nullif(btrim(p_certificate_holder_name), ''),
      nullif(btrim(p_certificate_holder_address), ''),
      nullif(btrim(p_additional_insured_name), ''),
      nullif(btrim(p_insurance_instructions), ''), auth.uid()
    ) RETURNING id INTO v_case;

    INSERT INTO public.contractor_case_requirements (
      tenant_id, case_id, source_item_id, requirement_code, title, description,
      category, gate_type, required, legally_required, verification_required,
      expiration_required, instructions, sort_order, response_type, applies_to
    )
    SELECT tenant_id, v_case, id,
      requirement_code, title, description, category, gate_type, required, legally_required,
      verification_required, expiration_required, instructions, sort_order,
      response_type, applies_to
    FROM public.contractor_requirement_items
    WHERE template_id = v_template
      AND applies_to IN ('both', p_engagement_type)
    ORDER BY sort_order;

    INSERT INTO public.contractor_activity_log (
      tenant_id, case_id, organization_id, actor_type, actor_user_id,
      action, entity_type, entity_id, details
    ) VALUES (
      v_tenant, v_case, p_organization_id, 'staff', auth.uid(),
      'qualification_created', 'qualification_case', v_case,
      jsonb_build_object('engagement_type', p_engagement_type)
    );
  ELSE
    UPDATE public.contractor_qualification_cases SET
      certificate_holder_name = COALESCE(nullif(btrim(p_certificate_holder_name), ''), certificate_holder_name),
      certificate_holder_address = COALESCE(nullif(btrim(p_certificate_holder_address), ''), certificate_holder_address),
      additional_insured_name = COALESCE(nullif(btrim(p_additional_insured_name), ''), additional_insured_name),
      insurance_instructions = COALESCE(nullif(btrim(p_insurance_instructions), ''), insurance_instructions),
      updated_at = now()
    WHERE id = v_case;
  END IF;

  IF p_project_id IS NOT NULL THEN
    INSERT INTO public.contractor_project_assignments (
      tenant_id, project_id, organization_id, case_id, trade_scope, created_by
    ) VALUES (
      v_tenant, p_project_id, p_organization_id, v_case,
      CASE WHEN p_engagement_type = 'consultant' THEN 'Professional services' ELSE 'Contractor services' END,
      auth.uid()
    ) ON CONFLICT (project_id, organization_id) DO UPDATE SET case_id = EXCLUDED.case_id;
  END IF;

  RETURN v_case;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_contractor_qualification_case(uuid,uuid,uuid,text,text,text,text,text,text) TO authenticated;

COMMIT;
