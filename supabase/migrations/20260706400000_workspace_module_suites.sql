-- Sellable-suite module flags on workspace_modules. Each has a platform gate
-- (what the plan/package includes — the ceiling) and a workspace toggle (the
-- client turns it on/off within their entitlement). Default true so existing
-- workspaces are unaffected until an admin dials a client's package back.
ALTER TABLE public.workspace_modules
  ADD COLUMN IF NOT EXISTS construction_enabled   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS platform_construction  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consulting_enabled     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS platform_consulting    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS environmental_enabled  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS platform_environmental boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS property_mgmt_enabled  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS platform_property_mgmt boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cockpit_enabled        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS platform_cockpit       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reports_enabled        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS platform_reports       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_enabled             boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS platform_ai            boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS package                text;   -- the sold bundle (display / billing)

NOTIFY pgrst, 'reload schema';
