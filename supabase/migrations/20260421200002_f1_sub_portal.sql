-- ============================================================
-- F1 · Subcontractor Portal — invitations + sub-scoped RLS.
-- ============================================================

-- portal_kind lives in app_metadata / user_metadata (not a DB column on auth.users
-- because that table is managed by Supabase). We store a mirror here for joins.
CREATE TABLE IF NOT EXISTS public.portal_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  portal_kind text NOT NULL CHECK (portal_kind IN ('main','sub','owner')),
  role text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, portal_kind)
);

CREATE INDEX IF NOT EXISTS idx_pm_user_tenant ON public.portal_memberships(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_org ON public.portal_memberships(organization_id);

ALTER TABLE public.portal_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY pm_self_or_tenant_admin ON public.portal_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id = public.current_tenant_id() OR public.is_super_admin());
CREATE POLICY pm_tenant_modify ON public.portal_memberships FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.portal_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  portal_kind text NOT NULL CHECK (portal_kind IN ('sub','owner')),
  role text NOT NULL DEFAULT 'subcontractor_portal',
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  token text NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_pi_tenant_pending
  ON public.portal_invitations(tenant_id) WHERE accepted_at IS NULL;

ALTER TABLE public.portal_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY pi_tenant ON public.portal_invitations FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Helper: resolve the current user's portal_kind for the current tenant.
-- Reads from portal_memberships (not JWT claim, so no claim injection needed).
CREATE OR REPLACE FUNCTION public.current_portal_kind()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT portal_kind FROM public.portal_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = public.current_tenant_id()
        AND is_active = true
      ORDER BY CASE portal_kind WHEN 'sub' THEN 1 WHEN 'owner' THEN 2 ELSE 3 END
      LIMIT 1),
    'main'
  );
$$;

-- Helper: organization_ids the current user belongs to (for sub scoping)
CREATE OR REPLACE FUNCTION public.current_user_orgs()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT organization_id FROM public.portal_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = public.current_tenant_id()
        AND is_active = true
        AND organization_id IS NOT NULL
    ),
    ARRAY[]::uuid[]
  );
$$;

-- Sub-portal RLS: additive SELECT policies that grant access to own org's rows only
-- Commitments: sub sees only commitments where vendor_org_id is in their orgs
CREATE POLICY commitments_sub_portal_select ON public.commitments FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'sub'
    AND vendor_org_id = ANY(public.current_user_orgs())
  );

-- Sub-scoped commitment invoices (only their commitments)
CREATE POLICY ci_sub_portal_select ON public.commitment_invoices FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'sub'
    AND EXISTS (SELECT 1 FROM public.commitments c
                WHERE c.id = commitment_invoices.commitment_id
                AND c.vendor_org_id = ANY(public.current_user_orgs()))
  );

CREATE POLICY ci_sub_portal_insert ON public.commitment_invoices FOR INSERT TO authenticated
  WITH CHECK (
    public.current_portal_kind() = 'sub'
    AND EXISTS (SELECT 1 FROM public.commitments c
                WHERE c.id = commitment_invoices.commitment_id
                AND c.vendor_org_id = ANY(public.current_user_orgs()))
  );

-- Commitment SOV lines read-only for sub portal
CREATE POLICY csl_sub_portal_select ON public.commitment_sov_lines FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'sub'
    AND EXISTS (SELECT 1 FROM public.commitments c
                WHERE c.id = commitment_sov_lines.commitment_id
                AND c.vendor_org_id = ANY(public.current_user_orgs()))
  );

-- RFIs assigned to the sub's org (via responsible_contractor_org_id)
CREATE POLICY rfis_sub_portal_select ON public.project_rfis FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'sub'
    AND responsible_contractor_org_id = ANY(public.current_user_orgs())
  );

-- Submittals assigned to the sub's org
CREATE POLICY submittals_sub_portal_select ON public.project_submittals FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'sub'
    AND responsible_contractor_org_id = ANY(public.current_user_orgs())
  );
