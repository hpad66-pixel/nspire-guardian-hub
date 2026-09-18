BEGIN;

CREATE TABLE IF NOT EXISTS public.marketing_contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  crm_contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  product text NOT NULL DEFAULT 'OneWater Work',
  source_path text,
  source_url text,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 180),
  email text NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  company text,
  phone text,
  interest text NOT NULL DEFAULT 'Enterprise deployment',
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contact_created','qualified','converted','closed','spam')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_contact_requests_created_idx
  ON public.marketing_contact_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_contact_requests_workspace_status_idx
  ON public.marketing_contact_requests(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_contact_requests_email_idx
  ON public.marketing_contact_requests(lower(email));

ALTER TABLE public.marketing_contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_contact_requests_admin_select ON public.marketing_contact_requests;
CREATE POLICY marketing_contact_requests_admin_select
  ON public.marketing_contact_requests
  FOR SELECT TO authenticated
  USING (
    workspace_id = public.get_my_workspace_id()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'owner'::public.app_role)
      OR public.is_workspace_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS marketing_contact_requests_admin_update ON public.marketing_contact_requests;
CREATE POLICY marketing_contact_requests_admin_update
  ON public.marketing_contact_requests
  FOR UPDATE TO authenticated
  USING (
    workspace_id = public.get_my_workspace_id()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'owner'::public.app_role)
      OR public.is_workspace_admin(auth.uid())
    )
  )
  WITH CHECK (
    workspace_id = public.get_my_workspace_id()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'owner'::public.app_role)
      OR public.is_workspace_admin(auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.set_marketing_contact_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_contact_requests_updated_at ON public.marketing_contact_requests;
CREATE TRIGGER marketing_contact_requests_updated_at
  BEFORE UPDATE ON public.marketing_contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_marketing_contact_requests_updated_at();

COMMENT ON TABLE public.marketing_contact_requests IS
  'Public enterprise contact inquiries for OneWater Work. Submitted through an Edge Function and linked to CRM contacts when possible.';

COMMIT;
