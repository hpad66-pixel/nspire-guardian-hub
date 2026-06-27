-- Nightly Risk Radar: a deterministic precompute that stores a per-project snapshot
-- and lets the nightly edge function drop a "needs attention" notification each
-- morning. The AI-narrated radar stays on-demand in the UI; this is the cheap,
-- reliable background pass + alert.

CREATE TABLE IF NOT EXISTS public.project_risk_snapshots (
  project_id       uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  overdue_rfis     integer NOT NULL DEFAULT 0,
  aging_submittals integer NOT NULL DEFAULT 0,
  open_punch       integer NOT NULL DEFAULT 0,
  pending_co_value numeric NOT NULL DEFAULT 0,
  flagged          boolean NOT NULL DEFAULT false,
  generated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_risk_snapshots ENABLE ROW LEVEL SECURITY;
-- Read only (workspace-scoped). Writes are service-role only (the nightly fn).
CREATE POLICY project_risk_snapshots_read ON public.project_risk_snapshots
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id
      WHERE p.id = project_risk_snapshots.project_id AND pr.workspace_id = public.get_my_workspace_id())
  );

-- Shared secret for the nightly cron → edge function call. RLS on, no policies,
-- so only the service role can read it.
CREATE TABLE IF NOT EXISTS public.app_cron_secrets (
  key    text PRIMARY KEY,
  secret text NOT NULL
);
ALTER TABLE public.app_cron_secrets ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_cron_secrets (key, secret)
  VALUES ('risk_radar', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
  ON CONFLICT (key) DO NOTHING;

-- Schedule it. Wrapped so a missing pg_cron/pg_net never breaks the deploy; if the
-- extensions aren't available the function still exists and can be scheduled later.
DO $outer$
DECLARE sec text;
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  SELECT secret INTO sec FROM public.app_cron_secrets WHERE key = 'risk_radar';
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'risk-radar-nightly') THEN
    PERFORM cron.unschedule('risk-radar-nightly');
  END IF;
  PERFORM cron.schedule('risk-radar-nightly', '0 11 * * *', format($job$
    select net.http_post(
      url := 'https://xlfwzqpixlrnntzqhvcm.supabase.co/functions/v1/risk-radar-nightly',
      headers := jsonb_build_object('Content-Type','application/json','apikey',%L,'x-cron-secret',%L),
      body := '{}'::jsonb
    );
  $job$, 'sb_publishable_BK8G8YD_lkJRPYJ9uTuktg_7TGsbmkY', sec));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'risk-radar nightly cron not scheduled (pg_cron/pg_net unavailable): %', SQLERRM;
END $outer$;
