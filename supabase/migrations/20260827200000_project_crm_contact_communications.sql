-- Project CRM contact communications
--
-- External CRM contacts belong in project_directory_entries and do not receive
-- application permissions. SMS provider credentials remain service-role only;
-- the browser can read project message history but never the Twilio secret.

CREATE UNIQUE INDEX IF NOT EXISTS project_directory_entries_project_contact_unique
  ON public.project_directory_entries(project_id, contact_id)
  WHERE contact_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS project_directory_entries_project_user_unique
  ON public.project_directory_entries(project_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sms_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_sid text NOT NULL UNIQUE,
  auth_token text NOT NULL,
  from_number text,
  messaging_service_sid text,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sms_connections_sender_required CHECK (
    nullif(btrim(from_number), '') IS NOT NULL
    OR nullif(btrim(messaging_service_sid), '') IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.project_sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status text NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'sent', 'delivered', 'undelivered', 'failed', 'received')
  ),
  from_phone text NOT NULL,
  to_phone text NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1600),
  provider text NOT NULL DEFAULT 'twilio',
  provider_message_id text,
  error_message text,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_sms_messages_person_required CHECK (
    contact_id IS NOT NULL OR recipient_user_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS project_sms_messages_provider_id_unique
  ON public.project_sms_messages(provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS project_sms_messages_project_created_idx
  ON public.project_sms_messages(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS project_sms_messages_contact_idx
  ON public.project_sms_messages(contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

DROP TRIGGER IF EXISTS sms_connections_set_updated_at ON public.sms_connections;
CREATE TRIGGER sms_connections_set_updated_at
  BEFORE UPDATE ON public.sms_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS project_sms_messages_set_updated_at ON public.project_sms_messages;
CREATE TRIGGER project_sms_messages_set_updated_at
  BEFORE UPDATE ON public.project_sms_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sms_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sms_messages ENABLE ROW LEVEL SECURITY;

-- Deliberately no sms_connections policies: service-role edge functions are the
-- sole reader/writer so Account SID and auth token cannot reach the browser.

DROP POLICY IF EXISTS project_sms_messages_staff_select ON public.project_sms_messages;
CREATE POLICY project_sms_messages_staff_select
  ON public.project_sms_messages FOR SELECT TO authenticated
  USING (
    (public.current_portal_kind() = 'main' AND tenant_id = public.current_tenant_id())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS project_sms_messages_staff_insert ON public.project_sms_messages;
CREATE POLICY project_sms_messages_staff_insert
  ON public.project_sms_messages FOR INSERT TO authenticated
  WITH CHECK (
    (public.current_portal_kind() = 'main' AND tenant_id = public.current_tenant_id())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS project_sms_messages_staff_update ON public.project_sms_messages;
CREATE POLICY project_sms_messages_staff_update
  ON public.project_sms_messages FOR UPDATE TO authenticated
  USING (
    (public.current_portal_kind() = 'main' AND tenant_id = public.current_tenant_id())
    OR public.is_super_admin()
  )
  WITH CHECK (
    (public.current_portal_kind() = 'main' AND tenant_id = public.current_tenant_id())
    OR public.is_super_admin()
  );

COMMENT ON TABLE public.project_sms_messages IS
  'Project-scoped SMS audit trail for attached internal users and external CRM contacts.';
COMMENT ON TABLE public.sms_connections IS
  'Server-only Twilio credentials per workspace; no authenticated browser policy.';
