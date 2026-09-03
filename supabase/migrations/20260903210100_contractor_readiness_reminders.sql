-- Daily expiry and missing-document reminders. Failure to install pg_cron or
-- pg_net never blocks the release; the edge function can still be run manually.
INSERT INTO public.app_cron_secrets (key, secret)
VALUES ('contractor_readiness', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
ON CONFLICT (key) DO NOTHING;

DO $outer$
DECLARE sec text;
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  SELECT secret INTO sec FROM public.app_cron_secrets WHERE key = 'contractor_readiness';
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'contractor-readiness-daily') THEN
    PERFORM cron.unschedule('contractor-readiness-daily');
  END IF;
  PERFORM cron.schedule('contractor-readiness-daily', '15 12 * * *', format($job$
    select net.http_post(
      url := 'https://xlfwzqpixlrnntzqhvcm.supabase.co/functions/v1/contractor-reminders',
      headers := jsonb_build_object('Content-Type','application/json','apikey',%L,'x-cron-secret',%L),
      body := '{}'::jsonb
    );
  $job$, 'sb_publishable_BK8G8YD_lkJRPYJ9uTuktg_7TGsbmkY', sec));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Contractor Readiness cron not scheduled (pg_cron/pg_net unavailable): %', SQLERRM;
END $outer$;
