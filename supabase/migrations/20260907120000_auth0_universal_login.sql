-- ============================================================
-- Auth0 Universal Login bridge
--
-- Auth0 becomes the single front door for signup + signin across every APAS
-- product, so marketing and the CRM read one identity graph. Supabase Auth
-- stays the session and RLS substrate: 190 foreign keys point at
-- auth.users(id) and 1,200+ RLS policies call auth.uid(), so this bridge
-- federates Auth0 identities INTO auth.users instead of replacing it.
--
-- Two tables support the bridge. Neither is workspace-scoped, so neither
-- carries tenant_id -- CLAUDE.md rule 1 governs tenant data, and both of these
-- rows exist before the user has a workspace at all:
--
--   * auth0_login_states -- pre-authentication. One short-lived row per
--     /authorize round trip holding the PKCE verifier, the OIDC nonce, and the
--     signup intent (invitation token, company name) that has to survive the
--     redirect to Auth0 and back. Service role only: RLS is enabled and no
--     policy grants `authenticated` or `anon` anything.
--
--   * auth0_identities -- the Auth0 `sub` -> auth.users(id) mapping that lands a
--     returning user on their EXISTING Supabase account, and therefore their
--     existing workspace and data, instead of a duplicate.
--
-- Session tokens are never persisted here. The callback function mints a
-- Supabase session in memory and hands it straight to the browser.
-- ============================================================

-- 1. Pre-auth state for the Auth0 redirect round trip.
CREATE TABLE IF NOT EXISTS public.auth0_login_states (
  state             text PRIMARY KEY,
  code_verifier     text NOT NULL,
  nonce             text NOT NULL,
  mode              text NOT NULL CHECK (mode IN ('login', 'signup')),
  product           text NOT NULL DEFAULT 'projos',
  invitation_token  text,
  company_name      text,
  full_name         text,
  next_path         text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  consumed_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_auth0_login_states_expires
  ON public.auth0_login_states (expires_at);

ALTER TABLE public.auth0_login_states ENABLE ROW LEVEL SECURITY;

-- No policies by design. RLS with zero policies denies every request from
-- `anon` and `authenticated`; only the service role (which bypasses RLS inside
-- the two edge functions) can read a verifier or a nonce.
REVOKE ALL ON public.auth0_login_states FROM anon, authenticated;

-- 2. Auth0 subject -> Supabase user mapping.
CREATE TABLE IF NOT EXISTS public.auth0_identities (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auth0_sub      text NOT NULL UNIQUE,
  -- Which product created the Supabase account. Auth0 app_metadata remains the
  -- cross-product source of truth for attribution; this is the bridge's own
  -- record so support can answer "where did this account come from" without a
  -- Management API call.
  signup_product text NOT NULL DEFAULT 'projos',
  connection     text,
  linked_at      timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth0_identities_sub
  ON public.auth0_identities (auth0_sub);

ALTER TABLE public.auth0_identities ENABLE ROW LEVEL SECURITY;

-- A user may read their own linkage (the account settings screen shows it).
-- Writes are service-role only: linking is decided by the callback function
-- after it has verified an Auth0 ID token, never by the client.
DROP POLICY IF EXISTS auth0_identities_own_select ON public.auth0_identities;
CREATE POLICY auth0_identities_own_select ON public.auth0_identities
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());

REVOKE INSERT, UPDATE, DELETE ON public.auth0_identities FROM anon, authenticated;

-- 3. Housekeeping. Consumed and expired states are worthless the moment the
-- redirect completes; keep the table from growing without bound.
CREATE OR REPLACE FUNCTION public.purge_expired_auth0_login_states()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.auth0_login_states
  WHERE expires_at < now() - interval '1 hour'
     OR (consumed_at IS NOT NULL AND consumed_at < now() - interval '1 hour');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_auth0_login_states() FROM PUBLIC, anon, authenticated;
