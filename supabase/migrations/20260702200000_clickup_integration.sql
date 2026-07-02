-- ClickUp integration (one-way push). One connection per workspace holding the
-- API token + the target List. The token is an OUTBOUND secret: it must stay in
-- plaintext server-side so edge functions can call ClickUp, but it must never
-- reach the browser. So RLS is enabled with NO policy for `authenticated` —
-- clients get zero access to this table; only edge functions (service role,
-- which bypasses RLS) read/write it. The UI learns "connected" status and the
-- list name through the clickup-status edge function, never the token.
-- Revocation is a row delete (clickup-disconnect).

CREATE TABLE IF NOT EXISTS public.clickup_connections (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  token              text NOT NULL,
  team_id            text,
  team_name          text,
  default_list_id    text,
  default_list_name  text,
  connected_by       uuid REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clickup_connections ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policy for authenticated: the browser can never touch this row.

-- Link an action item to the ClickUp task it was pushed to (additive, nullable).
ALTER TABLE public.project_action_items
  ADD COLUMN IF NOT EXISTS clickup_task_id text;

NOTIFY pgrst, 'reload schema';
