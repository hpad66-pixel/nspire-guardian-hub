BEGIN;
SELECT plan(12);

SELECT has_column('public', 'project_emails', 'rfc_message_id', 'project email stores RFC Message-Id for Gmail replies');
SELECT has_column('public', 'project_action_items', 'trello_card_id', 'action item stores Trello card id');
SELECT has_column('public', 'project_action_items', 'trello_card_url', 'action item stores Trello card url');
SELECT has_column('public', 'action_item_comments', 'trello_action_id', 'comment stores mirrored Trello action id');
SELECT has_table('public', 'project_action_item_watchers', 'action items support CC followers');
SELECT has_table('public', 'trello_connections', 'workspace Trello connection exists');
SELECT has_table('public', 'trello_project_lists', 'projects can choose a Trello list');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.project_action_item_watchers'::regclass),
  'action item followers are protected by RLS'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.project_action_items'::regclass AND tgname = 'trg_notify_project_action_item' AND NOT tgisinternal),
  'action item assignments/status changes create notifications'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.project_action_item_watchers'::regclass AND tgname = 'trg_notify_action_item_watcher' AND NOT tgisinternal),
  'new CC followers create notifications'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.action_item_comments'::regclass AND tgname = 'trg_notify_action_item_comment' AND NOT tgisinternal),
  'new instruction comments create notifications'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'trello_connections' AND 'authenticated' = ANY(roles)
  ),
  'Trello secrets are never browser-readable'
);

SELECT * FROM finish();
ROLLBACK;
