BEGIN;

ALTER TABLE public.contractor_notices_to_proceed
  ADD COLUMN IF NOT EXISTS readiness_waived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS readiness_waiver_reason text,
  ADD COLUMN IF NOT EXISTS readiness_waived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS readiness_waived_at timestamptz;

CREATE TABLE IF NOT EXISTS public.contractor_payment_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  legal_name text,
  dba_name text,
  tax_classification text CHECK (tax_classification IS NULL OR tax_classification IN ('individual','c_corp','s_corp','partnership','llc','trust_estate','other')),
  tax_id_last4 text CHECK (tax_id_last4 IS NULL OR tax_id_last4 ~ '^[0-9]{4}$'),
  w9_status text NOT NULL DEFAULT 'not_collected' CHECK (w9_status IN ('not_collected','requested','received','verified','needs_update')),
  remittance_email text,
  remittance_phone text,
  remittance_address text,
  bank_name text,
  bank_account_type text CHECK (bank_account_type IS NULL OR bank_account_type IN ('checking','savings','other')),
  bank_routing_last4 text CHECK (bank_routing_last4 IS NULL OR bank_routing_last4 ~ '^[0-9]{4}$'),
  bank_account_last4 text CHECK (bank_account_last4 IS NULL OR bank_account_last4 ~ '^[0-9]{4}$'),
  payment_method text NOT NULL DEFAULT 'manual_check' CHECK (payment_method IN ('manual_check','ach_pending','ach_verified','wire_pending','wire_verified','external_provider')),
  provider_name text,
  provider_connection_id text,
  notes text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, organization_id)
);

ALTER TABLE public.contractor_payment_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contractor_payment_profiles_read ON public.contractor_payment_profiles;
CREATE POLICY contractor_payment_profiles_read ON public.contractor_payment_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contractor_qualification_cases c
      WHERE c.tenant_id = contractor_payment_profiles.tenant_id
        AND c.organization_id = contractor_payment_profiles.organization_id
        AND public.can_view_contractor_case(c.id)
    )
  );

DROP POLICY IF EXISTS contractor_payment_profiles_manage ON public.contractor_payment_profiles;
CREATE POLICY contractor_payment_profiles_manage ON public.contractor_payment_profiles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contractor_qualification_cases c
      WHERE c.tenant_id = contractor_payment_profiles.tenant_id
        AND c.organization_id = contractor_payment_profiles.organization_id
        AND public.can_manage_contractor_case(c.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contractor_qualification_cases c
      WHERE c.tenant_id = contractor_payment_profiles.tenant_id
        AND c.organization_id = contractor_payment_profiles.organization_id
        AND public.can_manage_contractor_case(c.id)
    )
  );

CREATE OR REPLACE FUNCTION public.save_contractor_payment_profile(p_case_id uuid, p_profile jsonb)
RETURNS public.contractor_payment_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.contractor_qualification_cases%ROWTYPE;
  result public.contractor_payment_profiles%ROWTYPE;
  v_payment_method text := COALESCE(NULLIF(p_profile->>'payment_method',''),'manual_check');
  v_w9_status text := COALESCE(NULLIF(p_profile->>'w9_status',''),'not_collected');
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_contractor_case(p_case_id) THEN
    RAISE EXCEPTION 'Manager access is required';
  END IF;
  SELECT * INTO c FROM public.contractor_qualification_cases WHERE id = p_case_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Contractor readiness case not found'; END IF;
  IF v_payment_method NOT IN ('manual_check','ach_pending','ach_verified','wire_pending','wire_verified','external_provider') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;
  IF v_w9_status NOT IN ('not_collected','requested','received','verified','needs_update') THEN
    RAISE EXCEPTION 'Invalid W-9 status';
  END IF;

  INSERT INTO public.contractor_payment_profiles (
    tenant_id, organization_id, legal_name, dba_name, tax_classification, tax_id_last4,
    w9_status, remittance_email, remittance_phone, remittance_address,
    bank_name, bank_account_type, bank_routing_last4, bank_account_last4,
    payment_method, provider_name, provider_connection_id, notes, verified_by,
    verified_at, created_by, updated_at
  )
  VALUES (
    c.tenant_id, c.organization_id, NULLIF(btrim(p_profile->>'legal_name'),''),
    NULLIF(btrim(p_profile->>'dba_name'),''), NULLIF(p_profile->>'tax_classification',''),
    NULLIF(regexp_replace(COALESCE(p_profile->>'tax_id_last4',''), '\D', '', 'g'),''),
    v_w9_status, NULLIF(lower(btrim(p_profile->>'remittance_email')),''),
    NULLIF(btrim(p_profile->>'remittance_phone'),''), NULLIF(btrim(p_profile->>'remittance_address'),''),
    NULLIF(btrim(p_profile->>'bank_name'),''), NULLIF(p_profile->>'bank_account_type',''),
    NULLIF(right(regexp_replace(COALESCE(p_profile->>'bank_routing_last4',''), '\D', '', 'g'), 4),''),
    NULLIF(right(regexp_replace(COALESCE(p_profile->>'bank_account_last4',''), '\D', '', 'g'), 4),''),
    v_payment_method, NULLIF(btrim(p_profile->>'provider_name'),''),
    NULLIF(btrim(p_profile->>'provider_connection_id'),''), NULLIF(btrim(p_profile->>'notes'),''),
    CASE WHEN v_payment_method IN ('ach_verified','wire_verified') OR v_w9_status = 'verified' THEN auth.uid() ELSE NULL END,
    CASE WHEN v_payment_method IN ('ach_verified','wire_verified') OR v_w9_status = 'verified' THEN now() ELSE NULL END,
    auth.uid(), now()
  )
  ON CONFLICT (tenant_id, organization_id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    dba_name = EXCLUDED.dba_name,
    tax_classification = EXCLUDED.tax_classification,
    tax_id_last4 = EXCLUDED.tax_id_last4,
    w9_status = EXCLUDED.w9_status,
    remittance_email = EXCLUDED.remittance_email,
    remittance_phone = EXCLUDED.remittance_phone,
    remittance_address = EXCLUDED.remittance_address,
    bank_name = EXCLUDED.bank_name,
    bank_account_type = EXCLUDED.bank_account_type,
    bank_routing_last4 = EXCLUDED.bank_routing_last4,
    bank_account_last4 = EXCLUDED.bank_account_last4,
    payment_method = EXCLUDED.payment_method,
    provider_name = EXCLUDED.provider_name,
    provider_connection_id = EXCLUDED.provider_connection_id,
    notes = EXCLUDED.notes,
    verified_by = EXCLUDED.verified_by,
    verified_at = EXCLUDED.verified_at,
    updated_at = now()
  RETURNING * INTO result;

  INSERT INTO public.contractor_activity_log(tenant_id,case_id,actor_type,actor_user_id,action,entity_id,details)
  VALUES(c.tenant_id,c.id,'staff',auth.uid(),'contractor_payment_profile_saved',result.id,
    jsonb_build_object('payment_method',result.payment_method,'w9_status',result.w9_status,'bank_account_last4',result.bank_account_last4));

  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.save_contractor_ntp(p_case_id uuid, p_draft jsonb, p_issue boolean DEFAULT false)
RETURNS public.contractor_notices_to_proceed LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.contractor_qualification_cases%ROWTYPE; n public.contractor_notices_to_proceed%ROWTYPE;
  brand jsonb; company_name text; project_name text; client_name text; project_status text;
  v_readiness_waived boolean := COALESCE((p_draft->>'readiness_waived')::boolean,false);
  v_readiness_waiver_reason text := btrim(COALESCE(p_draft->>'readiness_waiver_reason',''));
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_contractor_case(p_case_id) THEN RAISE EXCEPTION 'Manager access is required'; END IF;
  SELECT * INTO c FROM public.contractor_qualification_cases WHERE id = p_case_id FOR UPDATE;
  IF c.project_id IS NULL THEN RAISE EXCEPTION 'Create a project qualification before issuing a Notice to Proceed'; END IF;
  SELECT * INTO n FROM public.contractor_notices_to_proceed WHERE case_id = p_case_id FOR UPDATE;
  IF n.status = 'issued' THEN RAISE EXCEPTION 'The issued notice is immutable. Use project correspondence for amendments'; END IF;
  INSERT INTO public.contractor_notices_to_proceed(case_id,tenant_id,project_id,organization_id)
  VALUES(c.id,c.tenant_id,c.project_id,c.organization_id) ON CONFLICT(case_id) DO NOTHING;
  UPDATE public.contractor_notices_to_proceed SET
    agreement_reference = COALESCE(p_draft->>'agreement_reference',''),
    agreement_approved_on = nullif(p_draft->>'agreement_approved_on','')::date,
    agreement_confirmed = COALESCE((p_draft->>'agreement_confirmed')::boolean,false),
    commitment_id = nullif(p_draft->>'commitment_id','')::uuid,
    scope_of_work = COALESCE(p_draft->>'scope_of_work',''),
    start_date = nullif(p_draft->>'start_date','')::date,
    completion_date = nullif(p_draft->>'completion_date','')::date,
    budget_cents = nullif(p_draft->>'budget_cents','')::bigint,
    prerequisites_confirmed = COALESCE((p_draft->>'prerequisites_confirmed')::boolean,false),
    instructions = COALESCE(p_draft->>'instructions',''),
    recipient_email = lower(btrim(COALESCE(p_draft->>'recipient_email',''))),
    cc_emails = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_draft->'cc_emails','[]'))),
    bcc_emails = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_draft->'bcc_emails','[]'))),
    readiness_waived = v_readiness_waived,
    readiness_waiver_reason = NULLIF(v_readiness_waiver_reason,''),
    readiness_waived_by = CASE WHEN v_readiness_waived THEN COALESCE(readiness_waived_by, auth.uid()) ELSE NULL END,
    readiness_waived_at = CASE WHEN v_readiness_waived THEN COALESCE(readiness_waived_at, now()) ELSE NULL END,
    updated_at = now()
  WHERE case_id = c.id RETURNING * INTO n;
  IF p_issue THEN
    PERFORM public.recompute_contractor_readiness(c.id);
    SELECT * INTO c FROM public.contractor_qualification_cases WHERE id = c.id;
    IF v_readiness_waived AND char_length(v_readiness_waiver_reason) < 12 THEN
      RAISE EXCEPTION 'Document the management waiver reason before issuing the notice';
    END IF;
    IF NOT v_readiness_waived AND (c.status <> 'qualified' OR NOT c.work_ready OR NOT c.contract_ready) THEN
      RAISE EXCEPTION 'Complete onboarding review before issuing the notice';
    END IF;
    IF NOT v_readiness_waived AND EXISTS(SELECT 1 FROM public.contractor_case_requirements WHERE case_id = c.id AND required AND
      (status NOT IN ('verified','not_applicable') OR prior_approval_valid_until < current_date)) THEN
      RAISE EXCEPTION 'Required qualification evidence is incomplete or expired';
    END IF;
    IF NOT n.agreement_confirmed OR btrim(n.agreement_reference) = '' OR n.agreement_approved_on IS NULL OR n.agreement_approved_on > current_date THEN
      RAISE EXCEPTION 'Confirm the approved contract or proposal and its approval date';
    END IF;
    IF n.commitment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.commitments WHERE id = n.commitment_id
      AND tenant_id = c.tenant_id AND project_id = c.project_id AND vendor_org_id = c.organization_id
      AND status IN ('approved','executed')) THEN RAISE EXCEPTION 'The linked agreement must be approved for this company and project'; END IF;
    IF btrim(n.scope_of_work) = '' THEN RAISE EXCEPTION 'Define the authorized scope'; END IF;
    IF n.start_date IS NULL OR n.completion_date IS NULL OR n.completion_date < n.start_date THEN RAISE EXCEPTION 'Confirm a valid start and completion date'; END IF;
    IF n.budget_cents IS NULL THEN RAISE EXCEPTION 'Confirm the authorized budget'; END IF;
    IF NOT n.prerequisites_confirmed THEN RAISE EXCEPTION 'Confirm site access, permits and other applicable prerequisites'; END IF;
    IF n.recipient_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR EXISTS(
      SELECT 1 FROM unnest(n.cc_emails || n.bcc_emails) e WHERE e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ) THEN RAISE EXCEPTION 'Enter valid recipient email addresses'; END IF;
    SELECT p.name,p.status::text,cl.name INTO project_name,project_status,client_name FROM public.projects p
      LEFT JOIN public.clients cl ON cl.id = p.client_id WHERE p.id = c.project_id;
    IF project_status IN ('closed','completed','cancelled','archived') THEN RAISE EXCEPTION 'Reopen this project before issuing a notice'; END IF;
    SELECT name INTO company_name FROM public.organizations WHERE id = c.organization_id;
    SELECT to_jsonb(b) INTO brand FROM public.company_branding b WHERE b.workspace_id = c.tenant_id ORDER BY b.updated_at DESC LIMIT 1;
    UPDATE public.contractor_notices_to_proceed SET status = 'issued',issued_at = now(),issued_by = auth.uid(),
      snapshot = jsonb_build_object('company_name',company_name,'project_name',project_name,'client_name',client_name,
        'branding',COALESCE(brand,jsonb_build_object('company_name','APAS Consulting')),'engagement_type',c.engagement_type,
        'readiness_score',c.score,'readiness_waived',v_readiness_waived,'readiness_waiver_reason',NULLIF(v_readiness_waiver_reason,''),
        'agreement_confirmation_by',auth.uid()) WHERE id = n.id RETURNING * INTO n;
  END IF;
  INSERT INTO public.contractor_activity_log(tenant_id,case_id,actor_type,actor_user_id,action,entity_id,details)
  VALUES(c.tenant_id,c.id,'staff',auth.uid(),CASE WHEN p_issue THEN 'notice_to_proceed_issued' ELSE 'notice_to_proceed_draft_saved' END,n.id,
    jsonb_build_object('readiness_waived',v_readiness_waived));
  RETURN n;
END $$;

GRANT SELECT ON public.contractor_payment_profiles TO authenticated;
GRANT ALL ON public.contractor_payment_profiles TO service_role;
REVOKE ALL ON FUNCTION public.save_contractor_payment_profile(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_contractor_payment_profile(uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.save_contractor_ntp(uuid,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_contractor_ntp(uuid,jsonb,boolean) TO authenticated;

COMMIT;
