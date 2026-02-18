
-- STEP 1 — Add workspace_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- STEP 2 — Migrate all existing profiles to the default workspace
UPDATE public.profiles 
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

-- STEP 3 — Add workspace_id to user_invitations
ALTER TABLE public.user_invitations
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.user_invitations
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

-- STEP 4 — Helper function to get current user's workspace_id
CREATE OR REPLACE FUNCTION public.get_my_workspace_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- STEP 5 — Update handle_new_user trigger to assign workspace_id on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _workspace_id UUID;
BEGIN
  -- Determine workspace: use metadata if provided, else default
  _workspace_id := COALESCE(
    (NEW.raw_user_meta_data->>'workspace_id')::UUID,
    '00000000-0000-0000-0000-000000000001'::UUID
  );

  INSERT INTO public.profiles (user_id, full_name, email, workspace_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    _workspace_id
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
