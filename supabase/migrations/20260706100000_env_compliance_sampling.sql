-- Environmental Compliance module — Sampling capability.
-- Locations carry coordinates from day one so contour maps / GIS overlays are
-- possible later with no schema rebuild. Results carry the permit limit + type
-- so exceedances are first-class (stored, not recomputed) for reports + alerts.

CREATE TABLE IF NOT EXISTS public.sampling_locations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name          text NOT NULL,
  code          text,                       -- e.g. "MW-3", "Outfall 001"
  location_type text,                       -- outfall | monitoring_well | surface_water | influent | effluent | other
  latitude      numeric,                    -- for maps / contours later
  longitude     numeric,
  description   text,
  sort_order    integer NOT NULL DEFAULT 0,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sampling_results (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  location_id       uuid NOT NULL REFERENCES public.sampling_locations(id) ON DELETE CASCADE,
  sample_date       date NOT NULL,
  parameter         text NOT NULL,          -- pH, TSS, BOD, COD, Oil & Grease, ...
  value             numeric,
  unit              text,                   -- mg/L, NTU, SU, ...
  detection_limit   numeric,
  permit_limit      numeric,
  permit_limit_type text,                   -- daily_max | monthly_avg | instantaneous
  is_exceedance     boolean NOT NULL DEFAULT false,
  exceedance_percent numeric,
  method            text,
  sampled_by        text,
  notes             text,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sampling_locations_project_idx ON public.sampling_locations (project_id);
CREATE INDEX IF NOT EXISTS sampling_results_project_idx   ON public.sampling_results (project_id);
CREATE INDEX IF NOT EXISTS sampling_results_location_idx  ON public.sampling_results (location_id);
CREATE INDEX IF NOT EXISTS sampling_results_param_idx     ON public.sampling_results (parameter);

ALTER TABLE public.sampling_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sampling_results   ENABLE ROW LEVEL SECURITY;

CREATE POLICY sampling_locations_tenant ON public.sampling_locations
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY sampling_results_tenant ON public.sampling_results
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

NOTIFY pgrst, 'reload schema';
