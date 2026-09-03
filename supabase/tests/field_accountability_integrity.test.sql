BEGIN;
SELECT plan(12);

SELECT has_table('public', 'field_visits', 'site walks exist');
SELECT has_table('public', 'field_accountability_items', 'accountable conditions exist');
SELECT has_table('public', 'field_accountability_photos', 'photo evidence links exist');
SELECT has_table('public', 'field_photo_annotations', 'responsive photo annotations exist');
SELECT has_table('public', 'field_accountability_comments', 'evidence conversations exist');
SELECT has_table('public', 'field_accountability_events', 'append-only status history exists');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.field_accountability_items'::regclass), 'items use RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.field_accountability_photos'::regclass), 'photo links use RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.field_accountability_comments'::regclass), 'comments use RLS');

SELECT has_function('public', 'transition_field_accountability_item', ARRAY['uuid','text','text'], 'review transition RPC exists');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.field_accountability_photos'::regclass AND tgname = 'field_after_photo_limit'), 'after evidence is capped at three');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.field_accountability_items'::regclass AND tgname = 'field_item_status_audit'), 'status changes are audited');

SELECT * FROM finish();
ROLLBACK;
