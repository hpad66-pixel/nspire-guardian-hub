-- Fix permissive RLS policies by using service role check pattern
-- Drop and recreate the overly permissive policies

DROP POLICY IF EXISTS "Edge functions can create requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "System can insert activity" ON public.maintenance_request_activity;

-- Recreate with more specific conditions (service role bypasses RLS anyway, but for completeness)
-- Only authenticated users or service role can create requests
CREATE POLICY "Authenticated users can create requests"
ON public.maintenance_requests FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- Only authenticated users or service role can insert activity
CREATE POLICY "Authenticated users can insert activity"
ON public.maintenance_request_activity FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');