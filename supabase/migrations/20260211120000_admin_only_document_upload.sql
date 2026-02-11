-- Restrict organization document uploads to admins only
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON public.organization_documents;
CREATE POLICY "Admins can upload documents"
ON public.organization_documents FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND auth.uid() = uploaded_by
);

-- Restrict storage uploads to admins only
DROP POLICY IF EXISTS "Authenticated users can upload org documents" ON storage.objects;
CREATE POLICY "Admins can upload org documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'organization-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);
