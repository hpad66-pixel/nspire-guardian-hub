-- Guarantee that the canonical APAS operating workspace receives the APAS CRM
-- integration entitlement. Workspace display names are tenant-configurable, so
-- the original name-based enablement is supplemented with the stable APAS
-- administrator membership used by the other enterprise module migrations.

BEGIN;

INSERT INTO public.workspace_modules (
  workspace_id,
  apas_crm_integration_enabled,
  platform_apas_crm_integration
)
SELECT DISTINCT p.workspace_id, true, true
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.workspace_id IS NOT NULL
  AND lower(u.email) = lower('hardeep@apas.ai')
ON CONFLICT (workspace_id) DO UPDATE
SET apas_crm_integration_enabled = true,
    platform_apas_crm_integration = true;

COMMIT;
