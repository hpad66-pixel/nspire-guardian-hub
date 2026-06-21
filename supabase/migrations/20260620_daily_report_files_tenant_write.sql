-- Allow authenticated users to write to the public daily-report-files bucket,
-- scoped to their own tenant (first path segment = tenant id). The bucket is
-- public for reads (signed CO PDFs are viewed via public URL); this adds the
-- missing write policies so in-app uploads (change orders, pay-app docs,
-- attachments) succeed under RLS instead of being default-denied.
CREATE POLICY "daily_report_files_tenant_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'daily-report-files'
    AND ((storage.foldername(name))[1] = (public.current_tenant_id())::text OR public.is_super_admin())
  );

CREATE POLICY "daily_report_files_tenant_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'daily-report-files'
    AND ((storage.foldername(name))[1] = (public.current_tenant_id())::text OR public.is_super_admin())
  )
  WITH CHECK (
    bucket_id = 'daily-report-files'
    AND ((storage.foldername(name))[1] = (public.current_tenant_id())::text OR public.is_super_admin())
  );

CREATE POLICY "daily_report_files_tenant_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'daily-report-files'
    AND ((storage.foldername(name))[1] = (public.current_tenant_id())::text OR public.is_super_admin())
  );
