BEGIN;

-- Explicit read privileges are required in clean deployments as well as hosted
-- projects. Existing case-scoped RLS still determines which rows are visible.
GRANT SELECT ON public.contractor_qualification_cases, public.contractor_case_requirements TO authenticated;

ALTER TABLE public.contractor_qualification_cases
  ADD COLUMN request_company_profile boolean NOT NULL DEFAULT true,
  ADD COLUMN request_portfolio boolean NOT NULL DEFAULT true;
ALTER TABLE public.contractor_case_requirements
  ADD COLUMN portal_requested boolean NOT NULL DEFAULT true,
  ADD COLUMN prior_approval_reference text,
  ADD COLUMN prior_approval_valid_until date;

-- The invitation picker needs consultant defaults even in a new workspace.
ALTER FUNCTION public.ensure_default_contractor_template() RENAME TO ensure_default_contractor_template_base;
REVOKE ALL ON FUNCTION public.ensure_default_contractor_template_base() FROM PUBLIC, authenticated, anon;
CREATE FUNCTION public.ensure_default_contractor_template() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t uuid;
BEGIN
  t := public.ensure_default_contractor_template_base();
  UPDATE public.contractor_requirement_items SET applies_to = 'contractor'
  WHERE template_id = t AND requirement_code IN ('trade_license','auto_liability','safety_program') AND applies_to = 'both';
  INSERT INTO public.contractor_requirement_items(tenant_id,template_id,requirement_code,title,category,gate_type,required,legally_required,verification_required,expiration_required,response_type,applies_to,sort_order)
  SELECT tenant_id,t,'professional_liability','Professional liability insurance','insurance','work',true,false,true,true,'document','consultant',45
  FROM public.contractor_requirement_templates WHERE id = t ON CONFLICT(template_id,requirement_code) DO NOTHING;
  INSERT INTO public.contractor_requirement_items(tenant_id,template_id,requirement_code,title,category,gate_type,required,legally_required,verification_required,expiration_required,response_type,applies_to,sort_order)
  SELECT tenant_id,t,'professional_license','Applicable professional or business license','license','work',true,true,true,true,'document','consultant',20
  FROM public.contractor_requirement_templates WHERE id = t ON CONFLICT(template_id,requirement_code) DO NOTHING;
  RETURN t;
END $$;
REVOKE ALL ON FUNCTION public.ensure_default_contractor_template() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_contractor_template() TO authenticated;

CREATE FUNCTION public.clear_prior_approval_on_new_evidence() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.current_document_id IS DISTINCT FROM OLD.current_document_id AND NEW.current_document_id IS NOT NULL THEN
    NEW.prior_approval_reference := NULL; NEW.prior_approval_valid_until := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER contractor_new_evidence BEFORE UPDATE OF current_document_id ON public.contractor_case_requirements
FOR EACH ROW EXECUTE FUNCTION public.clear_prior_approval_on_new_evidence();

CREATE FUNCTION public.configure_contractor_request(
  p_case_id uuid, p_codes text[], p_company_profile boolean, p_portfolio boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_contractor_case(p_case_id) THEN
    RAISE EXCEPTION 'Manager access is required';
  END IF;
  IF p_codes IS NULL THEN RAISE EXCEPTION 'Select the requested checklist items'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_codes) code WHERE NOT EXISTS (
    SELECT 1 FROM public.contractor_case_requirements WHERE case_id = p_case_id AND requirement_code = code
  )) THEN RAISE EXCEPTION 'A selected item does not belong to this checklist'; END IF;
  UPDATE public.contractor_case_requirements SET portal_requested = requirement_code = ANY(p_codes), updated_at = now()
  WHERE case_id = p_case_id;
  UPDATE public.contractor_qualification_cases SET request_company_profile = p_company_profile,
    request_portfolio = p_portfolio, updated_at = now() WHERE id = p_case_id;
  INSERT INTO public.contractor_activity_log(tenant_id,case_id,actor_type,actor_user_id,action,details)
  SELECT tenant_id,id,'staff',auth.uid(),'request_tailored',jsonb_build_object('codes',p_codes,'company_profile',p_company_profile,'portfolio',p_portfolio)
  FROM public.contractor_qualification_cases WHERE id = p_case_id;
END $$;

