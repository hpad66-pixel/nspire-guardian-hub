-- Phase 1: Add is_demo column to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Create security definer function to check if user can view demo properties
CREATE OR REPLACE FUNCTION public.can_view_demo_property(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager', 'owner')
  )
$$;

-- Drop existing properties SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view properties" ON public.properties;

-- Create new policy that filters demo properties for non-privileged users
CREATE POLICY "Users can view appropriate properties"
ON public.properties FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_demo = false OR 
    is_demo IS NULL OR 
    can_view_demo_property(auth.uid())
  )
);