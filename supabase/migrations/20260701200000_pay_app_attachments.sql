-- Supporting documents attached to a prime pay application (lien-release hard
-- copies, photos, backup, etc.). When the pay app is emailed to the owner, the
-- selected attachments are merged with the G702/G703 into one package PDF.
CREATE TABLE IF NOT EXISTS public.pay_app_attachments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pay_app_id    uuid NOT NULL REFERENCES public.prime_contract_pay_apps(id) ON DELETE CASCADE,
  label         text NOT NULL,
  bucket        text NOT NULL DEFAULT 'project-artifacts',
  storage_path  text NOT NULL,
  kind          text NOT NULL DEFAULT 'support'
    CHECK (kind IN ('lien_conditional','lien_unconditional','support','other')),
  content_type  text,
  sort_order    int NOT NULL DEFAULT 0,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paa_pay_app ON public.pay_app_attachments(pay_app_id, sort_order);

ALTER TABLE public.pay_app_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY pay_app_attachments_tenant_isolation ON public.pay_app_attachments
FOR ALL TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
