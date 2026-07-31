-- Quick-add email recipients — deliberately NOT the CRM contacts table
-- (crm_contacts requires first_name + contact_type, a full "person" record).
-- This is just "an email address worth remembering", nothing more: label is
-- optional, and every recipient used on a send is auto-remembered so the list
-- builds itself without an extra save step.
CREATE TABLE IF NOT EXISTS public.saved_email_recipients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email        text NOT NULL,
  label        text,
  created_by   uuid,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);
ALTER TABLE public.saved_email_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_email_recipients_tenant ON public.saved_email_recipients
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

NOTIFY pgrst, 'reload schema';
