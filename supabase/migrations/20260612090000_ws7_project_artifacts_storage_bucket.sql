-- ============================================================
-- WS-7 · #1 · Project Repository storage bucket + tenant-scoped RLS.
-- ============================================================
-- The 'project-artifacts' bucket was previously created by a manual
-- Supabase dashboard step (see the note at the bottom of the original
-- 20260611_project_repository.sql). That meant a fresh environment had
-- the project_artifacts TABLE but no BUCKET, so every upload failed with
-- "Bucket not found". This migration provisions the bucket in code and
-- adds storage.objects RLS that scopes objects to the caller's workspace
-- by the first path segment — exactly the pattern the 'project-photos'
-- bucket uses (20260421180004_b4_photos.sql).
--
-- Upload path convention (src/hooks/useProjectArtifacts.ts):
--   `${tenant_id}/${projectId}/<random>.<ext>`
-- so (storage.foldername(name))[1] is the workspace id. current_tenant_id()
-- resolves to the JWT 'tenant_id' claim or, in this deployment, falls back
-- to profiles.workspace_id (20260611123000_ws5_current_tenant_id_fallback.sql).
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-artifacts', 'project-artifacts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS project_artifacts_tenant_read ON storage.objects;
CREATE POLICY project_artifacts_tenant_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-artifacts'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

DROP POLICY IF EXISTS project_artifacts_tenant_insert ON storage.objects;
CREATE POLICY project_artifacts_tenant_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-artifacts'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

DROP POLICY IF EXISTS project_artifacts_tenant_update ON storage.objects;
CREATE POLICY project_artifacts_tenant_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-artifacts'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  )
  WITH CHECK (
    bucket_id = 'project-artifacts'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

DROP POLICY IF EXISTS project_artifacts_tenant_delete ON storage.objects;
CREATE POLICY project_artifacts_tenant_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-artifacts'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );
