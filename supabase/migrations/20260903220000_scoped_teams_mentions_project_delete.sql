-- Unified account/client/project teams, transactional discussion mentions,
-- and durable platform-super-admin-only project removal.

BEGIN;

-- Install the project tombstone columns before access helpers reference them.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deletion_batch_id uuid;

-- ---------------------------------------------------------------------------
-- Client/company teams are many-to-many. profiles.client_id remains supported
-- as a legacy primary affiliation, but it is no longer the authorization model.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.client_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  added_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);

CREATE INDEX IF NOT EXISTS client_team_members_tenant_idx
  ON public.client_team_members (tenant_id, client_id, user_id);

CREATE OR REPLACE FUNCTION public.validate_client_team_member_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_tenant uuid;
  v_user_tenant uuid;
BEGIN
  SELECT workspace_id INTO v_client_tenant
  FROM public.clients WHERE id = NEW.client_id;

  SELECT workspace_id INTO v_user_tenant
  FROM public.profiles
  WHERE user_id = NEW.user_id AND COALESCE(status, 'active') = 'active';

  IF v_client_tenant IS NULL OR v_user_tenant IS NULL
     OR v_client_tenant <> v_user_tenant
     OR NEW.tenant_id <> v_client_tenant THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Client team members must be active users in the same workspace';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_client_team_member_scope ON public.client_team_members;
CREATE TRIGGER trg_validate_client_team_member_scope
  BEFORE INSERT OR UPDATE ON public.client_team_members
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_team_member_scope();

INSERT INTO public.client_team_members (tenant_id, client_id, user_id, role, added_by)
SELECT c.workspace_id, p.client_id, p.user_id,
       COALESCE((
         SELECT ur.role FROM public.user_roles ur
         WHERE ur.user_id = p.user_id
         ORDER BY CASE ur.role
           WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 WHEN 'administrator' THEN 3
           WHEN 'project_manager' THEN 4 ELSE 10 END
         LIMIT 1
       ), 'viewer'::public.app_role),
       p.user_id
