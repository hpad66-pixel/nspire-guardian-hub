
-- Create unified photo_gallery table
CREATE TABLE IF NOT EXISTS public.photo_gallery (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Context: either property OR project (one of these is set, not both)
  property_id   uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  -- The actual photo
  url           text NOT NULL,
  caption       text DEFAULT '',
  taken_at      date NOT NULL DEFAULT CURRENT_DATE,
  -- Source tracking (for back-navigation)
  source        text NOT NULL DEFAULT 'direct',
  -- 'grounds_inspection' | 'nspire_inspection' | 'daily_report' | 'direct'
  source_id     uuid,
  source_label  text,
  source_route  text,
  -- Metadata
  uploaded_by   uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  -- Constraint: must belong to either a property or project (or neither for flexibility)
  CONSTRAINT photo_gallery_context CHECK (
    (property_id IS NOT NULL AND project_id IS NULL) OR
    (project_id IS NOT NULL AND property_id IS NULL) OR
    (property_id IS NULL AND project_id IS NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_photo_gallery_property ON public.photo_gallery(property_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_gallery_project ON public.photo_gallery(project_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_gallery_source ON public.photo_gallery(source, source_id);
CREATE INDEX IF NOT EXISTS idx_photo_gallery_url_property ON public.photo_gallery(url, property_id);
CREATE INDEX IF NOT EXISTS idx_photo_gallery_url_project ON public.photo_gallery(url, project_id);

-- Enable RLS
ALTER TABLE public.photo_gallery ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view gallery photos"
  ON public.photo_gallery FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert gallery photos"
  ON public.photo_gallery FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own gallery photos or any caption"
  ON public.photo_gallery FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own gallery photos"
  ON public.photo_gallery FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid() OR auth.uid() IS NOT NULL);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_photo_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_photo_gallery_updated_at
  BEFORE UPDATE ON public.photo_gallery
  FOR EACH ROW
  EXECUTE FUNCTION public.update_photo_gallery_updated_at();
