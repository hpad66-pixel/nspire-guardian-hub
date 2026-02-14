
-- Phase 1: NSPIRE Compliance Schema Enhancements

-- 1. Add life_threatening and point_value to defects
ALTER TABLE public.defects
  ADD COLUMN life_threatening boolean NOT NULL DEFAULT false,
  ADD COLUMN point_value numeric NULL;

-- 2. Add scoring columns and retention to inspections
ALTER TABLE public.inspections
  ADD COLUMN nspire_score numeric NULL,
  ADD COLUMN unit_performance_score numeric NULL,
  ADD COLUMN data_retention_until date NULL;

-- 3. Trigger to auto-set data_retention_until = inspection_date + 3 years
CREATE OR REPLACE FUNCTION public.set_inspection_retention()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_retention_until := NEW.inspection_date + INTERVAL '3 years';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_set_inspection_retention
  BEFORE INSERT OR UPDATE OF inspection_date ON public.inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_inspection_retention();

-- Backfill existing inspections
UPDATE public.inspections SET data_retention_until = inspection_date + INTERVAL '3 years' WHERE data_retention_until IS NULL;

-- 4. NSPIRE Scoring Weights reference table (12 defect categories from the book)
CREATE TABLE public.nspire_scoring_weights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL UNIQUE,
  area text NOT NULL, -- 'outside', 'inside', 'unit'
  weight numeric NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nspire_scoring_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scoring weights"
  ON public.nspire_scoring_weights FOR SELECT
  USING (true);

-- Insert the 12 category weights from the book
INSERT INTO public.nspire_scoring_weights (category, area, weight, display_order) VALUES
  ('Electrical', 'outside', 2.5, 1),
  ('Safety', 'outside', 2.5, 2),
  ('Fire Safety', 'outside', 3.0, 3),
  ('HVAC', 'outside', 2.0, 4),
  ('Signage', 'outside', 1.0, 5),
  ('Site', 'outside', 1.5, 6),
  ('Plumbing', 'outside', 2.0, 7),
  ('Structure', 'outside', 2.5, 8),
  ('Egress', 'inside', 3.0, 9),
  ('Lead Paint', 'inside', 3.0, 10),
  ('Health', 'unit', 2.5, 11),
  ('Security', 'unit', 1.5, 12);

-- 5. HUD Sample Size lookup table
CREATE TABLE public.hud_sample_sizes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_units integer NOT NULL,
  max_units integer NOT NULL,
  sample_size integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hud_sample_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sample sizes"
  ON public.hud_sample_sizes FOR SELECT
  USING (true);

-- HUD sample size table from the book
INSERT INTO public.hud_sample_sizes (min_units, max_units, sample_size) VALUES
  (1, 4, 1),
  (5, 24, 5),
  (25, 49, 10),
  (50, 74, 15),
  (75, 99, 18),
  (100, 149, 22),
  (150, 199, 27),
  (200, 249, 31),
  (250, 299, 35),
  (300, 399, 40),
  (400, 499, 45),
  (500, 624, 50),
  (625, 749, 55),
  (750, 920, 60),
  (921, 999999, 65);
