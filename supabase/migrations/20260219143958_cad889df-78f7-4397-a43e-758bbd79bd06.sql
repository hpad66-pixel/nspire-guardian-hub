
-- 1. Schools registry
CREATE TABLE public.lw_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  school_url TEXT NOT NULL,
  api_key TEXT,
  client_id TEXT,
  client_secret TEXT,
  sso_secret TEXT,
  categories TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  logo_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one default school at a time
CREATE UNIQUE INDEX idx_lw_schools_default
  ON public.lw_schools(is_default)
  WHERE is_default = true;

-- updated_at trigger
CREATE TRIGGER update_lw_schools_updated_at
  BEFORE UPDATE ON public.lw_schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. School-to-tenant/user assignments
CREATE TABLE public.lw_school_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL
    REFERENCES public.lw_schools(id) ON DELETE CASCADE,
  workspace_id UUID,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 2,
  assigned_by UUID REFERENCES public.profiles(user_id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_assignment_target CHECK (
    (workspace_id IS NOT NULL AND user_id IS NULL) OR
    (workspace_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE INDEX idx_lw_school_assignments_workspace
  ON public.lw_school_assignments(workspace_id);
CREATE INDEX idx_lw_school_assignments_user
  ON public.lw_school_assignments(user_id);
CREATE INDEX idx_lw_school_assignments_school
  ON public.lw_school_assignments(school_id);

-- 3. Enable RLS
ALTER TABLE public.lw_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lw_school_assignments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — lw_schools
CREATE POLICY "Authenticated users can view schools"
  ON public.lw_schools FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin manages schools"
  ON public.lw_schools FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies — lw_school_assignments
CREATE POLICY "Users see own school assignments"
  ON public.lw_school_assignments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Org admins see workspace assignments"
  ON public.lw_school_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Super admin manages assignments"
  ON public.lw_school_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 5. Seed three schools
INSERT INTO public.lw_schools
  (name, slug, school_url, categories, description, is_default, is_active)
VALUES
  (
    'Glorietta Gardens Apartments',
    'glorietta-gardens',
    'https://glorietta-gardens.learnworlds.com',
    ARRAY['property_management','compliance','safety'],
    'Training portal for Glorietta Gardens residents and staff',
    false,
    true
  ),
  (
    'City of Opa-Locka Public Works Department',
    'opa-locka-public-works',
    'https://opa-locka-publicworks.learnworlds.com',
    ARRAY['compliance','safety','hr','leadership'],
    'Official training portal for City of Opa-Locka Public Works employees',
    false,
    true
  ),
  (
    'APAS Labs',
    'apas-labs',
    'https://apas-labs.learnworlds.com',
    ARRAY['ai_productivity','construction','property_management','compliance','safety','hr','leadership','custom'],
    'APAS Labs flagship school — full course library across all verticals',
    true,
    true
  );
