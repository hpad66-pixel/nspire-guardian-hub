
-- 1. Create the workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_user_id UUID REFERENCES auth.users(id),
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'suspended', 'churned')),
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Authenticated users can view workspaces they own
CREATE POLICY "Workspace owners can view their workspace"
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

-- Only the owner can update their workspace
CREATE POLICY "Workspace owners can update their workspace"
  ON public.workspaces
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Only the owner can delete their workspace
CREATE POLICY "Workspace owners can delete their workspace"
  ON public.workspaces
  FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());

-- Owners can insert their own workspace
CREATE POLICY "Workspace owners can insert their workspace"
  ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- 4. Auto-update trigger for updated_at
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Seed: default workspace to capture all existing data
INSERT INTO public.workspaces (id, name, slug, plan, status, trial_ends_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Workspace',
  'default',
  'enterprise',
  'active',
  NULL
);
