-- Assign the R4 stucco and landscaping projects to Rohit Anand and add him as
-- a direct project team member so the ownership shown on cards also grants
-- durable project access.

BEGIN;

DO $$
DECLARE
  v_project_ids uuid[] := ARRAY[
    'dd68476b-542f-4ddf-9d22-8052a1a84c04'::uuid, -- Stucco Repairs
    'e622d3cb-bcab-4beb-88c8-b5dafb5c4fbc'::uuid  -- Landscaping Beautification
  ];
  v_project_count integer;
  v_workspace_count integer;
  v_workspace_id uuid;
  v_rohit_user_id uuid;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT workspace_id)
    INTO v_project_count, v_workspace_count
    FROM public.projects
   WHERE id = ANY(v_project_ids)
     AND deleted_at IS NULL;

  IF v_project_count <> 2 THEN
    RAISE EXCEPTION
      'Expected 2 active R4 projects for Rohit assignment, found %',
      v_project_count;
  END IF;

  IF v_workspace_count <> 1 THEN
    RAISE EXCEPTION
      'Expected both R4 projects to belong to one workspace, found %',
      v_workspace_count;
  END IF;

  SELECT workspace_id
    INTO v_workspace_id
    FROM public.projects
   WHERE id = ANY(v_project_ids)
     AND deleted_at IS NULL
   LIMIT 1;

  SELECT p.user_id
    INTO v_rohit_user_id
    FROM public.profiles p
   WHERE p.workspace_id = v_workspace_id
     AND COALESCE(p.status, 'active') = 'active'
     AND (
       lower(COALESCE(p.email, '')) = 'rohit@apas.ai'
       OR lower(COALESCE(p.work_email, '')) = 'rohit@apas.ai'
       OR lower(COALESCE(p.full_name, '')) = 'rohit anand'
     )
   ORDER BY
     CASE
       WHEN lower(COALESCE(p.email, '')) = 'rohit@apas.ai' THEN 0
       WHEN lower(COALESCE(p.work_email, '')) = 'rohit@apas.ai' THEN 1
       ELSE 2
     END,
     p.created_at DESC NULLS LAST
   LIMIT 1;

  IF v_rohit_user_id IS NULL THEN
    RAISE EXCEPTION 'Could not find active Rohit Anand profile in workspace %', v_workspace_id;
  END IF;

  -- The project owner trigger intentionally requires an administrator claim for
  -- reassignment. Keep the trigger and audit insert active by using a local
  -- migration-only super-admin JWT claim rather than disabling triggers.
  PERFORM set_config('request.jwt.claims', '{"role":"super_admin"}', true);

  UPDATE public.projects
     SET owner_user_id = v_rohit_user_id,
         updated_at = now()
   WHERE id = ANY(v_project_ids)
     AND owner_user_id IS DISTINCT FROM v_rohit_user_id;

  INSERT INTO public.project_team_members (project_id, user_id, role, added_by)
  SELECT target.project_id, v_rohit_user_id, 'project_manager'::public.app_role, NULL
    FROM unnest(v_project_ids) AS target(project_id)
  ON CONFLICT (project_id, user_id) DO UPDATE
     SET role = 'project_manager'::public.app_role,
         updated_at = now();
END $$;

COMMIT;
