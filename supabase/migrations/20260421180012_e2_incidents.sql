-- ============================================================
-- E2 · Incidents (OSHA 300/301).
-- The stub incidents table was created in C4; this migration fully populates it.
-- ============================================================

-- Fill out incidents table with the full OSHA column set
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reporter_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.project_locations(id),
  ADD COLUMN IF NOT EXISTS incident_type text CHECK (incident_type IN
    ('injury','illness','near_miss','env','property','theft')),
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS osha_recordable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS osha_days_away int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS osha_restricted_days int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS osha_case_number text,
  ADD COLUMN IF NOT EXISTS witness_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_inc_project ON public.incidents(project_id);
CREATE INDEX IF NOT EXISTS idx_inc_tenant ON public.incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inc_osha ON public.incidents(tenant_id, osha_recordable) WHERE osha_recordable = true;

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY inc_tenant ON public.incidents FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.incident_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  contact_id uuid REFERENCES public.crm_contacts(id),
  role text CHECK (role IN ('injured','witness','first_responder')),
  injury_description text,
  body_part text
);

CREATE TABLE IF NOT EXISTS public.incident_root_causes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  category text,
  description text
);

CREATE TABLE IF NOT EXISTS public.incident_corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  description text NOT NULL,
  assignee_id uuid REFERENCES auth.users(id),
  due_date date,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_root_causes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_corrective_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ipers_via_inc ON public.incident_persons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_persons.incident_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_persons.incident_id));

CREATE POLICY irc_via_inc ON public.incident_root_causes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_root_causes.incident_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_root_causes.incident_id));

CREATE POLICY ica_via_inc ON public.incident_corrective_actions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_corrective_actions.incident_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_corrective_actions.incident_id));

DROP TRIGGER IF EXISTS trg_inc_updated_at ON public.incidents;
CREATE TRIGGER trg_inc_updated_at BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
