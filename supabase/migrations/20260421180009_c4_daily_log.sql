-- ============================================================
-- C4 · Daily Log (14 categories) — enhance daily_reports + child tables.
-- ============================================================

-- Forward-declare incidents stub so daily_accidents.incident_id FK resolves
-- even if E2 migration applies after this one. Real constraint added in E2.
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS report_date date,
  ADD COLUMN IF NOT EXISTS superintendent_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_path text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_reports_project_date_unique'
  ) THEN
    BEGIN
      ALTER TABLE public.daily_reports
        ADD CONSTRAINT daily_reports_project_date_unique UNIQUE (project_id, report_date);
    EXCEPTION
      WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.daily_weather (
  daily_report_id uuid PRIMARY KEY REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  low_temp_f int,
  high_temp_f int,
  precipitation_in numeric,
  wind_mph int,
  conditions text,
  source text NOT NULL DEFAULT 'openweather',
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_manpower (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id),
  trade text,
  workers int NOT NULL DEFAULT 0,
  hours numeric NOT NULL DEFAULT 0,
  notes text
);

CREATE TABLE IF NOT EXISTS public.daily_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  equipment_name text,
  hours_used numeric,
  organization_id uuid REFERENCES public.organizations(id)
);

CREATE TABLE IF NOT EXISTS public.daily_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  from_vendor text,
  description text,
  received_by text,
  time_received time
);

CREATE TABLE IF NOT EXISTS public.daily_safety_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  description text,
  severity text,
  corrective_action text
);

CREATE TABLE IF NOT EXISTS public.daily_accidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  brief text,
  incident_id uuid REFERENCES public.incidents(id)
);

CREATE TABLE IF NOT EXISTS public.daily_quantities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  cost_code_id uuid REFERENCES public.cost_codes(id),
  qty numeric,
  uom text
);

CREATE TABLE IF NOT EXISTS public.daily_productivity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  cost_code_id uuid REFERENCES public.cost_codes(id),
  actual_qty numeric,
  actual_hours numeric
);

CREATE TABLE IF NOT EXISTS public.daily_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  name text, company text, purpose text, arrived_at time, left_at time
);

CREATE TABLE IF NOT EXISTS public.daily_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  caller text, subject text, notes text, at_time time
);

CREATE TABLE IF NOT EXISTS public.daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  body text
);

CREATE TABLE IF NOT EXISTS public.daily_dumpster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  vendor text, size text, material text, hauled_at time
);

CREATE TABLE IF NOT EXISTS public.daily_scheduled_work (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  description text,
  organization_id uuid REFERENCES public.organizations(id),
  planned boolean DEFAULT true
);

-- RLS — child tables inherit via parent daily_reports
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'daily_weather','daily_manpower','daily_equipment','daily_deliveries',
    'daily_safety_violations','daily_accidents','daily_quantities','daily_productivity',
    'daily_visitors','daily_calls','daily_notes','daily_dumpster','daily_scheduled_work'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY %1$s_via_parent ON public.%1$s FOR ALL TO authenticated
        USING (EXISTS (SELECT 1 FROM public.daily_reports dr WHERE dr.id = %1$s.daily_report_id))
        WITH CHECK (EXISTS (SELECT 1 FROM public.daily_reports dr WHERE dr.id = %1$s.daily_report_id))
    $f$, t);
  END LOOP;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
