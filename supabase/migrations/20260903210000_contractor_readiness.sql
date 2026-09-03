-- Contractor Readiness
-- Tenant-safe contractor qualification, document control, expiry monitoring,
-- project gates, external magic-link intake, and a complete audit trail.

BEGIN;

ALTER TABLE public.workspace_modules
  ADD COLUMN IF NOT EXISTS contractor_readiness_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_contractor_readiness boolean NOT NULL DEFAULT true;

-- This workspace commissioned the module. Future tenants remain opt-in.
UPDATE public.workspace_modules wm
SET contractor_readiness_enabled = true,
    platform_contractor_readiness = true
WHERE EXISTS (
  SELECT 1 FROM public.workspaces w
  WHERE w.id = wm.workspace_id
    AND (lower(w.name) LIKE '%apas%' OR lower(w.name) LIKE '%project controls%')
);

CREATE TABLE IF NOT EXISTS public.contractor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dba_name text,
  description text,
  trade_categories text[] NOT NULL DEFAULT '{}',
  service_areas text[] NOT NULL DEFAULT '{}',
  year_established integer CHECK (year_established IS NULL OR year_established BETWEEN 1800 AND 2200),
  employee_count integer CHECK (employee_count IS NULL OR employee_count >= 0),
  annual_capacity_cents bigint CHECK (annual_capacity_cents IS NULL OR annual_capacity_cents >= 0),
  largest_project_cents bigint CHECK (largest_project_cents IS NULL OR largest_project_cents >= 0),
  portfolio_url text,
  emergency_phone text,
  profile_status text NOT NULL DEFAULT 'draft'
    CHECK (profile_status IN ('draft','active','inactive','suspended')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.contractor_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'primary'
    CHECK (role IN ('primary','owner','estimating','safety','accounting','insurance_broker','other')),
  is_primary boolean NOT NULL DEFAULT false,
  can_manage_documents boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contractor_contacts_primary_unique
  ON public.contractor_contacts(organization_id) WHERE is_primary;

CREATE TABLE IF NOT EXISTS public.contractor_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  client_name text,
  trade_scope text,
  location text,
  completed_on date,
  contract_value_cents bigint CHECK (contract_value_cents IS NULL OR contract_value_cents >= 0),
  reference_name text,
  reference_email text,
  reference_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contractor_requirement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trade_categories text[] NOT NULL DEFAULT '{}',
  risk_tier text NOT NULL DEFAULT 'standard'
    CHECK (risk_tier IN ('low','standard','high','critical')),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contractor_template_default_unique
  ON public.contractor_requirement_templates(tenant_id) WHERE is_default AND is_active;

CREATE TABLE IF NOT EXISTS public.contractor_requirement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.contractor_requirement_templates(id) ON DELETE CASCADE,
  requirement_code text NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN (
    'identity','tax','license','insurance','safety','financial','experience','agreement','other'
  )),
  gate_type text NOT NULL DEFAULT 'informational'
    CHECK (gate_type IN ('work','contract','payment','informational')),
  required boolean NOT NULL DEFAULT true,
  legally_required boolean NOT NULL DEFAULT false,
  verification_required boolean NOT NULL DEFAULT true,
  expiration_required boolean NOT NULL DEFAULT false,
  default_valid_months integer CHECK (default_valid_months IS NULL OR default_valid_months > 0),
  instructions text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, requirement_code)
);

