-- Site Accountability is an Enterprise add-on.
-- Keep the module installed, but do not expose it unless the workspace is on
-- Enterprise or a platform admin explicitly unlocks the platform gate.

BEGIN;

ALTER TABLE public.workspace_modules
  ALTER COLUMN site_accountability_enabled SET DEFAULT false,
  ALTER COLUMN platform_site_accountability SET DEFAULT false;

UPDATE public.workspace_modules
SET
  site_accountability_enabled = false,
  platform_site_accountability = false
WHERE COALESCE(package, '') <> 'Enterprise';

UPDATE public.workspace_modules
SET
  site_accountability_enabled = true,
  platform_site_accountability = true
WHERE package = 'Enterprise';

NOTIFY pgrst, 'reload schema';

COMMIT;
