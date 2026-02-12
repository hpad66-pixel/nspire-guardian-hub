
CREATE TABLE public.document_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view document folders"
  ON public.document_folders FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can create document folders"
  ON public.document_folders FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update document folders"
  ON public.document_folders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete document folders"
  ON public.document_folders FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add folder_id FK to organization_documents if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_documents' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE public.organization_documents ADD COLUMN folder_id UUID REFERENCES public.document_folders(id);
  END IF;
END $$;

CREATE TRIGGER update_document_folders_updated_at
  BEFORE UPDATE ON public.document_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
