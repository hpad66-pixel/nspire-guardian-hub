-- Fix overly permissive INSERT policy on activity_log
DROP POLICY IF EXISTS "System can insert activity log" ON public.activity_log;
CREATE POLICY "Authenticated users can insert activity log"
ON public.activity_log FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix overly permissive INSERT policy on report_emails  
DROP POLICY IF EXISTS "Authenticated users can create report emails" ON public.report_emails;
CREATE POLICY "Authenticated users can create report emails"
ON public.report_emails FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);