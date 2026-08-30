-- Restore the canonical APAS platform administrator and make the platform
-- authority check independent of a stale or incorrectly shaped access token.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id = auth.uid()
        AND u.raw_app_meta_data ->> 'role' = 'super_admin'
    )
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin', false)
    OR COALESCE(auth.jwt() ->> 'user_role' = 'super_admin', false);
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  'Returns true only for users carrying the protected platform super-admin authority.';

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

DO $$
DECLARE
  v_user_id uuid;
  v_match_count integer;
BEGIN
  SELECT count(*)
    INTO v_match_count
    FROM auth.users
   WHERE lower(email) = lower('hardeep@apas.ai');

  IF v_match_count <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one auth user for hardeep@apas.ai; found %',
      v_match_count;
  END IF;

  SELECT id
    INTO STRICT v_user_id
    FROM auth.users
   WHERE lower(email) = lower('hardeep@apas.ai');

  UPDATE auth.users
     SET raw_app_meta_data = jsonb_set(
           COALESCE(raw_app_meta_data, '{}'::jsonb),
           '{role}',
           to_jsonb('super_admin'::text),
           true
         ),
         updated_at = now()
   WHERE id = v_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles
     SET status = 'active',
         updated_at = now()
   WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile exists for hardeep@apas.ai';
  END IF;
END;
$$;

COMMIT;
