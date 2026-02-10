
-- Phase 1: Add voice_agent to issue_source enum
ALTER TYPE issue_source ADD VALUE IF NOT EXISTS 'voice_agent';

-- Phase 2: Add maintenance_request_id FK to issues table
ALTER TABLE issues ADD COLUMN IF NOT EXISTS maintenance_request_id UUID REFERENCES maintenance_requests(id);

-- Phase 3: Add administrator and clerk to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'administrator';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'clerk';

-- Phase 4: Create asset_type_definitions table
CREATE TABLE IF NOT EXISTS public.asset_type_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_type_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view asset type definitions"
ON public.asset_type_definitions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage asset type definitions"
ON public.asset_type_definitions FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'manager'))
);

-- Seed system asset types
INSERT INTO public.asset_type_definitions (key, label, is_system) VALUES
  ('cleanout', 'Cleanout', true),
  ('catch_basin', 'Catch Basin', true),
  ('lift_station', 'Lift Station', true),
  ('retention_pond', 'Retention Pond', true),
  ('general_grounds', 'General Grounds', true)
ON CONFLICT (key) DO NOTHING;
