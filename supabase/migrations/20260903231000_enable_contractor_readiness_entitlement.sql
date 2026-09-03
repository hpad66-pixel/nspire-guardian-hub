-- Include Contractor Readiness in Enterprise and guarantee access for the
-- canonical APAS operating workspace. The module columns were introduced
-- after the original Enterprise unlock migration, so existing Enterprise
-- tenants otherwise retained the new columns' false defaults.

BEGIN;

UPDATE public.workspace_modules wm
SET contractor_readiness_enabled = true,
    platform_contractor_readiness = true
FROM public.workspaces w
WHERE w.id = wm.workspace_id
  AND (
    lower(coalesce(w.plan, '')) = 'enterprise'
    OR lower(coalesce(wm.package, '')) = 'enterprise'
  );

INSERT INTO public.workspace_modules (
  workspace_id,
  contractor_readiness_enabled,
  platform_contractor_readiness
)
SELECT DISTINCT p.workspace_id, true, true
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.workspace_id IS NOT NULL
  AND lower(u.email) = lower('hardeep@apas.ai')
ON CONFLICT (workspace_id) DO UPDATE
SET contractor_readiness_enabled = true,
    platform_contractor_readiness = true;

COMMIT;
