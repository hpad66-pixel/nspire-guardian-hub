
-- 1. Course catalog cache
CREATE TABLE IF NOT EXISTS public.lw_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lw_course_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT,
  duration_minutes INTEGER,
  difficulty TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[],
  lw_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Course assignments
CREATE TABLE IF NOT EXISTS public.training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  lw_course_id TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(user_id),
  assigned_to_role TEXT,
  assigned_by UUID NOT NULL REFERENCES public.profiles(user_id),
  due_date DATE,
  recurrence TEXT,
  recurrence_interval_days INTEGER,
  next_due_date DATE,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Completion records
CREATE TABLE IF NOT EXISTS public.training_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  lw_course_id TEXT NOT NULL,
  lw_completion_id TEXT,
  completed_at TIMESTAMPTZ NOT NULL,
  score INTEGER,
  passed BOOLEAN,
  certificate_url TEXT,
  certificate_id TEXT,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SSO session log
CREATE TABLE IF NOT EXISTS public.lw_sso_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  lw_course_id TEXT,
  token_hash TEXT NOT NULL,
  launched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- 5. Training share links (mirrors credential_share_links pattern)
CREATE TABLE IF NOT EXISTS public.training_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_id UUID NOT NULL REFERENCES public.training_completions(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  accessed_at TIMESTAMPTZ,
  access_count INTEGER NOT NULL DEFAULT 0,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Enable RLS
ALTER TABLE public.lw_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lw_sso_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_share_links ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies — lw_courses
CREATE POLICY "Authenticated users can view courses"
  ON public.lw_courses FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 8. RLS Policies — training_assignments
CREATE POLICY "Users see own assignments"
  ON public.training_assignments FOR SELECT
  USING (assigned_to = auth.uid());

CREATE POLICY "Admins see all assignments"
  ON public.training_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

CREATE POLICY "Admins manage assignments"
  ON public.training_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

-- 9. RLS Policies — training_completions
CREATE POLICY "Users see own completions"
  ON public.training_completions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins see all completions"
  ON public.training_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

CREATE POLICY "Users insert own completions"
  ON public.training_completions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 10. RLS Policies — lw_sso_sessions
CREATE POLICY "Users manage own SSO sessions"
  ON public.lw_sso_sessions FOR ALL
  USING (user_id = auth.uid());

-- 11. RLS Policies — training_share_links
CREATE POLICY "Users manage own training share links"
  ON public.training_share_links FOR ALL
  USING (created_by = auth.uid());

-- 12. Indexes
CREATE INDEX IF NOT EXISTS idx_training_completions_user 
  ON public.training_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_course 
  ON public.training_completions(lw_course_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_user 
  ON public.training_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_training_assignments_workspace 
  ON public.training_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lw_courses_category 
  ON public.lw_courses(category);
CREATE INDEX IF NOT EXISTS idx_training_share_links_token
  ON public.training_share_links(token);
CREATE INDEX IF NOT EXISTS idx_training_share_links_expires
  ON public.training_share_links(expires_at);