FROM public.profiles p
JOIN public.clients c ON c.id = p.client_id AND c.workspace_id = p.workspace_id
WHERE p.client_id IS NOT NULL AND COALESCE(p.status, 'active') = 'active'
ON CONFLICT (client_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_client_member(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
    AND _client_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.client_team_members ctm
        JOIN public.profiles p ON p.user_id = ctm.user_id
        WHERE ctm.client_id = _client_id
          AND ctm.user_id = _user_id
          AND COALESCE(p.status, 'active') = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.clients c
        JOIN public.profiles p
          ON p.user_id = _user_id
         AND p.workspace_id = c.workspace_id
         AND p.client_id = c.id
        WHERE c.id = _client_id
          AND COALESCE(p.status, 'active') = 'active'
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_client_team(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR public.is_workspace_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.client_team_members ctm
      JOIN public.profiles p ON p.user_id = ctm.user_id
      WHERE ctm.client_id = _client_id
        AND ctm.user_id = _user_id
        AND ctm.role IN ('owner', 'manager', 'administrator', 'project_manager')
        AND COALESCE(p.status, 'active') = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_client_projects(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR public.is_workspace_admin(_user_id)
    OR public.can_manage_client_team(_user_id, _client_id)
    OR EXISTS (
      SELECT 1
      FROM public.clients c
      JOIN public.profiles p
        ON p.user_id = _user_id
       AND p.workspace_id = c.workspace_id
       AND p.client_id = c.id
      JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE c.id = _client_id
        AND COALESCE(p.status, 'active') = 'active'
        AND ur.role IN ('owner', 'manager', 'administrator', 'project_manager')
    );
$$;

CREATE OR REPLACE FUNCTION public.user_has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
    AND _project_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.projects pj
      JOIN public.profiles p
        ON p.user_id = _user_id
       AND p.workspace_id = pj.workspace_id
       AND COALESCE(p.status, 'active') = 'active'
      WHERE pj.id = _project_id
        AND pj.deleted_at IS NULL
        AND (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = _user_id AND ur.role = 'admin'
          )
          OR EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = pj.workspace_id AND w.owner_user_id = _user_id
          )
          OR EXISTS (
            SELECT 1 FROM auth.users au
            WHERE au.id = _user_id
              AND au.raw_app_meta_data ->> 'role' = 'super_admin'
          )
          OR (pj.client_id IS NOT NULL AND public.is_client_member(_user_id, pj.client_id))
          OR (pj.property_id IS NOT NULL AND public.can_access_property(_user_id, pj.property_id))
          OR EXISTS (
            SELECT 1 FROM public.project_team_members ptm
            WHERE ptm.project_id = pj.id AND ptm.user_id = _user_id
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR public.user_has_project_access(_user_id, _project_id);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_project_team(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR public.is_workspace_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.projects pj
      WHERE pj.id = _project_id
        AND pj.deleted_at IS NULL
        AND (
          (pj.client_id IS NOT NULL AND public.can_manage_client_team(_user_id, pj.client_id))
          OR EXISTS (
            SELECT 1 FROM public.project_team_members ptm
            WHERE ptm.project_id = pj.id
              AND ptm.user_id = _user_id
              AND ptm.role IN ('owner', 'manager', 'administrator', 'project_manager', 'superintendent')
          )
          OR EXISTS (
            SELECT 1 FROM public.property_team_members prm
            WHERE prm.property_id = pj.property_id
              AND prm.user_id = _user_id
              AND prm.status = 'active'
              AND prm.role IN ('owner', 'manager', 'administrator', 'project_manager')
          )
        )
    );
$$;

ALTER TABLE public.client_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_team_members_select ON public.client_team_members;
CREATE POLICY client_team_members_select ON public.client_team_members
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR tenant_id = public.current_tenant_id()
    OR public.is_client_member(auth.uid(), client_id)
  );
DROP POLICY IF EXISTS client_team_members_staff_boundary ON public.client_team_members;
CREATE POLICY client_team_members_staff_boundary ON public.client_team_members AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (public.current_portal_kind() = 'main' OR public.is_super_admin())
  WITH CHECK (public.current_portal_kind() = 'main' OR public.is_super_admin());

-- Mutations are RPC-only so authorization, tenant validation, and audit fields
-- cannot be bypassed by a hand-written browser request.
REVOKE INSERT, UPDATE, DELETE ON public.client_team_members FROM authenticated;
GRANT SELECT ON public.client_team_members TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_client_team_member(
  p_client_id uuid,
  p_user_id uuid,
  p_role public.app_role DEFAULT 'viewer'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_client_team(auth.uid(), p_client_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to manage this client team';
  END IF;

  SELECT workspace_id INTO v_tenant FROM public.clients WHERE id = p_client_id;
  IF v_tenant IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_user_id AND workspace_id = v_tenant AND COALESCE(status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Select an active person from this account';
  END IF;

  INSERT INTO public.client_team_members (tenant_id, client_id, user_id, role, added_by)
  VALUES (v_tenant, p_client_id, p_user_id, p_role, auth.uid())
  ON CONFLICT (client_id, user_id) DO UPDATE
    SET role = EXCLUDED.role, updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_client_team_member(p_client_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_client_team(auth.uid(), p_client_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to manage this client team';
  END IF;
  DELETE FROM public.client_team_members WHERE client_id = p_client_id AND user_id = p_user_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_project_team_member(
  p_project_id uuid,
  p_user_id uuid,
  p_role public.app_role DEFAULT 'viewer'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_project_team(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to manage this project team';
  END IF;
  SELECT workspace_id INTO v_tenant FROM public.projects WHERE id = p_project_id AND deleted_at IS NULL;
  IF v_tenant IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_user_id AND workspace_id = v_tenant AND COALESCE(status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Select an active person from this account';
  END IF;
  INSERT INTO public.project_team_members (project_id, user_id, role, added_by)
  VALUES (p_project_id, p_user_id, p_role, auth.uid())
  ON CONFLICT (project_id, user_id) DO UPDATE
    SET role = EXCLUDED.role, updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_project_team_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_project_team(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to manage this project team';
  END IF;
  DELETE FROM public.project_team_members WHERE project_id = p_project_id AND user_id = p_user_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_team_access(p_client_id uuid)
RETURNS TABLE (can_view boolean, can_manage boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR public.is_client_member(auth.uid(), p_client_id)
         OR public.is_workspace_admin(auth.uid()),
         public.can_manage_client_team(auth.uid(), p_client_id);
$$;

CREATE OR REPLACE FUNCTION public.get_project_team_access(p_project_id uuid)
RETURNS TABLE (can_view boolean, can_manage boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_project(auth.uid(), p_project_id),
         public.can_manage_project_team(auth.uid(), p_project_id);
$$;

-- Keep client-project capability copy aligned: deletion is platform-only.
CREATE OR REPLACE FUNCTION public.get_client_project_access(p_client_id uuid)
RETURNS TABLE (can_view boolean, can_create boolean, can_edit boolean, can_delete boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_workspace_admin(auth.uid()) OR public.is_client_member(auth.uid(), p_client_id),
         public.can_manage_client_projects(auth.uid(), p_client_id),
         public.can_manage_client_projects(auth.uid(), p_client_id),
         public.is_super_admin();
$$;

-- Direct project-team writes are also RPC-only.
DROP POLICY IF EXISTS project_team_members_access_scope ON public.project_team_members;
CREATE POLICY project_team_members_access_scope ON public.project_team_members AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (public.can_access_project(auth.uid(), project_id));
REVOKE INSERT, UPDATE, DELETE ON public.project_team_members FROM authenticated;
GRANT SELECT ON public.project_team_members TO authenticated;

-- ---------------------------------------------------------------------------
-- Project mention candidates and transactional mention persistence.
-- ---------------------------------------------------------------------------

-- Earlier screens used broad workspace-level discussion policies. Preserve
-- their edit/delete behavior, but require project access for every operation.
DROP POLICY IF EXISTS project_discussions_access_scope ON public.project_discussions;
CREATE POLICY project_discussions_access_scope ON public.project_discussions AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (public.can_access_project(auth.uid(), project_id))
  WITH CHECK (public.can_access_project(auth.uid(), project_id));

DROP POLICY IF EXISTS project_discussion_replies_access_scope ON public.project_discussion_replies;
CREATE POLICY project_discussion_replies_access_scope ON public.project_discussion_replies AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_discussions pd
    WHERE pd.id = project_discussion_replies.discussion_id
      AND public.can_access_project(auth.uid(), pd.project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_discussions pd
    WHERE pd.id = project_discussion_replies.discussion_id
      AND public.can_access_project(auth.uid(), pd.project_id)
  ));

REVOKE INSERT ON public.project_discussions, public.project_discussion_replies FROM authenticated;
GRANT SELECT ON public.project_discussions, public.project_discussion_replies TO authenticated;

CREATE TABLE IF NOT EXISTS public.project_discussion_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  discussion_id uuid REFERENCES public.project_discussions(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.project_discussion_replies(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(discussion_id, reply_id) = 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS project_discussion_mentions_discussion_unique
  ON public.project_discussion_mentions (discussion_id, mentioned_user_id)
  WHERE discussion_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS project_discussion_mentions_reply_unique
  ON public.project_discussion_mentions (reply_id, mentioned_user_id)
  WHERE reply_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS project_discussion_mentions_user_idx
  ON public.project_discussion_mentions (mentioned_user_id, created_at DESC);

ALTER TABLE public.project_discussion_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_discussion_mentions_select ON public.project_discussion_mentions
  FOR SELECT TO authenticated
  USING (public.can_access_project(auth.uid(), project_id));
CREATE POLICY project_discussion_mentions_staff_boundary ON public.project_discussion_mentions AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (public.current_portal_kind() = 'main' OR public.is_super_admin())
  WITH CHECK (public.current_portal_kind() = 'main' OR public.is_super_admin());
REVOKE INSERT, UPDATE, DELETE ON public.project_discussion_mentions FROM authenticated;
GRANT SELECT ON public.project_discussion_mentions TO authenticated;

CREATE OR REPLACE FUNCTION public.get_project_mention_candidates(
  p_project_id uuid,
  p_search text DEFAULT '',
  p_limit integer DEFAULT 30
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  access_source text,
  role text,
  is_project_member boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_project(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Project access required';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.full_name, COALESCE(p.work_email, p.email), p.avatar_url,
    CASE
      WHEN ptm.id IS NOT NULL THEN 'Project team'
      WHEN ctm.id IS NOT NULL OR p.client_id = pj.client_id THEN 'Client team'
      WHEN prm.id IS NOT NULL THEN 'Property team'
      ELSE 'Account admin'
    END,
    COALESCE(ptm.role::text, ctm.role::text, prm.role::text, ur.role::text, 'viewer'),
    ptm.id IS NOT NULL
  FROM public.projects pj
  JOIN public.profiles p ON p.workspace_id = pj.workspace_id
  LEFT JOIN public.project_team_members ptm
    ON ptm.project_id = pj.id AND ptm.user_id = p.user_id
  LEFT JOIN public.client_team_members ctm
    ON ctm.client_id = pj.client_id AND ctm.user_id = p.user_id
  LEFT JOIN public.property_team_members prm
    ON prm.property_id = pj.property_id AND prm.user_id = p.user_id AND prm.status = 'active'
  LEFT JOIN LATERAL (
    SELECT r.role FROM public.user_roles r
    WHERE r.user_id = p.user_id
    ORDER BY CASE r.role WHEN 'admin' THEN 1 WHEN 'owner' THEN 2 ELSE 10 END
    LIMIT 1
  ) ur ON true
  WHERE pj.id = p_project_id
    AND pj.deleted_at IS NULL
    AND COALESCE(p.status, 'active') = 'active'
    AND public.user_has_project_access(p.user_id, pj.id)
    AND (
      NULLIF(btrim(p_search), '') IS NULL
      OR p.full_name ILIKE '%' || p_search || '%'
      OR p.email ILIKE '%' || p_search || '%'
      OR p.work_email ILIKE '%' || p_search || '%'
    )
  ORDER BY CASE WHEN ptm.id IS NOT NULL THEN 0 WHEN ctm.id IS NOT NULL THEN 1 ELSE 2 END,
           COALESCE(p.full_name, p.email)
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_project_discussion_with_mentions(
  p_project_id uuid,
  p_title text,
  p_content text,
  p_attachments text[] DEFAULT '{}'::text[],
  p_mentioned_user_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS public.project_discussions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discussion public.project_discussions;
  v_mentioned uuid;
BEGIN
  IF NOT public.can_access_project(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Project access required';
  END IF;
  IF NULLIF(btrim(p_title), '') IS NULL OR NULLIF(btrim(p_content), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A topic and message are required';
  END IF;

  FOR v_mentioned IN SELECT DISTINCT unnest(COALESCE(p_mentioned_user_ids, '{}'::uuid[])) LOOP
    IF NOT public.user_has_project_access(v_mentioned, p_project_id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Every tagged person must have project access';
    END IF;
  END LOOP;

  INSERT INTO public.project_discussions
    (project_id, title, content, created_by, attachments)
  VALUES
    (p_project_id, btrim(p_title), btrim(p_content), auth.uid(), COALESCE(p_attachments, '{}'::text[]))
  RETURNING * INTO v_discussion;

  INSERT INTO public.project_discussion_mentions
    (project_id, discussion_id, mentioned_user_id, mentioned_by)
  SELECT p_project_id, v_discussion.id, target, auth.uid()
  FROM (SELECT DISTINCT unnest(COALESCE(p_mentioned_user_ids, '{}'::uuid[])) AS target) q;

  INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id)
  SELECT target, 'mention',
         CASE WHEN target = auth.uid() THEN 'Discussion reminder: ' ELSE 'You were tagged: ' END || btrim(p_title),
         left(btrim(p_content), 240), 'project', p_project_id
  FROM (SELECT DISTINCT unnest(COALESCE(p_mentioned_user_ids, '{}'::uuid[])) AS target) q;

  RETURN v_discussion;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_project_discussion_reply_with_mentions(
  p_discussion_id uuid,
  p_content text,
  p_attachments text[] DEFAULT '{}'::text[],
  p_mentioned_user_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS public.project_discussion_replies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reply public.project_discussion_replies;
  v_project_id uuid;
  v_title text;
  v_mentioned uuid;
BEGIN
  SELECT project_id, title INTO v_project_id, v_title
  FROM public.project_discussions WHERE id = p_discussion_id;
  IF v_project_id IS NULL OR NOT public.can_access_project(auth.uid(), v_project_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Project access required';
  END IF;
  IF NULLIF(btrim(p_content), '') IS NULL AND cardinality(COALESCE(p_attachments, '{}'::text[])) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A message or attachment is required';
  END IF;

  FOR v_mentioned IN SELECT DISTINCT unnest(COALESCE(p_mentioned_user_ids, '{}'::uuid[])) LOOP
    IF NOT public.user_has_project_access(v_mentioned, v_project_id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Every tagged person must have project access';
    END IF;
  END LOOP;

  INSERT INTO public.project_discussion_replies
    (discussion_id, content, created_by, attachments)
  VALUES
    (p_discussion_id, COALESCE(NULLIF(btrim(p_content), ''), '(photo)'), auth.uid(), COALESCE(p_attachments, '{}'::text[]))
  RETURNING * INTO v_reply;

  INSERT INTO public.project_discussion_mentions
    (project_id, reply_id, mentioned_user_id, mentioned_by)
  SELECT v_project_id, v_reply.id, target, auth.uid()
  FROM (SELECT DISTINCT unnest(COALESCE(p_mentioned_user_ids, '{}'::uuid[])) AS target) q;

  INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id)
  SELECT target, 'mention',
         CASE WHEN target = auth.uid() THEN 'Reply reminder: ' ELSE 'You were tagged in: ' END || v_title,
         left(COALESCE(NULLIF(btrim(p_content), ''), 'Photo attached'), 240), 'project', v_project_id
  FROM (SELECT DISTINCT unnest(COALESCE(p_mentioned_user_ids, '{}'::uuid[])) AS target) q;

  RETURN v_reply;
END;
$$;

-- ---------------------------------------------------------------------------
-- Durable project removal. Browser users never hard-delete projects. A
-- platform super admin can soft-delete through one audited transaction.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS projects_active_workspace_idx
  ON public.projects (workspace_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_deletion_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  project_name text NOT NULL,
  deletion_mode text NOT NULL CHECK (deletion_mode IN ('single', 'program')),
  project_snapshot jsonb NOT NULL,
  deleted_by uuid NOT NULL REFERENCES auth.users(id),
  deleted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_deletion_audit_tenant_idx
  ON public.project_deletion_audit (tenant_id, deleted_at DESC);
ALTER TABLE public.project_deletion_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_deletion_audit_super_admin_select ON public.project_deletion_audit
  FOR SELECT TO authenticated USING (public.is_super_admin());
REVOKE INSERT, UPDATE, DELETE ON public.project_deletion_audit FROM authenticated;
GRANT SELECT ON public.project_deletion_audit TO authenticated;

-- A restrictive policy makes every authenticated project query ignore removed
-- records, even if an older screen forgot its explicit deleted_at filter.
DROP POLICY IF EXISTS active_projects_only ON public.projects;
CREATE POLICY active_projects_only ON public.projects AS RESTRICTIVE
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

REVOKE DELETE ON public.projects FROM authenticated;

CREATE OR REPLACE FUNCTION public.delete_project_as_super_admin(
  p_project_id uuid,
  p_delete_descendants boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch uuid := gen_random_uuid();
  v_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the platform super administrator can delete projects';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Project not found or already deleted';
  END IF;

  CREATE TEMP TABLE project_delete_targets (id uuid PRIMARY KEY) ON COMMIT DROP;
  IF p_delete_descendants THEN
    INSERT INTO project_delete_targets
    WITH RECURSIVE targets AS (
      SELECT id FROM public.projects WHERE id = p_project_id AND deleted_at IS NULL
      UNION ALL
      SELECT child.id FROM public.projects child
      JOIN targets parent ON child.parent_project_id = parent.id
      WHERE child.deleted_at IS NULL
    ) SELECT DISTINCT id FROM targets;
  ELSE
    INSERT INTO project_delete_targets VALUES (p_project_id);
    UPDATE public.projects
       SET parent_project_id = NULL
     WHERE parent_project_id = p_project_id AND deleted_at IS NULL;
  END IF;

  INSERT INTO public.project_deletion_audit
    (batch_id, tenant_id, project_id, project_name, deletion_mode, project_snapshot, deleted_by)
  SELECT v_batch, p.workspace_id, p.id, p.name,
         CASE WHEN p_delete_descendants THEN 'program' ELSE 'single' END,
         to_jsonb(p), auth.uid()
  FROM public.projects p JOIN project_delete_targets t ON t.id = p.id;

  UPDATE public.projects p
     SET deleted_at = now(), deleted_by = auth.uid(), deletion_batch_id = v_batch, status = 'closed'
    FROM project_delete_targets t
   WHERE p.id = t.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'batch_id', v_batch,
    'deleted_count', v_count,
    'deleted_ids', (SELECT jsonb_agg(id ORDER BY id) FROM project_delete_targets)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_client_team_member(uuid, uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_client_team_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_project_team_member(uuid, uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_project_team_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_client_team_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_project_team_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_project_mention_candidates(uuid, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_project_discussion_with_mentions(uuid, text, text, text[], uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_project_discussion_reply_with_mentions(uuid, text, text[], uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_project_as_super_admin(uuid, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.upsert_client_team_member(uuid, uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_client_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_project_team_member(uuid, uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_project_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_team_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_team_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_mention_candidates(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_discussion_with_mentions(uuid, text, text, text[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_discussion_reply_with_mentions(uuid, text, text[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_project_as_super_admin(uuid, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
