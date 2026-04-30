-- Idempotent duplicate of the prior 20260211123000_document_folders migration.
-- (Fixed 2026-04-21: originally tried to CREATE TABLE unconditionally, which
--  fails against a clean DB where the prior migration already created it.
--  Every statement below is now guarded so re-applying against a fresh target
--  is a no-op past the first policy/trigger that's already in place.)

CREATE TABLE IF NOT EXISTS public.document_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

-- Policies: wrap each in DO-block guards so re-runs don't error on duplicates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'document_folders'
                 AND policyname = 'Authenticated users can view document folders') THEN
    CREATE POLICY "Authenticated users can view document folders"
      ON public.document_folders FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'document_folders'
                 AND policyname = 'Admins and managers can create document folders') THEN
    CREATE POLICY "Admins and managers can create document folders"
      ON public.document_folders FOR INSERT
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'document_folders'
                 AND policyname = 'Admins and managers can update document folders') THEN
    CREATE POLICY "Admins and managers can update document folders"
      ON public.document_folders FOR UPDATE
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'document_folders'
                 AND policyname = 'Admins can delete document folders') THEN
    CREATE POLICY "Admins can delete document folders"
      ON public.document_folders FOR DELETE
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add folder_id FK to organization_documents if not exists (already idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_documents' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE public.organization_documents ADD COLUMN folder_id UUID REFERENCES public.document_folders(id);
  END IF;
END $$;

-- Updated-at trigger: drop-and-create so re-runs don't fail on duplicate
DROP TRIGGER IF EXISTS update_document_folders_updated_at ON public.document_folders;
CREATE TRIGGER update_document_folders_updated_at
  BEFORE UPDATE ON public.document_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
