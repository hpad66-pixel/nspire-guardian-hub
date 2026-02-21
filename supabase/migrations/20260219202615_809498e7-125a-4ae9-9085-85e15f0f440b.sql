
-- ══════════════════════════════════════════════════════════════
-- workspace_modules: one row per workspace, flags per module
-- Super admin controls enabled_by_platform; workspace admin
-- can toggle workspace_override to false (disable for their org)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.workspace_modules (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              UUID NOT NULL,
  -- Core toggles (NSPIRE / Daily Grounds / Projects stay in properties table)
  email_inbox_enabled       BOOLEAN NOT NULL DEFAULT false,
  qr_scanning_enabled       BOOLEAN NOT NULL DEFAULT false,
  credential_wallet_enabled BOOLEAN NOT NULL DEFAULT false,
  training_hub_enabled      BOOLEAN NOT NULL DEFAULT false,
  safety_module_enabled     BOOLEAN NOT NULL DEFAULT false,
  equipment_tracker_enabled BOOLEAN NOT NULL DEFAULT false,
  client_portal_enabled     BOOLEAN NOT NULL DEFAULT false,
  occupancy_enabled         BOOLEAN NOT NULL DEFAULT false,
  -- Platform-level gates (set by super admin / billing)
  platform_credential_wallet BOOLEAN NOT NULL DEFAULT false,
  platform_training_hub      BOOLEAN NOT NULL DEFAULT false,
  platform_safety_module     BOOLEAN NOT NULL DEFAULT false,
  platform_equipment_tracker BOOLEAN NOT NULL DEFAULT false,
  platform_client_portal     BOOLEAN NOT NULL DEFAULT false,
  platform_email_inbox       BOOLEAN NOT NULL DEFAULT false,
  platform_qr_scanning       BOOLEAN NOT NULL DEFAULT false,
  platform_occupancy         BOOLEAN NOT NULL DEFAULT false,
  created_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (workspace_id)
);

-- Trigger: keep updated_at current
CREATE TRIGGER workspace_modules_updated_at
  BEFORE UPDATE ON public.workspace_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.workspace_modules ENABLE ROW LEVEL SECURITY;

-- Workspace members can read their own workspace modules
CREATE POLICY "workspace members can read modules"
  ON public.workspace_modules FOR SELECT
  USING (workspace_id = public.get_my_workspace_id());

-- Only admin/owner roles can update workspace-level overrides
CREATE POLICY "admins can update workspace modules"
  ON public.workspace_modules FOR UPDATE
  USING (
    workspace_id = public.get_my_workspace_id()
    AND public.has_role(auth.uid(), 'admin')
  );

-- Allow insert for workspace setup (handled by app on first load)
CREATE POLICY "admins can insert workspace modules"
  ON public.workspace_modules FOR INSERT
  WITH CHECK (
    workspace_id = public.get_my_workspace_id()
    AND public.has_role(auth.uid(), 'admin')
  );

-- ══════════════════════════════════════════════════════════════
-- property_module_overrides: property-level disable of a module
-- Workspace module must be ON; property can turn it OFF locally
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.property_module_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  module_key  TEXT NOT NULL,  -- matches ModuleConfig key, e.g. 'credentialWalletEnabled'
  enabled     BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by  UUID,
  UNIQUE (property_id, module_key)
);

CREATE TRIGGER property_module_overrides_updated_at
  BEFORE UPDATE ON public.property_module_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.property_module_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property team can read overrides"
  ON public.property_module_overrides FOR SELECT
  USING (public.can_access_property(auth.uid(), property_id));

CREATE POLICY "admins can manage property overrides"
  ON public.property_module_overrides FOR ALL
  USING (
    public.can_access_property(auth.uid(), property_id)
    AND public.has_role(auth.uid(), 'admin')
  );
