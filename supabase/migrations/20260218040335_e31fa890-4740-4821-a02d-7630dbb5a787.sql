
-- Fix ON DELETE CASCADE for all FK constraints on 'properties' that currently use NO ACTION
-- This allows property deletion to cascade properly to child records

-- 1. maintenance_requests.property_id
ALTER TABLE public.maintenance_requests
  DROP CONSTRAINT IF EXISTS maintenance_requests_property_id_fkey;
ALTER TABLE public.maintenance_requests
  ADD CONSTRAINT maintenance_requests_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- 2. property_archives.property_id
ALTER TABLE public.property_archives
  DROP CONSTRAINT IF EXISTS property_archives_property_id_fkey;
ALTER TABLE public.property_archives
  ADD CONSTRAINT property_archives_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- 3. report_emails.property_id
ALTER TABLE public.report_emails
  DROP CONSTRAINT IF EXISTS report_emails_property_id_fkey;
ALTER TABLE public.report_emails
  ADD CONSTRAINT report_emails_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- 4. user_status_history.property_id
ALTER TABLE public.user_status_history
  DROP CONSTRAINT IF EXISTS user_status_history_property_id_fkey;
ALTER TABLE public.user_status_history
  ADD CONSTRAINT user_status_history_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- 5. voice_agent_config.property_id
ALTER TABLE public.voice_agent_config
  DROP CONSTRAINT IF EXISTS voice_agent_config_property_id_fkey;
ALTER TABLE public.voice_agent_config
  ADD CONSTRAINT voice_agent_config_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
