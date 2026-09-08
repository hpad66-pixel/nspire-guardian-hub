BEGIN;

-- Mark the property-wide Glorieta evidence record as the preferred Site
-- Accountability destination. Navigation resolves this marker generically, so
-- future clients can opt into the same standalone feature without hard-coded
-- project IDs or exposing unrelated projects.
UPDATE public.projects
SET program_meta = COALESCE(program_meta, '{}'::jsonb) || jsonb_build_object(
      'feature_key', 'site_accountability',
      'owner_feature_key', 'site_accountability',
      'owner_navigation_priority', true,
      'source_label', 'Chris Sullivan owner walk',
      'source_photo_count', 153
    ),
    module_config = COALESCE(module_config, '{}'::jsonb) || jsonb_build_object(
      'accountability', true,
      'client-portal', true
    )
WHERE (
    program_meta->>'program_key' = 'GLORIETA'
    AND program_meta->>'project_key' = 'PMO-03'
  )
  OR id = 'ab40d8aa-fc47-4f10-955a-0210481043a7'::uuid;

NOTIFY pgrst, 'reload schema';

COMMIT;
