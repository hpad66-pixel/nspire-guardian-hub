
-- Fix: Replace overly permissive portal_activity INSERT policy
-- Portal activity inserts should require an authenticated user
DROP POLICY IF EXISTS "Allow activity inserts" ON public.portal_activity;

-- Authenticated users (org managers) can insert activity
CREATE POLICY "Authenticated users can insert activity"
  ON public.portal_activity FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
