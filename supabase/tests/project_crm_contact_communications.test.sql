BEGIN;
SELECT plan(9);

SELECT has_table('public', 'project_sms_messages', 'project SMS audit trail exists');
SELECT has_table('public', 'sms_connections', 'workspace SMS connection exists');
SELECT has_column('public', 'project_sms_messages', 'contact_id', 'messages can target CRM contacts');
SELECT has_column('public', 'project_sms_messages', 'recipient_user_id', 'messages can target internal users');
SELECT has_column('public', 'project_sms_messages', 'provider_message_id', 'provider delivery status can be reconciled');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.project_sms_messages'::regclass),
  'project SMS messages are protected by RLS'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.sms_connections'::regclass),
  'SMS credentials are protected by RLS'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sms_connections' AND 'authenticated' = ANY(roles)
  ),
  'SMS credentials are never browser-readable'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'project_directory_entries'
      AND indexname = 'project_directory_entries_project_contact_unique'
  ),
  'a CRM contact can only be attached to a project once'
);

SELECT * FROM finish();
ROLLBACK;
