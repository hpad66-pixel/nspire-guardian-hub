BEGIN;
SELECT plan(19);

SELECT has_table('public', 'field_visits', 'site walks exist');
SELECT has_table('public', 'field_accountability_items', 'accountable conditions exist');
SELECT has_table('public', 'field_accountability_photos', 'photo evidence links exist');
SELECT has_table('public', 'field_photo_annotations', 'responsive photo annotations exist');
SELECT has_table('public', 'field_accountability_comments', 'evidence conversations exist');
SELECT has_table('public', 'field_accountability_events', 'append-only status history exists');
SELECT has_table('public', 'field_photo_caption_revisions', 'caption revision history exists');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.field_accountability_items'::regclass), 'items use RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.field_accountability_photos'::regclass), 'photo links use RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.field_accountability_comments'::regclass), 'comments use RLS');

SELECT has_function('public', 'transition_field_accountability_item', ARRAY['uuid','text','text'], 'review transition RPC exists');
SELECT has_function('public', 'update_field_photo_caption', ARRAY['uuid','text'], 'uploader-owned caption RPC exists');
SELECT has_function('public', 'save_field_photo_ai_suggestion', ARRAY['uuid','jsonb'], 'AI suggestions use a guarded RPC');
SELECT has_function('public', 'owner_can_read_field_photo', ARRAY['uuid'], 'owner photo visibility uses a non-recursive predicate');
SELECT has_function('public', 'owner_can_read_field_photo_object', ARRAY['text'], 'owner thumbnail visibility uses a non-recursive predicate');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.field_accountability_photos'::regclass AND tgname = 'field_after_photo_limit'), 'after evidence is capped at three');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.field_accountability_items'::regclass AND tgname = 'field_item_status_audit'), 'status changes are audited');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.photos'::regclass AND tgname = 'field_photo_caption_audit'), 'field caption changes enforce ownership and preserve history');

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ SELECT fp.id, ph.id
     FROM public.field_accountability_photos fp
     LEFT JOIN public.photos ph ON ph.id = fp.photo_id
     LIMIT 1 $$,
  'the embedded accountability-photo query plans without recursive RLS'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
