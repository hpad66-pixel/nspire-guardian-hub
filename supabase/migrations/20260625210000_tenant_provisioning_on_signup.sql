-- Multi-tenant provisioning on signup.
--
-- BEFORE: every new signup was dumped into a single hardcoded Default Workspace
-- (00000000-…-0001) as role 'user', so separate companies shared one workspace
-- and could see each other's data.
--
-- AFTER:
--   * Invite path  — signup metadata carries `workspace_id`  → the user JOINS that
--     existing company as a member ('user').
--   * Self-serve   — no `workspace_id`                       → a BRAND-NEW, isolated
--     workspace is created (named from `company_name`/full name/email) and the
--     creator becomes its 'admin'. RLS confines an 'admin' to their own workspace;
--     cross-tenant super-admin is a separate JWT app_metadata.role='super_admin'
--     claim, so this does NOT grant platform-wide access.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _workspace_id UUID;
  _invite_ws    UUID;
  _company      TEXT;
BEGIN
  _invite_ws := NULLIF(NEW.raw_user_meta_data ->> 'workspace_id', '')::UUID;

  IF _invite_ws IS NOT NULL THEN
    -- Joining an existing company via invite → member.
    _workspace_id := _invite_ws;

    INSERT INTO public.profiles (user_id, full_name, email, workspace_id)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email, _workspace_id);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  ELSE
    -- Self-serve new company → fresh, isolated workspace; creator is its admin.
    _company := COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'company_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', '') || '''s Workspace',
      split_part(NEW.email, '@', 1) || '''s Workspace'
    );

    INSERT INTO public.workspaces (name, owner_user_id)
    VALUES (_company, NEW.id)
    RETURNING id INTO _workspace_id;

    INSERT INTO public.profiles (user_id, full_name, email, workspace_id)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email, _workspace_id);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$function$;
