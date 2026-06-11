-- Repair workspace linkage for older environments where users existed
-- before the workspace/bootstrap migrations fully attached them.
--
-- This backfills three linkage paths used across the app:
-- 1. profiles.workspace_id          (legacy RLS helper source)
-- 2. portal_memberships.tenant_id   (modern JWT tenant source)
-- 3. workspaces.owner_user_id       (fallback for single-owner installs)

BEGIN;

-- Ensure there is at least one workspace to attach to.
INSERT INTO public.workspaces (id, name, slug, plan, status, trial_ends_at)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Default Workspace',
  'default',
  'enterprise',
  'active',
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces
);

-- If there is exactly one auth user and a workspace without an owner,
-- attach that user as owner. This matches the single-admin bootstrap case.
DO $$
DECLARE
  v_only_user uuid;
BEGIN
  SELECT u.id
    INTO v_only_user
    FROM auth.users u
   LIMIT 1;

  IF v_only_user IS NOT NULL
     AND (SELECT count(*) FROM auth.users) = 1 THEN
    UPDATE public.workspaces w
       SET owner_user_id = v_only_user
     WHERE w.owner_user_id IS NULL;
  END IF;
END $$;

-- Backfill profiles.workspace_id from the best available source.
UPDATE public.profiles p
   SET workspace_id = resolved.workspace_id
  FROM (
    SELECT
      p2.user_id,
      COALESCE(
        p2.workspace_id,
        (
          SELECT pm.tenant_id
            FROM public.portal_memberships pm
           WHERE pm.user_id = p2.user_id
             AND pm.is_active = true
           ORDER BY CASE pm.portal_kind
             WHEN 'main' THEN 1
             WHEN 'owner' THEN 2
             WHEN 'sub' THEN 3
             ELSE 4
           END
           LIMIT 1
        ),
        (
          SELECT w.id
            FROM public.workspaces w
           WHERE w.owner_user_id = p2.user_id
           LIMIT 1
        ),
        (
          SELECT w.id
            FROM public.workspaces w
           ORDER BY w.created_at
           LIMIT 1
        )
      ) AS workspace_id
    FROM public.profiles p2
  ) AS resolved
 WHERE p.user_id = resolved.user_id
   AND p.workspace_id IS NULL
   AND resolved.workspace_id IS NOT NULL;

-- Create a main portal membership for any user missing one, using the
-- profile workspace if available, otherwise an owned/first workspace.
INSERT INTO public.portal_memberships (tenant_id, user_id, portal_kind, role, is_active)
SELECT
  COALESCE(
    p.workspace_id,
    (
      SELECT w.id
        FROM public.workspaces w
       WHERE w.owner_user_id = u.id
       LIMIT 1
    ),
    (
      SELECT w.id
        FROM public.workspaces w
       ORDER BY w.created_at
       LIMIT 1
    )
  ) AS tenant_id,
  u.id,
  'main',
  CASE
    WHEN EXISTS (
      SELECT 1
        FROM public.user_roles ur
       WHERE ur.user_id = u.id
         AND ur.role IN ('owner', 'admin')
    ) THEN 'owner'
    ELSE 'member'
  END,
  true
FROM auth.users u
LEFT JOIN public.profiles p
  ON p.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1
    FROM public.portal_memberships pm
   WHERE pm.user_id = u.id
     AND pm.is_active = true
)
AND COALESCE(
  p.workspace_id,
  (
    SELECT w.id
      FROM public.workspaces w
     WHERE w.owner_user_id = u.id
     LIMIT 1
  ),
  (
    SELECT w.id
      FROM public.workspaces w
     ORDER BY w.created_at
     LIMIT 1
  )
) IS NOT NULL
ON CONFLICT (user_id, tenant_id, portal_kind) DO NOTHING;

COMMIT;
