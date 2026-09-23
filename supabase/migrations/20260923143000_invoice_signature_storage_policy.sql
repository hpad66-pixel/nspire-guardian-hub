-- Invoice sender signatures are stored in the public daily-report-files bucket
-- under:
--   {tenant_id}/{project_id}/invoices/signature/{invoice_id}-{timestamp}.png
--
-- The older bucket write policy is tenant-folder based. That works for users
-- whose JWT tenant matches the invoice tenant, but it can reject legitimate
-- project invoice signing when the app is operating from a project context and
-- the storage insert is evaluated before the invoice update. Keep the broad
-- tenant guard in place and add a narrow project-scoped signature policy.

DROP POLICY IF EXISTS daily_report_files_invoice_signature_insert ON storage.objects;
CREATE POLICY daily_report_files_invoice_signature_insert
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'daily-report-files'
    AND (storage.foldername(name))[3] = 'invoices'
    AND (storage.foldername(name))[4] = 'signature'
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.workspace_id::text = (storage.foldername(name))[1]
        AND (
          p.workspace_id = public.current_tenant_id()
          OR public.is_super_admin()
        )
    )
  );

DROP POLICY IF EXISTS daily_report_files_invoice_signature_update ON storage.objects;
CREATE POLICY daily_report_files_invoice_signature_update
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'daily-report-files'
    AND (storage.foldername(name))[3] = 'invoices'
    AND (storage.foldername(name))[4] = 'signature'
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.workspace_id::text = (storage.foldername(name))[1]
        AND (
          p.workspace_id = public.current_tenant_id()
          OR public.is_super_admin()
        )
    )
  )
  WITH CHECK (
    bucket_id = 'daily-report-files'
    AND (storage.foldername(name))[3] = 'invoices'
    AND (storage.foldername(name))[4] = 'signature'
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.workspace_id::text = (storage.foldername(name))[1]
        AND (
          p.workspace_id = public.current_tenant_id()
          OR public.is_super_admin()
        )
    )
  );
