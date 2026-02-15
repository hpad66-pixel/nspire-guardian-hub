-- Create document_folders table for first-class folders
CREATE TABLE public.document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.document_folders(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure unique folder names per parent (case-insensitive)
CREATE UNIQUE INDEX document_folders_parent_name_key
ON public.document_folders (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- Enable RLS
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view document folders"
ON public.document_folders FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and owners can create document folders"
ON public.document_folders FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Admins and owners can update document folders"
ON public.document_folders FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Admins and owners can delete document folders"
ON public.document_folders FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);

-- updated_at trigger
CREATE TRIGGER update_document_folders_updated_at
BEFORE UPDATE ON public.document_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add folder_id to organization_documents
ALTER TABLE public.organization_documents
ADD COLUMN folder_id UUID REFERENCES public.document_folders(id) ON DELETE RESTRICT;

CREATE INDEX organization_documents_folder_id_idx
ON public.organization_documents (folder_id);

-- Backfill folders and folder_id based on existing folder/subfolder columns
WITH parent_folders AS (
  INSERT INTO public.document_folders (name)
  SELECT DISTINCT folder
  FROM public.organization_documents
  WHERE folder IS NOT NULL AND folder <> ''
  ON CONFLICT DO NOTHING
  RETURNING id, name
),
parent_map AS (
  SELECT id, name
  FROM public.document_folders
  WHERE parent_id IS NULL
),
child_folders AS (
  INSERT INTO public.document_folders (name, parent_id)
  SELECT DISTINCT od.subfolder, pm.id
  FROM public.organization_documents od
  JOIN parent_map pm ON pm.name = od.folder
  WHERE od.subfolder IS NOT NULL AND od.subfolder <> ''
  ON CONFLICT DO NOTHING
  RETURNING id, name, parent_id
),
child_map AS (
  SELECT id, name, parent_id
  FROM public.document_folders
  WHERE parent_id IS NOT NULL
)
UPDATE public.organization_documents od
SET folder_id = COALESCE(cf.id, pm.id)
FROM parent_map pm
LEFT JOIN child_map cf
  ON cf.parent_id = pm.id AND cf.name = od.subfolder
WHERE pm.name = od.folder;
