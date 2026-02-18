
-- =============================================
-- WORKSPACE ISOLATION: WORKSPACE-LEVEL TABLES
-- =============================================

-- =============================================
-- 1. CRM_CONTACTS
-- =============================================
ALTER TABLE public.crm_contacts
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.crm_contacts
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

DROP POLICY IF EXISTS "Users can view own personal contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can view property contacts" ON public.crm_contacts;

CREATE POLICY "Workspace members can view contacts"
ON public.crm_contacts FOR SELECT TO authenticated
USING (workspace_id = public.get_my_workspace_id());

-- Update INSERT policies to enforce workspace
DROP POLICY IF EXISTS "Users can create personal contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Admins can create property contacts" ON public.crm_contacts;

CREATE POLICY "Workspace members can create contacts"
ON public.crm_contacts FOR INSERT TO authenticated
WITH CHECK (workspace_id = public.get_my_workspace_id());

-- =============================================
-- 2. CLIENTS
-- =============================================
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.clients
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

CREATE POLICY "Workspace members can view clients"
ON public.clients FOR SELECT TO authenticated
USING (workspace_id = public.get_my_workspace_id());

-- Tighten INSERT to require workspace match
DROP POLICY IF EXISTS "Admins and managers can create clients" ON public.clients;
DROP POLICY IF EXISTS "Managers and admins can insert clients" ON public.clients;

CREATE POLICY "Workspace admins can create clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = public.get_my_workspace_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

-- =============================================
-- 3. TRAINING_COURSES
-- =============================================
ALTER TABLE public.training_courses
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.training_courses
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

DROP POLICY IF EXISTS "Authenticated users can view active courses" ON public.training_courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON public.training_courses;

CREATE POLICY "Workspace members can view courses"
ON public.training_courses FOR SELECT TO authenticated
USING (workspace_id = public.get_my_workspace_id());

-- Tighten INSERT to require workspace match
DROP POLICY IF EXISTS "Only admins can create courses" ON public.training_courses;

CREATE POLICY "Workspace admins can create courses"
ON public.training_courses FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = public.get_my_workspace_id()
  AND public.has_role(auth.uid(), 'admin')
);

-- =============================================
-- 4. AI_SKILL_PROMPTS
-- =============================================
ALTER TABLE public.ai_skill_prompts
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.ai_skill_prompts
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

-- Drop both existing policies (ALL and SELECT)
DROP POLICY IF EXISTS "ai_skill_prompts_admin_write" ON public.ai_skill_prompts;
DROP POLICY IF EXISTS "ai_skill_prompts_admin_read" ON public.ai_skill_prompts;

-- All workspace members can view active skills
CREATE POLICY "Workspace members can view ai skill prompts"
ON public.ai_skill_prompts FOR SELECT TO authenticated
USING (workspace_id = public.get_my_workspace_id());

-- Only workspace admins/owners can manage (INSERT/UPDATE/DELETE)
CREATE POLICY "Workspace admins can manage ai skill prompts"
ON public.ai_skill_prompts FOR ALL TO authenticated
USING (
  workspace_id = public.get_my_workspace_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
)
WITH CHECK (
  workspace_id = public.get_my_workspace_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
);

-- =============================================
-- 5. COMPANY_BRANDING
-- =============================================
ALTER TABLE public.company_branding
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.company_branding
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

-- Drop existing ALL policy and replace with split SELECT + manage policies
DROP POLICY IF EXISTS "Users manage own branding" ON public.company_branding;

CREATE POLICY "Workspace members can view branding"
ON public.company_branding FOR SELECT TO authenticated
USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "Workspace admins can manage branding"
ON public.company_branding FOR ALL TO authenticated
USING (
  workspace_id = public.get_my_workspace_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
)
WITH CHECK (
  workspace_id = public.get_my_workspace_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

-- =============================================
-- 6. VOICE_AGENT_CONFIG
-- =============================================
ALTER TABLE public.voice_agent_config
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.voice_agent_config
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

DROP POLICY IF EXISTS "Authenticated users can view config" ON public.voice_agent_config;
DROP POLICY IF EXISTS "Admins can manage config" ON public.voice_agent_config;

CREATE POLICY "Workspace members can view voice config"
ON public.voice_agent_config FOR SELECT TO authenticated
USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "Workspace admins can manage voice config"
ON public.voice_agent_config FOR ALL TO authenticated
USING (
  workspace_id = public.get_my_workspace_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
)
WITH CHECK (
  workspace_id = public.get_my_workspace_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
);
