-- Site Accountability module toggle
-- The feature remains installed, but hidden by default unless an admin enables it
-- in Modules & Packages.

BEGIN;

ALTER TABLE public.workspace_modules
  ADD COLUMN IF NOT EXISTS site_accountability_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_site_accountability boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';

COMMIT;