CREATE TABLE IF NOT EXISTS public.contractor_qualification_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.contractor_requirement_templates(id) ON DELETE SET NULL,
  scope_type text NOT NULL DEFAULT 'workspace'
    CHECK (scope_type IN ('workspace','client','project')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','invited','in_progress','under_review','correction_needed',
    'conditionally_qualified','qualified','blocked','suspended','rejected'
  )),
  risk_tier text NOT NULL DEFAULT 'standard'
    CHECK (risk_tier IN ('low','standard','high','critical')),
  score numeric(5,2) NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  work_ready boolean NOT NULL DEFAULT false,
  contract_ready boolean NOT NULL DEFAULT false,
  payment_ready boolean NOT NULL DEFAULT false,
  invited_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contractor_case_scope_consistency CHECK (
    (scope_type = 'workspace' AND client_id IS NULL AND project_id IS NULL)
    OR (scope_type = 'client' AND client_id IS NOT NULL AND project_id IS NULL)
    OR (scope_type = 'project' AND project_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS contractor_case_workspace_unique
  ON public.contractor_qualification_cases(tenant_id, organization_id)
  WHERE scope_type = 'workspace';
CREATE UNIQUE INDEX IF NOT EXISTS contractor_case_client_unique
  ON public.contractor_qualification_cases(tenant_id, organization_id, client_id)
  WHERE scope_type = 'client';
CREATE UNIQUE INDEX IF NOT EXISTS contractor_case_project_unique
  ON public.contractor_qualification_cases(tenant_id, organization_id, project_id)
  WHERE scope_type = 'project';

CREATE TABLE IF NOT EXISTS public.contractor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.contractor_qualification_cases(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  title text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint CHECK (file_size IS NULL OR file_size >= 0),
  issue_date date,
  expiration_date date,
  identifier text,
  issuing_authority text,
  coverage_amount_cents bigint CHECK (coverage_amount_cents IS NULL OR coverage_amount_cents >= 0),
  verification_status text NOT NULL DEFAULT 'uploaded'
    CHECK (verification_status IN ('uploaded','under_review','verified','rejected','superseded','expired')),
  verification_source text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  rejection_reason text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_email text,
  source text NOT NULL DEFAULT 'staff' CHECK (source IN ('staff','contractor','broker','import')),
  ai_extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_reviewed_at timestamptz,
  supersedes_document_id uuid REFERENCES public.contractor_documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contractor_document_dates CHECK (
    expiration_date IS NULL OR issue_date IS NULL OR expiration_date >= issue_date
  )
);

CREATE TABLE IF NOT EXISTS public.contractor_case_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.contractor_qualification_cases(id) ON DELETE CASCADE,
  source_item_id uuid REFERENCES public.contractor_requirement_items(id) ON DELETE SET NULL,
  requirement_code text NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  gate_type text NOT NULL CHECK (gate_type IN ('work','contract','payment','informational')),
  required boolean NOT NULL DEFAULT true,
  legally_required boolean NOT NULL DEFAULT false,
  verification_required boolean NOT NULL DEFAULT true,
  expiration_required boolean NOT NULL DEFAULT false,
  instructions text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'missing' CHECK (status IN (
    'missing','requested','submitted','under_review','needs_correction',
    'verified','waived','not_applicable','expired'
  )),
  current_document_id uuid REFERENCES public.contractor_documents(id) ON DELETE SET NULL,
  due_date date,
  waived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  waived_at timestamptz,
  waiver_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, requirement_code),
  CONSTRAINT contractor_legal_waiver_prohibited CHECK (
    NOT (legally_required AND status IN ('waived','not_applicable'))
  )
);

