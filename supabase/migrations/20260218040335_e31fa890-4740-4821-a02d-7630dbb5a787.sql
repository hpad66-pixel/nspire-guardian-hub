-- Fix ON DELETE CASCADE for all FK constraints on 'properties' that currently use NO ACTION.
-- This allows property deletion to cascade properly to child records.
-- (Fixed 2026-04-21: each ALTER wrapped in a table-exists guard. Original
--  version assumed every child table was already present, which fails on a
--  clean DB where some of them are created by later migrations.)

DO $$
DECLARE
  t text;
  c text;
BEGIN
  FOR t, c IN
    SELECT * FROM (VALUES
      ('maintenance_requests', 'maintenance_requests_property_id_fkey'),
      ('property_archives',    'property_archives_property_id_fkey'),
      ('report_emails',        'report_emails_property_id_fkey'),
      ('user_status_history',  'user_status_history_property_id_fkey'),
      ('voice_agent_config',   'voice_agent_config_property_id_fkey')
    ) AS v(tbl, cons)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class
      WHERE relname = t AND relnamespace = 'public'::regnamespace
    ) THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, c);
      EXECUTE format(
        'ALTER TABLE public.%I
           ADD CONSTRAINT %I FOREIGN KEY (property_id)
           REFERENCES public.properties(id) ON DELETE CASCADE',
        t, c
      );
    ELSE
      RAISE NOTICE 'Skipping %.% (table not present yet)', t, c;
    END IF;
  END LOOP;
END $$;
