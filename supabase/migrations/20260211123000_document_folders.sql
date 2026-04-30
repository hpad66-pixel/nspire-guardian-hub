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
-- (Fixed 2026-04-21: the original UPDATE put `od.subfolder` inside a LEFT JOIN
--  ON clause, which Postgres rejects — the UPDATE target can't be referenced
--  from a JOIN in the FROM list. Split into two independent steps so the
--  parent/child folders are created first, then each document is updated via
--  correlated subqueries that DO allow reference to `od`.)

-- Step 1: create parent folders (one per distinct non-empty folder name)
INSERT INTO public.document_folders (name)
SELECT DISTINCT folder
FROM public.organization_documents
WHERE folder IS NOT NULL AND folder <> ''
ON CONFLICT DO NOTHING;

-- Step 2: create child folders (one per distinct folder+subfolder pair)
INSERT INTO public.document_folders (name, parent_id)
SELECT DISTINCT od.subfolder, pf.id
FROM public.organization_documents od
JOIN public.document_folders pf
  ON pf.parent_id IS NULL AND pf.name = od.folder
WHERE od.subfolder IS NOT NULL AND od.subfolder <> ''
ON CONFLICT DO NOTHING;

-- Step 3: set folder_id on each document using correlated subqueries.
-- Prefer a matching child folder when the document has a subfolder; otherwise
-- fall back to the parent folder that matches its folder name.
UPDATE public.organization_documents od
SET folder_id = COALESCE(
  (
    SELECT cf.id
    FROM public.document_folders cf
    JOIN public.document_folders pf ON pf.id = cf.parent_id
    WHERE pf.parent_id IS NULL
      AND pf.name = od.folder
      AND cf.name = od.subfolder
    LIMIT 1
  ),
  (
    SELECT pf.id
    FROM public.document_folders pf
    WHERE pf.parent_id IS NULL
      AND pf.name = od.folder
    LIMIT 1
  )
)
WHERE od.folder IS NOT NULL AND od.folder <> '';
