-- Asset type definitions (dynamic types)
CREATE TABLE IF NOT EXISTS public.asset_type_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.asset_type_definitions ENABLE ROW LEVEL SECURITY;

-- Seed default system types
INSERT INTO public.asset_type_definitions (key, label, is_system)
VALUES
  ('cleanout', 'Cleanout', true),
  ('catch_basin', 'Catch Basin', true),
  ('lift_station', 'Lift Station', true),
  ('retention_pond', 'Retention Pond', true),
  ('general_grounds', 'General Grounds', true)
ON CONFLICT (key) DO NOTHING;

-- Allow reading asset types to all authenticated users
CREATE POLICY "Authenticated users can view asset types"
ON public.asset_type_definitions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins/managers can manage asset types
CREATE POLICY "Admins and managers can create asset types"
ON public.asset_type_definitions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update asset types"
ON public.asset_type_definitions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can delete asset types"
ON public.asset_type_definitions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Convert assets.asset_type enum to text for dynamic types
ALTER TABLE public.assets
  ALTER COLUMN asset_type TYPE TEXT
  USING asset_type::text;
