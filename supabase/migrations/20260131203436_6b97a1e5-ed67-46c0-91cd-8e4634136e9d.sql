-- Asset types enum
CREATE TYPE asset_type AS ENUM (
  'cleanout', 
  'catch_basin', 
  'lift_station', 
  'retention_pond', 
  'general_grounds'
);

-- Inspection item status enum
CREATE TYPE inspection_item_status AS ENUM (
  'ok', 
  'needs_attention', 
  'defect_found'
);

-- Assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_type asset_type NOT NULL,
  location_description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status TEXT DEFAULT 'active',
  photo_url TEXT,
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily inspections table
CREATE TABLE public.daily_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspector_id UUID REFERENCES auth.users(id),
  weather TEXT,
  general_notes TEXT,
  general_notes_html TEXT,
  voice_transcript TEXT,
  status TEXT DEFAULT 'in_progress',
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(property_id, inspection_date)
);

-- Daily inspection items table (per asset)
CREATE TABLE public.daily_inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_inspection_id UUID NOT NULL REFERENCES public.daily_inspections(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  status inspection_item_status DEFAULT 'ok',
  photo_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  defect_description TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inspection_items ENABLE ROW LEVEL SECURITY;

-- Assets RLS policies
CREATE POLICY "Authenticated users can view assets"
ON public.assets FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can create assets"
ON public.assets FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update assets"
ON public.assets FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete assets"
ON public.assets FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Daily inspections RLS policies
CREATE POLICY "Authenticated users can view daily inspections"
ON public.daily_inspections FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create daily inspections"
ON public.daily_inspections FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Inspectors can update their inspections"
ON public.daily_inspections FOR UPDATE
USING (inspector_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Daily inspection items RLS policies
CREATE POLICY "Authenticated users can view inspection items"
ON public.daily_inspection_items FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create inspection items"
ON public.daily_inspection_items FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update inspection items"
ON public.daily_inspection_items FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Create updated_at trigger for assets
CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_assets_property_id ON public.assets(property_id);
CREATE INDEX idx_assets_asset_type ON public.assets(asset_type);
CREATE INDEX idx_daily_inspections_property_id ON public.daily_inspections(property_id);
CREATE INDEX idx_daily_inspections_inspection_date ON public.daily_inspections(inspection_date);
CREATE INDEX idx_daily_inspection_items_daily_inspection_id ON public.daily_inspection_items(daily_inspection_id);
CREATE INDEX idx_daily_inspection_items_asset_id ON public.daily_inspection_items(asset_id);