CREATE FUNCTION public.record_contractor_prior_approval(p_requirement_id uuid, p_reference text, p_valid_until date DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.contractor_case_requirements%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.contractor_case_requirements WHERE id = p_requirement_id FOR UPDATE;
  IF auth.uid() IS NULL OR NOT public.can_manage_contractor_case(r.case_id) THEN RAISE EXCEPTION 'Manager access is required'; END IF;
  IF COALESCE(btrim(p_reference),'') = '' THEN RAISE EXCEPTION 'Enter the existing approval or evidence reference'; END IF;
  IF (r.expiration_required AND p_valid_until IS NULL) OR p_valid_until < current_date THEN
    RAISE EXCEPTION 'A current validity date is required';
  END IF;
  UPDATE public.contractor_case_requirements SET prior_approval_reference = btrim(p_reference),
    prior_approval_valid_until = p_valid_until, status = 'verified', portal_requested = false, current_document_id = NULL,
    reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now() WHERE id = r.id;
  INSERT INTO public.contractor_activity_log(tenant_id,case_id,actor_type,actor_user_id,action,entity_id,details)
  VALUES(r.tenant_id,r.case_id,'staff',auth.uid(),'prior_approval_recorded',r.id,jsonb_build_object('reference',p_reference,'valid_until',p_valid_until));
END $$;

-- Keep prior approval expiry in the same deterministic readiness calculation.
ALTER FUNCTION public.recompute_contractor_readiness(uuid) RENAME TO recompute_contractor_readiness_base;
REVOKE ALL ON FUNCTION public.recompute_contractor_readiness_base(uuid) FROM PUBLIC, authenticated, anon;
CREATE FUNCTION public.recompute_contractor_readiness(p_case_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_manage_contractor_case(p_case_id) THEN RAISE EXCEPTION 'Manager access is required'; END IF;
  UPDATE public.contractor_case_requirements SET status = 'expired', updated_at = now()
  WHERE case_id = p_case_id AND status = 'verified' AND prior_approval_valid_until < current_date;
  PERFORM public.recompute_contractor_readiness_base(p_case_id);
END $$;
REVOKE ALL ON FUNCTION public.recompute_contractor_readiness(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_contractor_readiness(uuid) TO authenticated, service_role;

CREATE TABLE public.contractor_notices_to_proceed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL UNIQUE REFERENCES public.contractor_qualification_cases(id),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued')),
  agreement_reference text NOT NULL DEFAULT '',
  agreement_approved_on date,
  agreement_confirmed boolean NOT NULL DEFAULT false,
  commitment_id uuid REFERENCES public.commitments(id),
  scope_of_work text NOT NULL DEFAULT '',
  start_date date,
  completion_date date,
  budget_cents bigint CHECK(budget_cents >= 0),
  prerequisites_confirmed boolean NOT NULL DEFAULT false,
  instructions text NOT NULL DEFAULT '',
  recipient_email text NOT NULL DEFAULT '',
  cc_emails text[] NOT NULL DEFAULT '{}',
  bcc_emails text[] NOT NULL DEFAULT '{}',
  issued_at timestamptz,
  issued_by uuid REFERENCES auth.users(id),
  snapshot jsonb,
  delivery_status text NOT NULL DEFAULT 'not_sent' CHECK(delivery_status IN ('not_sent','sending','sent','failed')),
  delivery_error text,
  delivery_claimed_at timestamptz,
  email_id text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contractor_notices_to_proceed ENABLE ROW LEVEL SECURITY;
CREATE POLICY ntp_read ON public.contractor_notices_to_proceed FOR SELECT TO authenticated
  USING(public.can_view_contractor_case(case_id));
GRANT SELECT ON public.contractor_notices_to_proceed TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.contractor_notices_to_proceed FROM authenticated,anon;
GRANT ALL ON public.contractor_notices_to_proceed TO service_role;

CREATE FUNCTION public.save_contractor_ntp(p_case_id uuid, p_draft jsonb, p_issue boolean DEFAULT false)
RETURNS public.contractor_notices_to_proceed LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.contractor_qualification_cases%ROWTYPE; n public.contractor_notices_to_proceed%ROWTYPE;
  brand jsonb; company_name text; project_name text; client_name text; project_status text;
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
    bcc_emails = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_draft->'bcc_emails','[]'))), updated_at = now()
  WHERE case_id = c.id RETURNING * INTO n;
  IF p_issue THEN
    PERFORM public.recompute_contractor_readiness(c.id);
    SELECT * INTO c FROM public.contractor_qualification_cases WHERE id = c.id;
    IF c.status <> 'qualified' OR NOT c.work_ready OR NOT c.contract_ready THEN
      RAISE EXCEPTION 'Complete onboarding review before issuing the notice';
    END IF;
    IF EXISTS(SELECT 1 FROM public.contractor_case_requirements WHERE case_id = c.id AND required AND
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
        'readiness_score',c.score,'agreement_confirmation_by',auth.uid()) WHERE id = n.id RETURNING * INTO n;
  END IF;
  INSERT INTO public.contractor_activity_log(tenant_id,case_id,actor_type,actor_user_id,action,entity_id)
  VALUES(c.tenant_id,c.id,'staff',auth.uid(),CASE WHEN p_issue THEN 'notice_to_proceed_issued' ELSE 'notice_to_proceed_draft_saved' END,n.id);
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.configure_contractor_request(uuid,text[],boolean,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_contractor_prior_approval(uuid,text,date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_contractor_ntp(uuid,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configure_contractor_request(uuid,text[],boolean,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_contractor_prior_approval(uuid,text,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_contractor_ntp(uuid,jsonb,boolean) TO authenticated;
COMMIT;
