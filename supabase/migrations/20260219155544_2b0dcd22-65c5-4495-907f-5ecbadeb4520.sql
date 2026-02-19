
-- Safety Incident Log Module Migration

-- 1. Main safety incidents table
CREATE TABLE public.safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  
  -- Source reference
  source_type TEXT,
  source_id UUID,

  -- Incident basics (filled by field worker)
  incident_date DATE NOT NULL,
  incident_time TIME,
  location_description TEXT NOT NULL,
  what_happened TEXT NOT NULL,

  -- People involved
  injured_employee_id UUID REFERENCES public.profiles(user_id),
  injured_employee_name TEXT NOT NULL,
  injured_employee_job_title TEXT,
  injured_employee_department TEXT,
  days_employed INTEGER,

  -- Injury details
  injury_involved BOOLEAN DEFAULT false,
  injury_icon TEXT,
  body_part_affected TEXT,

  -- Witness
  witness_name TEXT,
  witness_contact TEXT,

  -- Reported by
  reported_by UUID NOT NULL REFERENCES public.profiles(user_id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Photos / attachments
  photo_urls TEXT[],

  -- Classification (filled by admin/manager)
  is_osha_recordable BOOLEAN,
  incident_classification TEXT,
  injury_type TEXT,

  -- OSHA outcome fields
  days_away_from_work INTEGER DEFAULT 0,
  days_on_job_transfer INTEGER DEFAULT 0,
  days_on_restriction INTEGER DEFAULT 0,
  resulted_in_death BOOLEAN DEFAULT false,
  resulted_in_days_away BOOLEAN DEFAULT false,
  resulted_in_transfer BOOLEAN DEFAULT false,
  resulted_in_other_recordable BOOLEAN DEFAULT false,

  -- Medical treatment
  medical_treatment TEXT,
  physician_name TEXT,
  facility_name TEXT,

  -- Privacy case
  is_privacy_case BOOLEAN DEFAULT false,

  -- Case number
  case_number TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending_review',

  -- Review
  reviewed_by UUID REFERENCES public.profiles(user_id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Corrective actions
  corrective_actions TEXT,
  corrective_actions_due DATE,
  corrective_actions_completed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Incident attachments
CREATE TABLE public.safety_incident_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL
    REFERENCES public.safety_incidents(id) 
    ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(user_id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_incident_attachments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for safety_incidents

CREATE POLICY "Authenticated users can log incidents"
  ON public.safety_incidents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users see own reported incidents"
  ON public.safety_incidents FOR SELECT
  USING (reported_by = auth.uid());

CREATE POLICY "Managers see all workspace incidents"
  ON public.safety_incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'manager', 'superintendent', 'project_manager')
    )
  );

CREATE POLICY "Managers can classify incidents"
  ON public.safety_incidents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'manager', 'superintendent', 'project_manager')
    )
  );

-- 5. RLS Policies for attachments

CREATE POLICY "Users can add attachments"
  ON public.safety_incident_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users see attachments for visible incidents"
  ON public.safety_incident_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.safety_incidents
      WHERE id = incident_id
      AND (
        reported_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid()
          AND role IN ('admin', 'owner', 'manager', 'superintendent', 'project_manager')
        )
      )
    )
  );

-- 6. Indexes
CREATE INDEX idx_safety_incidents_workspace ON public.safety_incidents(workspace_id);
CREATE INDEX idx_safety_incidents_date ON public.safety_incidents(incident_date);
CREATE INDEX idx_safety_incidents_status ON public.safety_incidents(status);
CREATE INDEX idx_safety_incidents_source ON public.safety_incidents(source_type, source_id);
CREATE INDEX idx_safety_incidents_recordable ON public.safety_incidents(is_osha_recordable);
CREATE INDEX idx_safety_incidents_employee ON public.safety_incidents(injured_employee_id);
CREATE INDEX idx_safety_incidents_reported_by ON public.safety_incidents(reported_by);

-- 7. Update trigger
CREATE TRIGGER update_safety_incidents_updated_at
  BEFORE UPDATE ON public.safety_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Storage bucket for incident photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'safety-incident-photos',
  'safety-incident-photos',
  false,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload incident photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'safety-incident-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view incident photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'safety-incident-photos' AND auth.uid() IS NOT NULL);
