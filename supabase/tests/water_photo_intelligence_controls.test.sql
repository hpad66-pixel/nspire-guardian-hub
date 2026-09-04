BEGIN;
SELECT plan(15);

SELECT has_column('public', 'field_accountability_photos', 'ai_status', 'photo analysis status is persisted');
SELECT has_column('public', 'field_accountability_photos', 'review_status', 'human review status is persisted');
SELECT has_column('public', 'field_accountability_photos', 'reviewed_narrative', 'reviewed observation is separate from uploader caption');
SELECT has_column('public', 'field_accountability_photos', 'recommended_action', 'recommended action is persisted');
SELECT has_column('public', 'field_accountability_photos', 'analysis_model', 'AI provenance records the model');
SELECT has_table('public', 'field_photo_review_revisions', 'photo review changes have an audit table');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.field_photo_review_revisions'::regclass), 'photo review revisions use RLS');
SELECT has_function('public', 'update_field_photo_review', ARRAY['uuid','text','text','text','text','text','text'], 'administrator review RPC exists');

SELECT ok(EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'water_service_accounts'
    AND policyname = 'water_service_accounts_read' AND cmd = 'SELECT'
), 'water meter profiles have a distinct read policy');
SELECT ok(EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'water_service_accounts'
    AND policyname = 'water_service_accounts_admin_update' AND cmd = 'UPDATE'
), 'water meter profile updates are administrator scoped');
SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'water_service_accounts'
    AND policyname = 'water_service_accounts_all'
), 'the former broad water meter write policy is removed');
SELECT ok(EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'water_bills'
    AND policyname = 'water_bills_source_upload' AND cmd = 'INSERT'
), 'property operations can contribute source-backed bill uploads');
SELECT ok(EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'water_bills'
    AND policyname = 'water_bills_admin_update' AND cmd = 'UPDATE'
), 'existing water bill changes are administrator scoped');
SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'water_bills'
    AND policyname = 'water_bills_all'
), 'the former broad water bill write policy is removed');
SELECT col_is_fk('public', 'field_photo_review_revisions', 'photo_link_id', 'review history stays attached to a valid photo link');

SELECT * FROM finish();
ROLLBACK;
