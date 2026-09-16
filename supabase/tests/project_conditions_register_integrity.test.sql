BEGIN;
SELECT plan(19);

SELECT has_table('public', 'project_condition_records', 'project condition records exist');
SELECT has_table('public', 'project_condition_comments', 'project condition comments exist');
SELECT has_table('public', 'project_condition_notations', 'project condition notations exist');
SELECT has_table('public', 'project_condition_photos', 'project condition photo links exist');
SELECT has_table('public', 'project_condition_audit_events', 'project condition audit events exist');

SELECT has_column('public', 'project_condition_records', 'field_item_id', 'conditions can retain source field accountability linkage');
SELECT has_column('public', 'project_condition_records', 'client_publish_status', 'client publish state is explicit');
SELECT has_column('public', 'project_condition_records', 'client_summary', 'client-safe summary is separate from internal observed condition');
SELECT has_column('public', 'project_condition_comments', 'audience', 'comment audience is explicit');
SELECT has_column('public', 'project_condition_notations', 'audience', 'notation audience is explicit');
SELECT has_column('public', 'project_condition_photos', 'audience', 'photo audience is explicit');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.project_condition_records'::regclass), 'condition records use RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.project_condition_comments'::regclass), 'condition comments use RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.project_condition_notations'::regclass), 'condition notations use RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.project_condition_audit_events'::regclass), 'condition audit events use RLS');

SELECT has_function('public', 'validate_project_condition_record', ARRAY[]::name[], 'condition record validation trigger function exists');
SELECT has_function('public', 'validate_project_condition_child', ARRAY[]::name[], 'condition child validation trigger function exists');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.project_condition_records'::regclass AND tgname = 'project_condition_change_audit'), 'condition changes are audited');

SELECT lives_ok(
  $$ SELECT record.id, comment.id, notation.id
     FROM public.project_condition_records record
     LEFT JOIN public.project_condition_comments comment
       ON comment.condition_id = record.id
      AND comment.audience = 'client_visible'
     LEFT JOIN public.project_condition_notations notation
       ON notation.condition_id = record.id
      AND notation.audience = 'client_visible'
     WHERE record.client_publish_status IN ('ready_to_publish','published_to_client')
     LIMIT 1 $$,
  'client-visible register query plans without recursive RLS'
);

SELECT * FROM finish();
ROLLBACK;
