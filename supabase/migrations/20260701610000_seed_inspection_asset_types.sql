-- The paper inspection form has first-class Manhole and Sewer By-pass Pump Station
-- sections. assets.asset_type is text (dynamic types), so add these as system
-- asset-type definitions so they appear in the asset picker and carry their own
-- structured checklist (see checklistTemplates.ts).
INSERT INTO public.asset_type_definitions (key, label, is_system)
VALUES
  ('manhole', 'Manhole', true),
  ('bypass_station', 'Sewer By-pass Pump Station', true)
ON CONFLICT (key) DO NOTHING;
