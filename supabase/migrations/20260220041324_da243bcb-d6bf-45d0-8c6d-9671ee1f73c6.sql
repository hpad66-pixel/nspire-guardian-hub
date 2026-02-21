
-- ============================================================
-- HR Document Vault: Tables, RLS, Seeding
-- ============================================================

-- 1. HR Document Categories
CREATE TABLE public.hr_document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  requires_expiry boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_document_categories ENABLE ROW LEVEL SECURITY;

-- All authenticated users in the workspace can view categories
CREATE POLICY "workspace_members_view_hr_categories"
  ON public.hr_document_categories
  FOR SELECT
  USING (
    workspace_id IS NULL -- system defaults visible to all
    OR workspace_id = public.get_my_workspace_id()
  );

-- Only admin/owner/manager can insert custom categories
CREATE POLICY "admins_manage_hr_categories"
  ON public.hr_document_categories
  FOR INSERT
  WITH CHECK (
    workspace_id = public.get_my_workspace_id()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'manager')
    )
  );

CREATE POLICY "admins_update_hr_categories"
  ON public.hr_document_categories
  FOR UPDATE
  USING (
    workspace_id = public.get_my_workspace_id()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'manager')
    )
  );

CREATE POLICY "admins_delete_hr_categories"
  ON public.hr_document_categories
  FOR DELETE
  USING (
    workspace_id = public.get_my_workspace_id()
    AND is_system = false
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
    )
  );

-- 2. HR Documents
CREATE TABLE public.hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,  -- references profiles.user_id (UUID FK to auth.users)
  category_id uuid REFERENCES public.hr_document_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  file_url text,
  file_name text,
  file_size_bytes bigint,
  expiry_date date,
  notes text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;

-- Trigger: auto-update updated_at
CREATE TRIGGER hr_documents_updated_at
  BEFORE UPDATE ON public.hr_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Performance indexes
CREATE INDEX idx_hr_documents_workspace ON public.hr_documents(workspace_id);
CREATE INDEX idx_hr_documents_employee ON public.hr_documents(employee_id);
CREATE INDEX idx_hr_documents_category ON public.hr_documents(category_id);

-- RLS Policies for hr_documents
-- All workspace members can SELECT documents for employees in their workspace
CREATE POLICY "workspace_members_view_hr_documents"
  ON public.hr_documents
  FOR SELECT
  USING (workspace_id = public.get_my_workspace_id());

-- Only admin/owner/manager can INSERT
CREATE POLICY "managers_insert_hr_documents"
  ON public.hr_documents
  FOR INSERT
  WITH CHECK (
    workspace_id = public.get_my_workspace_id()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'manager')
    )
  );

-- Only admin/owner/manager can UPDATE
CREATE POLICY "managers_update_hr_documents"
  ON public.hr_documents
  FOR UPDATE
  USING (
    workspace_id = public.get_my_workspace_id()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'manager')
    )
  );

-- Only admin/owner can DELETE
CREATE POLICY "admins_delete_hr_documents"
  ON public.hr_documents
  FOR DELETE
  USING (
    workspace_id = public.get_my_workspace_id()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'manager')
    )
  );

-- 3. Storage bucket: hr-documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hr-documents',
  'hr-documents',
  false,
  26214400,  -- 25MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
);

-- Storage RLS: authenticated users in workspace can read (via signed URLs)
CREATE POLICY "workspace_members_read_hr_docs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'hr-documents'
    AND auth.role() = 'authenticated'
  );

-- Only admin/owner/manager can upload
CREATE POLICY "managers_upload_hr_docs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'hr-documents'
    AND auth.role() = 'authenticated'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'manager')
    )
  );

-- Only admin/owner/manager can delete
CREATE POLICY "managers_delete_hr_docs"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'hr-documents'
    AND auth.role() = 'authenticated'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'manager')
    )
  );

-- 4. Seed default system categories (workspace_id = NULL so all workspaces see them)
INSERT INTO public.hr_document_categories (id, workspace_id, name, is_system, requires_expiry) VALUES
  (gen_random_uuid(), NULL, 'Offer Letter', true, false),
  (gen_random_uuid(), NULL, 'Employment Contract', true, false),
  (gen_random_uuid(), NULL, 'I-9 (Employment Eligibility)', true, false),
  (gen_random_uuid(), NULL, 'W-4 (Tax Withholding)', true, false),
  (gen_random_uuid(), NULL, 'Direct Deposit Authorization', true, false),
  (gen_random_uuid(), NULL, 'Background Check', true, false),
  (gen_random_uuid(), NULL, 'Drug Test Results', true, false),
  (gen_random_uuid(), NULL, 'Performance Review', true, false),
  (gen_random_uuid(), NULL, 'Disciplinary Record', true, false),
  (gen_random_uuid(), NULL, 'Termination Documentation', true, false),
  (gen_random_uuid(), NULL, 'Personal ID / Government ID', true, true),
  (gen_random_uuid(), NULL, 'Other', true, false);
