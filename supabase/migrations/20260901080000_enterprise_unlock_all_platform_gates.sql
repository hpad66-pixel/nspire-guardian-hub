-- Enterprise package must open every platform_* gate, not only workspace toggles.
-- Older applies left field-ops gates at DEFAULT false, so Modules & Packages showed
-- grayed "Not in plan" switches even when Package = Enterprise.
--
-- 1) Unlock all platform gates for any workspace already on Enterprise.
-- 2) Ensure workspace toggles for Enterprise are all ON (idempotent).

UPDATE public.workspace_modules
SET
  platform_construction = true,
  platform_consulting = true,
  platform_environmental = true,
  platform_property_mgmt = true,
  platform_cockpit = true,
  platform_reports = true,
  platform_ai = true,
  platform_occupancy = true,
  platform_email_inbox = true,
  platform_qr_scanning = true,
  platform_credential_wallet = true,
  platform_training_hub = true,
  platform_safety_module = true,
  platform_equipment_tracker = true,
  platform_client_portal = true,
  construction_enabled = true,
  consulting_enabled = true,
  environmental_enabled = true,
  property_mgmt_enabled = true,
  cockpit_enabled = true,
  reports_enabled = true,
  ai_enabled = true,
  occupancy_enabled = true,
  email_inbox_enabled = true,
  qr_scanning_enabled = true,
  credential_wallet_enabled = true,
  training_hub_enabled = true,
  safety_module_enabled = true,
  equipment_tracker_enabled = true,
  client_portal_enabled = true,
  package = 'Enterprise'
WHERE lower(coalesce(package, '')) = 'enterprise';

-- Also unlock every workspace that has no package row yet but is already on
-- workspaces.plan = 'enterprise' (legacy Settings field, previously unwired).
UPDATE public.workspace_modules wm
SET
  platform_construction = true,
  platform_consulting = true,
  platform_environmental = true,
  platform_property_mgmt = true,
  platform_cockpit = true,
  platform_reports = true,
  platform_ai = true,
  platform_occupancy = true,
  platform_email_inbox = true,
  platform_qr_scanning = true,
  platform_credential_wallet = true,
  platform_training_hub = true,
  platform_safety_module = true,
  platform_equipment_tracker = true,
  platform_client_portal = true,
  construction_enabled = true,
  consulting_enabled = true,
  environmental_enabled = true,
  property_mgmt_enabled = true,
  cockpit_enabled = true,
  reports_enabled = true,
  ai_enabled = true,
  occupancy_enabled = true,
  email_inbox_enabled = true,
  qr_scanning_enabled = true,
  credential_wallet_enabled = true,
  training_hub_enabled = true,
  safety_module_enabled = true,
  equipment_tracker_enabled = true,
  client_portal_enabled = true,
  package = 'Enterprise'
FROM public.workspaces w
WHERE w.id = wm.workspace_id
  AND lower(coalesce(w.plan, '')) = 'enterprise'
  AND lower(coalesce(wm.package, '')) IS DISTINCT FROM 'enterprise';

-- Property-backed modules: turn on for every property in Enterprise workspaces.
UPDATE public.properties p
SET
  nspire_enabled = true,
  daily_grounds_enabled = true,
  projects_enabled = true
FROM public.workspace_modules wm
WHERE wm.workspace_id = p.workspace_id
  AND lower(coalesce(wm.package, '')) = 'enterprise';