CREATE TABLE IF NOT EXISTS public.contractor_requirement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.contractor_case_requirements(id) ON DELETE CASCADE,
  author_type text NOT NULL CHECK (author_type IN ('staff','contractor','broker','system')),
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  author_email text,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contractor_readiness_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  scope_type text NOT NULL DEFAULT 'workspace' CHECK (scope_type IN ('workspace','client','project')),
  default_template_id uuid REFERENCES public.contractor_requirement_templates(id) ON DELETE SET NULL,
  enforce_work_gate boolean NOT NULL DEFAULT false,
  enforce_contract_gate boolean NOT NULL DEFAULT false,
  enforce_payment_gate boolean NOT NULL DEFAULT false,
  reminder_days integer[] NOT NULL DEFAULT ARRAY[90,60,30,7,0],
  notify_emails text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contractor_policy_scope_consistency CHECK (
    (scope_type = 'workspace' AND client_id IS NULL AND project_id IS NULL)
    OR (scope_type = 'client' AND client_id IS NOT NULL AND project_id IS NULL)
    OR (scope_type = 'project' AND project_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS contractor_policy_workspace_unique
  ON public.contractor_readiness_policies(tenant_id) WHERE scope_type = 'workspace';
CREATE UNIQUE INDEX IF NOT EXISTS contractor_policy_client_unique
  ON public.contractor_readiness_policies(tenant_id, client_id) WHERE scope_type = 'client';
CREATE UNIQUE INDEX IF NOT EXISTS contractor_policy_project_unique
  ON public.contractor_readiness_policies(tenant_id, project_id) WHERE scope_type = 'project';

CREATE TABLE IF NOT EXISTS public.contractor_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.contractor_qualification_cases(id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.contractor_case_requirements(id) ON DELETE CASCADE,
  reason text NOT NULL,
  expires_at timestamptz NOT NULL,
  approved_by uuid NOT NULL REFERENCES auth.users(id),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contractor_exception_future_expiration CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS public.contractor_portal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.contractor_qualification_cases(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contractor_contacts(id) ON DELETE SET NULL,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'contractor' CHECK (role IN ('contractor','broker')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at timestamptz,
  last_used_at timestamptz,
  use_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contractor_project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.contractor_qualification_cases(id) ON DELETE SET NULL,
  trade_scope text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','cleared','active','blocked','complete','cancelled')),
  start_date date,
  end_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.contractor_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.contractor_qualification_cases(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.contractor_case_requirements(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  reminder_kind text NOT NULL CHECK (reminder_kind IN ('missing','correction','expiring','expired','review_due')),
  days_before integer,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','skipped')),
  provider_id text,
  error_message text,
  dedupe_key text NOT NULL UNIQUE,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contractor_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.contractor_qualification_cases(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_type text NOT NULL CHECK (actor_type IN ('staff','contractor','broker','system')),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contractor_cases_tenant_status_idx
  ON public.contractor_qualification_cases(tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS contractor_cases_project_idx
  ON public.contractor_qualification_cases(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS contractor_documents_org_expiry_idx
  ON public.contractor_documents(organization_id, expiration_date);
CREATE INDEX IF NOT EXISTS contractor_requirements_case_idx
  ON public.contractor_case_requirements(case_id, sort_order);
CREATE INDEX IF NOT EXISTS contractor_activity_case_idx
  ON public.contractor_activity_log(case_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.tg_reject_legal_contractor_exception()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.contractor_case_requirements
    WHERE id = NEW.requirement_id AND legally_required
  ) THEN
    RAISE EXCEPTION 'Legally required contractor controls cannot receive an exception';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_exception_legal_guard ON public.contractor_exceptions;
CREATE TRIGGER contractor_exception_legal_guard
  BEFORE INSERT OR UPDATE OF requirement_id ON public.contractor_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_reject_legal_contractor_exception();

-- Cross-table tenant consistency is enforced below the UI and edge layer.
-- This prevents a service integration or future client from accidentally
-- attaching one workspace's contractor record to another workspace's project.
CREATE OR REPLACE FUNCTION public.tg_validate_contractor_case_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_org_tenant uuid;
  v_client_tenant uuid;
  v_project_tenant uuid;
  v_project_client uuid;
BEGIN
  SELECT tenant_id INTO v_org_tenant FROM public.organizations WHERE id = NEW.organization_id;
  IF v_org_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'Contractor organization must belong to the qualification workspace';
  END IF;
  IF NEW.client_id IS NOT NULL THEN
    SELECT workspace_id INTO v_client_tenant FROM public.clients WHERE id = NEW.client_id;
    IF v_client_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'Qualification client must belong to the qualification workspace';
    END IF;
  END IF;
  IF NEW.project_id IS NOT NULL THEN
    SELECT workspace_id, client_id INTO v_project_tenant, v_project_client
    FROM public.projects WHERE id = NEW.project_id;
    IF v_project_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'Qualification project must belong to the qualification workspace';
    END IF;
    IF NEW.client_id IS DISTINCT FROM v_project_client THEN
      RAISE EXCEPTION 'Qualification client must match the project client';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_case_scope_integrity ON public.contractor_qualification_cases;
CREATE TRIGGER contractor_case_scope_integrity
  BEFORE INSERT OR UPDATE OF tenant_id, organization_id, client_id, project_id
  ON public.contractor_qualification_cases
  FOR EACH ROW EXECUTE FUNCTION public.tg_validate_contractor_case_scope();

CREATE OR REPLACE FUNCTION public.tg_validate_contractor_document_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_case_tenant uuid;
  v_case_org uuid;
BEGIN
  IF NEW.case_id IS NULL THEN RETURN NEW; END IF;
  SELECT tenant_id, organization_id INTO v_case_tenant, v_case_org
  FROM public.contractor_qualification_cases WHERE id = NEW.case_id;
  IF v_case_tenant IS DISTINCT FROM NEW.tenant_id OR v_case_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Contractor document must match its qualification workspace and company';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_document_scope_integrity ON public.contractor_documents;
CREATE TRIGGER contractor_document_scope_integrity
  BEFORE INSERT OR UPDATE OF tenant_id, organization_id, case_id
  ON public.contractor_documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_validate_contractor_document_scope();

CREATE OR REPLACE FUNCTION public.tg_validate_contractor_assignment_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_project_tenant uuid;
  v_org_tenant uuid;
  v_case_tenant uuid;
  v_case_project uuid;
  v_case_org uuid;
BEGIN
  SELECT workspace_id INTO v_project_tenant FROM public.projects WHERE id = NEW.project_id;
  SELECT tenant_id INTO v_org_tenant FROM public.organizations WHERE id = NEW.organization_id;
  IF v_project_tenant IS DISTINCT FROM NEW.tenant_id OR v_org_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'Contractor assignment must stay inside one workspace';
  END IF;
  IF NEW.case_id IS NOT NULL THEN
    SELECT tenant_id, project_id, organization_id INTO v_case_tenant, v_case_project, v_case_org
    FROM public.contractor_qualification_cases WHERE id = NEW.case_id;
    IF v_case_tenant IS DISTINCT FROM NEW.tenant_id
       OR v_case_org IS DISTINCT FROM NEW.organization_id
       OR v_case_project IS DISTINCT FROM NEW.project_id THEN
      RAISE EXCEPTION 'Contractor assignment must match its project qualification case';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_assignment_scope_integrity ON public.contractor_project_assignments;
CREATE TRIGGER contractor_assignment_scope_integrity
  BEFORE INSERT OR UPDATE OF tenant_id, project_id, organization_id, case_id
  ON public.contractor_project_assignments
  FOR EACH ROW EXECUTE FUNCTION public.tg_validate_contractor_assignment_scope();

-- All staff-side tables are tenant isolated. Anonymous access is deliberately
-- absent; the public portal only uses the token-validating edge function.
ALTER TABLE public.contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_requirement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_requirement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_qualification_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_case_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_requirement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_readiness_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_portal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_reminder_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_activity_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_contractor_readiness(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR (
      p_tenant_id = public.current_tenant_id()
      AND public.is_workspace_admin(auth.uid())
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_contractor_readiness(uuid) TO authenticated;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contractor_profiles','contractor_contacts','contractor_portfolio_items',
    'contractor_requirement_templates','contractor_requirement_items',
    'contractor_qualification_cases','contractor_documents',
    'contractor_case_requirements','contractor_requirement_comments',
    'contractor_readiness_policies','contractor_exceptions','contractor_portal_links',
    'contractor_project_assignments','contractor_reminder_log','contractor_activity_log'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_manage', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((public.current_portal_kind() = ''main'' AND tenant_id = public.current_tenant_id()) OR public.is_super_admin())',
      t || '_read', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.can_manage_contractor_readiness(tenant_id)) WITH CHECK (public.can_manage_contractor_readiness(tenant_id))',
      t || '_manage', t
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.can_view_contractor_case(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.contractor_qualification_cases c
    WHERE c.id = p_case_id
      AND c.tenant_id = public.current_tenant_id()
      AND (
        public.is_workspace_admin(auth.uid())
        OR (c.project_id IS NOT NULL AND public.can_access_project(auth.uid(), c.project_id))
        OR (c.client_id IS NOT NULL AND public.is_client_member(auth.uid(), c.client_id))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_contractor_case(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.contractor_qualification_cases c
    WHERE c.id = p_case_id
      AND c.tenant_id = public.current_tenant_id()
      AND (
        public.is_workspace_admin(auth.uid())
        OR (c.project_id IS NOT NULL AND public.effective_project_permission(auth.uid(), c.project_id, 'projects', 'edit'))
        OR (c.client_id IS NOT NULL AND public.can_manage_client_projects(auth.uid(), c.client_id))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_contractor_org(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR public.is_workspace_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.contractor_qualification_cases c
      WHERE c.organization_id = p_organization_id
        AND public.can_manage_contractor_case(c.id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_view_contractor_case(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_contractor_case(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_contractor_org(uuid) TO authenticated;

-- Remove the portfolio-wide read policy from case-scoped/sensitive records.
-- Access below is derived from the case's client or project boundary.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contractor_qualification_cases','contractor_documents','contractor_case_requirements',
    'contractor_requirement_comments','contractor_exceptions','contractor_portal_links',
    'contractor_project_assignments','contractor_reminder_log','contractor_activity_log'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_read', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS contractor_cases_scoped_read ON public.contractor_qualification_cases;
CREATE POLICY contractor_cases_scoped_read ON public.contractor_qualification_cases
  FOR SELECT TO authenticated USING (public.can_view_contractor_case(id));
DROP POLICY IF EXISTS contractor_cases_scoped_manage ON public.contractor_qualification_cases;
CREATE POLICY contractor_cases_scoped_manage ON public.contractor_qualification_cases
  FOR ALL TO authenticated USING (public.can_manage_contractor_case(id))
  WITH CHECK (
    public.can_manage_contractor_readiness(tenant_id)
    OR (project_id IS NOT NULL AND public.effective_project_permission(auth.uid(), project_id, 'projects', 'edit'))
    OR (client_id IS NOT NULL AND public.can_manage_client_projects(auth.uid(), client_id))
  );

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contractor_documents','contractor_case_requirements','contractor_requirement_comments',
    'contractor_exceptions','contractor_portal_links','contractor_project_assignments',
    'contractor_reminder_log','contractor_activity_log'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_case_scope', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.can_manage_contractor_case(case_id)) WITH CHECK (public.can_manage_contractor_case(case_id))',
      t || '_case_scope', t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS contractor_profiles_case_scope ON public.contractor_profiles;
CREATE POLICY contractor_profiles_case_scope ON public.contractor_profiles FOR ALL TO authenticated
  USING (public.can_manage_contractor_org(organization_id))
  WITH CHECK (public.can_manage_contractor_org(organization_id));
DROP POLICY IF EXISTS contractor_contacts_case_scope ON public.contractor_contacts;
CREATE POLICY contractor_contacts_case_scope ON public.contractor_contacts FOR ALL TO authenticated
  USING (public.can_manage_contractor_org(organization_id))
  WITH CHECK (public.can_manage_contractor_org(organization_id));
DROP POLICY IF EXISTS contractor_portfolio_case_scope ON public.contractor_portfolio_items;
CREATE POLICY contractor_portfolio_case_scope ON public.contractor_portfolio_items FOR ALL TO authenticated
  USING (public.can_manage_contractor_org(organization_id))
  WITH CHECK (public.can_manage_contractor_org(organization_id));

-- Private document bucket. Staff may access only their workspace prefix;
-- contractors receive one-time signed upload/download URLs from the edge layer.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contractor-readiness', 'contractor-readiness', false, 15728640,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.contractor_case_id_from_storage_path(p_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_part text := (storage.foldername(p_name))[3];
BEGIN
  IF v_part IS NULL OR v_part !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;
  RETURN v_part::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.contractor_case_id_from_storage_path(text) TO authenticated;

DROP POLICY IF EXISTS contractor_readiness_storage_staff ON storage.objects;
CREATE POLICY contractor_readiness_storage_staff
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'contractor-readiness'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    AND public.current_portal_kind() = 'main'
    AND (
      public.can_manage_contractor_readiness(public.current_tenant_id())
      OR public.can_manage_contractor_case(public.contractor_case_id_from_storage_path(name))
    )
  )
  WITH CHECK (
    bucket_id = 'contractor-readiness'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    AND public.current_portal_kind() = 'main'
    AND (
      public.can_manage_contractor_readiness(public.current_tenant_id())
      OR public.can_manage_contractor_case(public.contractor_case_id_from_storage_path(name))
    )
  );

-- Create the standard baseline only when a workspace first uses the module.
CREATE OR REPLACE FUNCTION public.ensure_default_contractor_template()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_template uuid;
BEGIN
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Workspace context is required'; END IF;
  IF NOT (
    public.can_manage_contractor_readiness(v_tenant)
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'project_manager')
    OR public.has_role(auth.uid(), 'administrator')
  ) THEN RAISE EXCEPTION 'Manager access is required'; END IF;

  SELECT id INTO v_template
  FROM public.contractor_requirement_templates
  WHERE tenant_id = v_tenant AND is_default AND is_active
  LIMIT 1;

  IF v_template IS NULL THEN
    INSERT INTO public.contractor_requirement_templates
      (tenant_id, name, description, risk_tier, is_default, created_by)
    VALUES
      (v_tenant, 'Standard contractor readiness',
       'Baseline identity, tax, license, insurance, safety, experience, and agreement controls.',
       'standard', true, auth.uid())
    RETURNING id INTO v_template;

    INSERT INTO public.contractor_requirement_items
      (tenant_id, template_id, requirement_code, title, description, category,
       gate_type, required, legally_required, verification_required,
       expiration_required, instructions, sort_order)
    VALUES
      (v_tenant,v_template,'w9','Current Form W-9','Signed tax classification and taxpayer identification form.','tax','payment',true,false,true,false,'Upload the current signed form. Tax identifiers remain in the private document vault.',10),
      (v_tenant,v_template,'trade_license','Applicable trade license','License required for the trade and jurisdiction where work will occur.','license','work',true,true,true,true,'Upload the license showing number, issuing authority, and expiration date.',20),
      (v_tenant,v_template,'general_liability','General liability insurance','Current certificate of insurance for commercial general liability.','insurance','work',true,false,true,true,'Upload the certificate and enter its expiration date.',30),
      (v_tenant,v_template,'workers_comp','Workers compensation or valid exemption','Coverage or a legally valid exemption applicable to the work.','insurance','work',true,false,true,true,'Upload current proof of coverage or exemption.',40),
      (v_tenant,v_template,'auto_liability','Commercial auto insurance','Current auto liability evidence when vehicles enter the site.','insurance','work',true,false,true,true,'Upload the certificate and enter its expiration date.',50),
      (v_tenant,v_template,'safety_program','Safety program / recent safety record','Safety program and relevant recent safety performance information.','safety','contract',true,false,true,false,'Upload the current program or safety summary.',60),
      (v_tenant,v_template,'experience','Relevant project experience','Representative completed work and references for the proposed trade.','experience','contract',true,false,false,false,'Add portfolio work or upload a qualifications package.',70),
      (v_tenant,v_template,'vendor_policy','Vendor standards acknowledgement','Signed acknowledgement of project and company vendor requirements.','agreement','contract',true,false,true,false,'Upload the signed acknowledgement.',80);

    INSERT INTO public.contractor_readiness_policies
      (tenant_id, scope_type, default_template_id, created_by)
    VALUES (v_tenant, 'workspace', v_template, auth.uid())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_template;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_default_contractor_template() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_contractor_qualification_case(
  p_organization_id uuid,
  p_client_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_risk_tier text DEFAULT 'standard'
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
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_organization_id AND tenant_id = v_tenant) THEN
    RAISE EXCEPTION 'Contractor organization is outside this workspace';
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

  INSERT INTO public.contractor_profiles (tenant_id, organization_id, profile_status, created_by)
  VALUES (v_tenant, p_organization_id, 'draft', auth.uid())
  ON CONFLICT (tenant_id, organization_id) DO NOTHING;

  SELECT id INTO v_case
  FROM public.contractor_qualification_cases
  WHERE tenant_id = v_tenant AND organization_id = p_organization_id
    AND scope_type = v_scope
    AND (v_scope <> 'client' OR client_id = p_client_id)
    AND (v_scope <> 'project' OR project_id = p_project_id)
  LIMIT 1;

  IF v_case IS NULL THEN
    INSERT INTO public.contractor_qualification_cases
      (tenant_id, organization_id, client_id, project_id, template_id,
       scope_type, risk_tier, created_by)
    VALUES
      (v_tenant, p_organization_id, p_client_id, p_project_id, v_template,
       v_scope, p_risk_tier, auth.uid())
    RETURNING id INTO v_case;

    INSERT INTO public.contractor_case_requirements
      (tenant_id, case_id, source_item_id, requirement_code, title, description,
       category, gate_type, required, legally_required, verification_required,
       expiration_required, instructions, sort_order)
    SELECT tenant_id, v_case, id, requirement_code, title, description,
           category, gate_type, required, legally_required, verification_required,
           expiration_required, instructions, sort_order
    FROM public.contractor_requirement_items
    WHERE template_id = v_template
    ORDER BY sort_order;

    INSERT INTO public.contractor_activity_log
      (tenant_id, case_id, organization_id, actor_type, actor_user_id, action, entity_type, entity_id)
    VALUES
      (v_tenant, v_case, p_organization_id, 'staff', auth.uid(), 'qualification_created', 'qualification_case', v_case);
  END IF;

  IF p_project_id IS NOT NULL THEN
    INSERT INTO public.contractor_project_assignments
      (tenant_id, project_id, organization_id, case_id, created_by)
    VALUES (v_tenant, p_project_id, p_organization_id, v_case, auth.uid())
    ON CONFLICT (project_id, organization_id) DO UPDATE SET case_id = EXCLUDED.case_id;
  END IF;

  RETURN v_case;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_contractor_qualification_case(uuid,uuid,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.recompute_contractor_readiness(p_case_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_work boolean;
  v_contract boolean;
  v_payment boolean;
  v_score numeric(5,2);
  v_status text;
  v_current text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_manage_contractor_case(p_case_id) THEN
    RAISE EXCEPTION 'Manager access is required';
  END IF;

  UPDATE public.contractor_case_requirements r
  SET status = 'expired', updated_at = now()
  FROM public.contractor_documents d
  WHERE r.case_id = p_case_id
    AND r.current_document_id = d.id
    AND d.expiration_date < current_date
    AND r.status = 'verified';

  SELECT
    NOT EXISTS (
      SELECT 1 FROM public.contractor_case_requirements r
      WHERE r.case_id = p_case_id AND r.required AND r.gate_type = 'work'
        AND r.status NOT IN ('verified','not_applicable')
        AND NOT EXISTS (
          SELECT 1 FROM public.contractor_exceptions e
          WHERE e.requirement_id = r.id AND e.revoked_at IS NULL
            AND e.expires_at > now() AND NOT r.legally_required
        )
    ),
    NOT EXISTS (
      SELECT 1 FROM public.contractor_case_requirements r
      WHERE r.case_id = p_case_id AND r.required AND r.gate_type IN ('work','contract')
        AND r.status NOT IN ('verified','not_applicable')
        AND NOT EXISTS (
          SELECT 1 FROM public.contractor_exceptions e
          WHERE e.requirement_id = r.id AND e.revoked_at IS NULL
            AND e.expires_at > now() AND NOT r.legally_required
        )
    ),
    NOT EXISTS (
      SELECT 1 FROM public.contractor_case_requirements r
      WHERE r.case_id = p_case_id AND r.required AND r.gate_type IN ('work','contract','payment')
        AND r.status NOT IN ('verified','not_applicable')
        AND NOT EXISTS (
          SELECT 1 FROM public.contractor_exceptions e
          WHERE e.requirement_id = r.id AND e.revoked_at IS NULL
            AND e.expires_at > now() AND NOT r.legally_required
        )
    ),
    COALESCE(
      100.0 * SUM(CASE WHEN required AND status IN ('verified','not_applicable','waived') THEN
        CASE WHEN legally_required THEN 3 WHEN gate_type = 'work' THEN 2 ELSE 1 END ELSE 0 END)
      / NULLIF(SUM(CASE WHEN required THEN
        CASE WHEN legally_required THEN 3 WHEN gate_type = 'work' THEN 2 ELSE 1 END ELSE 0 END), 0),
      100
    )
  INTO v_work, v_contract, v_payment, v_score
  FROM public.contractor_case_requirements
  WHERE case_id = p_case_id;

  SELECT status INTO v_current FROM public.contractor_qualification_cases WHERE id = p_case_id;
  IF v_current IN ('suspended','rejected') THEN
    v_status := v_current;
  ELSIF EXISTS (
    SELECT 1 FROM public.contractor_case_requirements
    WHERE case_id = p_case_id AND legally_required AND status IN ('expired','needs_correction')
  ) THEN
    v_status := 'blocked';
  ELSIF v_work AND EXISTS (
    SELECT 1 FROM public.contractor_exceptions
    WHERE case_id = p_case_id AND revoked_at IS NULL AND expires_at > now()
  ) THEN
    v_status := 'conditionally_qualified';
  ELSIF v_payment THEN
    v_status := 'qualified';
  ELSIF EXISTS (
    SELECT 1 FROM public.contractor_case_requirements
    WHERE case_id = p_case_id AND status = 'needs_correction'
  ) THEN
    v_status := 'correction_needed';
  ELSIF EXISTS (
    SELECT 1 FROM public.contractor_case_requirements
    WHERE case_id = p_case_id AND status IN ('submitted','under_review')
  ) THEN
    v_status := 'under_review';
  ELSIF v_current = 'invited' THEN
    v_status := 'invited';
  ELSE
    v_status := 'in_progress';
  END IF;

  UPDATE public.contractor_qualification_cases
  SET work_ready = v_work,
      contract_ready = v_contract,
      payment_ready = v_payment,
      score = round(v_score, 2),
      status = v_status,
      reviewed_at = CASE WHEN v_status IN ('qualified','conditionally_qualified','blocked') THEN now() ELSE reviewed_at END,
      updated_at = now()
  WHERE id = p_case_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_contractor_readiness(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_contractor_requirement_recompute()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_case_id uuid;
BEGIN
  v_case_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.case_id ELSE NEW.case_id END;
  PERFORM public.recompute_contractor_readiness(v_case_id);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_requirement_recompute ON public.contractor_case_requirements;
CREATE TRIGGER contractor_requirement_recompute
  AFTER INSERT OR UPDATE OF status, current_document_id, required, gate_type OR DELETE
  ON public.contractor_case_requirements
  FOR EACH ROW EXECUTE FUNCTION public.tg_contractor_requirement_recompute();

DROP TRIGGER IF EXISTS contractor_exception_recompute ON public.contractor_exceptions;
CREATE TRIGGER contractor_exception_recompute
  AFTER INSERT OR UPDATE OR DELETE ON public.contractor_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_contractor_requirement_recompute();

CREATE OR REPLACE FUNCTION public.contractor_can_proceed(
  p_project_id uuid,
  p_organization_id uuid,
  p_gate text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_client uuid;
  v_case public.contractor_qualification_cases%ROWTYPE;
  v_enforce boolean := false;
  v_module boolean := false;
BEGIN
  SELECT workspace_id, client_id INTO v_tenant, v_client
  FROM public.projects WHERE id = p_project_id;
  IF v_tenant IS NULL OR p_organization_id IS NULL THEN RETURN true; END IF;

  SELECT COALESCE(platform_contractor_readiness, false)
         AND COALESCE(contractor_readiness_enabled, false)
  INTO v_module FROM public.workspace_modules WHERE workspace_id = v_tenant;
  IF NOT COALESCE(v_module, false) THEN RETURN true; END IF;

  SELECT * INTO v_case
  FROM public.contractor_qualification_cases c
  WHERE c.tenant_id = v_tenant AND c.organization_id = p_organization_id
    AND (
      c.project_id = p_project_id
      OR (c.scope_type = 'client' AND c.client_id = v_client)
      OR c.scope_type = 'workspace'
    )
  ORDER BY CASE WHEN c.project_id = p_project_id THEN 1 WHEN c.client_id = v_client THEN 2 ELSE 3 END
  LIMIT 1;

  SELECT CASE p_gate
    WHEN 'work' THEN enforce_work_gate
    WHEN 'contract' THEN enforce_contract_gate
    WHEN 'payment' THEN enforce_payment_gate
    ELSE false END
  INTO v_enforce
  FROM public.contractor_readiness_policies p
  WHERE p.tenant_id = v_tenant
    AND (p.project_id = p_project_id OR (p.scope_type = 'client' AND p.client_id = v_client) OR p.scope_type = 'workspace')
  ORDER BY CASE WHEN p.project_id = p_project_id THEN 1 WHEN p.client_id = v_client THEN 2 ELSE 3 END
  LIMIT 1;

  IF v_case.id IS NULL THEN RETURN NOT COALESCE(v_enforce, false); END IF;
  IF v_case.status IN ('suspended','rejected','blocked') THEN RETURN false; END IF;
  RETURN CASE p_gate
    WHEN 'work' THEN v_case.work_ready
    WHEN 'contract' THEN v_case.contract_ready
    WHEN 'payment' THEN v_case.payment_ready
    ELSE false END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.contractor_can_proceed(uuid,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_enforce_contractor_commitment_gate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'executed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'executed')
     AND NEW.vendor_org_id IS NOT NULL
     AND NOT public.contractor_can_proceed(NEW.project_id, NEW.vendor_org_id, 'contract') THEN
    RAISE EXCEPTION 'Contractor Readiness blocked execution: verify the contractor work and contract requirements first';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_commitment_gate ON public.commitments;
CREATE TRIGGER contractor_commitment_gate
  BEFORE INSERT OR UPDATE OF status ON public.commitments
  FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_contractor_commitment_gate();

CREATE OR REPLACE FUNCTION public.tg_enforce_contractor_invoice_gate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_project uuid;
  v_org uuid;
BEGIN
  IF NEW.status IN ('approved','paid') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT project_id, vendor_org_id INTO v_project, v_org
    FROM public.commitments WHERE id = NEW.commitment_id;
    IF v_org IS NOT NULL AND NOT public.contractor_can_proceed(v_project, v_org, 'payment') THEN
      RAISE EXCEPTION 'Contractor Readiness blocked payment approval: verify payment requirements first';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_invoice_gate ON public.commitment_invoices;
CREATE TRIGGER contractor_invoice_gate
  BEFORE INSERT OR UPDATE OF status ON public.commitment_invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_contractor_invoice_gate();

CREATE OR REPLACE FUNCTION public.tg_enforce_contractor_assignment_gate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active')
     AND NOT public.contractor_can_proceed(NEW.project_id, NEW.organization_id, 'work') THEN
    RAISE EXCEPTION 'Contractor Readiness blocked mobilization: verify work requirements first';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_assignment_gate ON public.contractor_project_assignments;
CREATE TRIGGER contractor_assignment_gate
  BEFORE INSERT OR UPDATE OF status ON public.contractor_project_assignments
  FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_contractor_assignment_gate();

-- Updated-at triggers.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contractor_profiles','contractor_contacts','contractor_requirement_templates',
    'contractor_qualification_cases','contractor_documents','contractor_case_requirements',
    'contractor_readiness_policies','contractor_project_assignments'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t || '_updated_at', t);
  END LOOP;
END $$;

-- Mark verified records expired and refresh every case. Called by the daily
-- reminder edge function and safe to invoke manually.
CREATE OR REPLACE FUNCTION public.refresh_contractor_expirations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  r record;
BEGIN
  UPDATE public.contractor_documents
  SET verification_status = 'expired', updated_at = now()
  WHERE expiration_date < current_date
    AND verification_status = 'verified';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  FOR r IN SELECT id FROM public.contractor_qualification_cases LOOP
    PERFORM public.recompute_contractor_readiness(r.id);
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_contractor_expirations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_contractor_expirations() TO service_role;

-- Audit important staff-side state changes without exposing document content.
CREATE OR REPLACE FUNCTION public.tg_log_contractor_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.contractor_activity_log
      (tenant_id, case_id, organization_id, actor_type, actor_user_id,
       action, entity_type, entity_id, details)
    VALUES
      (NEW.tenant_id, NEW.id, NEW.organization_id, 'staff', auth.uid(),
       'status_changed', 'qualification_case', NEW.id,
       jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_case_state_audit ON public.contractor_qualification_cases;
CREATE TRIGGER contractor_case_state_audit
  AFTER UPDATE OF status ON public.contractor_qualification_cases
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_contractor_state();

NOTIFY pgrst, 'reload schema';

COMMIT;
