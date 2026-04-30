-- ============================================================
-- A3 · Distribution Lists
-- Named recipient groups reused across every workflow module.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.distribution_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  scope text NOT NULL CHECK (scope IN ('tenant','workspace','project')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dl_tenant ON public.distribution_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dl_project ON public.distribution_lists(project_id) WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.distribution_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.distribution_lists(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  email_override text,
  role_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR contact_id IS NOT NULL OR email_override IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_dlm_list ON public.distribution_list_members(list_id);

CREATE TABLE IF NOT EXISTS public.workflow_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  record_type text NOT NULL,
  list_id uuid REFERENCES public.distribution_lists(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  reason text CHECK (reason IN ('fyi','response','approve')),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wd_record ON public.workflow_distributions(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_wd_tenant ON public.workflow_distributions(tenant_id);

-- RLS --------------------------------------------------------
ALTER TABLE public.distribution_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY dl_tenant ON public.distribution_lists FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY dlm_via_list ON public.distribution_list_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.distribution_lists dl
                 WHERE dl.id = distribution_list_members.list_id
                 AND (dl.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.distribution_lists dl
                      WHERE dl.id = distribution_list_members.list_id
                      AND (dl.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

CREATE POLICY wd_tenant ON public.workflow_distributions FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- resolve_distribution: expand lists + individual users → deduped recipients
CREATE OR REPLACE FUNCTION public.resolve_distribution(
  p_list_ids uuid[] DEFAULT '{}',
  p_user_ids uuid[] DEFAULT '{}',
  p_extra_emails text[] DEFAULT '{}'
)
RETURNS TABLE(user_id uuid, contact_id uuid, email text, role_label text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH list_expanded AS (
    SELECT dlm.user_id, dlm.contact_id, dlm.email_override, dlm.role_label
    FROM public.distribution_list_members dlm
    WHERE dlm.list_id = ANY(p_list_ids)
  ),
  user_direct AS (
    SELECT u AS user_id, NULL::uuid AS contact_id, NULL::text AS email_override, NULL::text AS role_label
    FROM unnest(p_user_ids) AS u
  ),
  email_direct AS (
    SELECT NULL::uuid AS user_id, NULL::uuid AS contact_id, e AS email_override, NULL::text AS role_label
    FROM unnest(p_extra_emails) AS e
  ),
  unioned AS (
    SELECT * FROM list_expanded
    UNION ALL SELECT * FROM user_direct
    UNION ALL SELECT * FROM email_direct
  ),
  resolved AS (
    SELECT
      u.user_id,
      u.contact_id,
      COALESCE(
        u.email_override,
        (SELECT au.email FROM auth.users au WHERE au.id = u.user_id LIMIT 1),
        (SELECT c.email FROM public.crm_contacts c WHERE c.id = u.contact_id LIMIT 1)
      )::text AS email,
      u.role_label
    FROM unioned u
  )
  SELECT DISTINCT ON (LOWER(email)) user_id, contact_id, email, role_label
  FROM resolved
  WHERE email IS NOT NULL AND email <> ''
  ORDER BY LOWER(email);
$$;

DROP TRIGGER IF EXISTS trg_dl_updated_at ON public.distribution_lists;
CREATE TRIGGER trg_dl_updated_at
  BEFORE UPDATE ON public.distribution_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
