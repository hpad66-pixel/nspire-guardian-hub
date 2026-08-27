-- Project communication center
--
-- Completes the project-level communications loop:
--   * Gmail messages keep their RFC Message-Id so replies stay in one thread.
--   * Action items can have CC/followers in addition to one accountable owner.
--   * Assignments, follower additions, comments, and status changes reliably
--     create in-app notifications from SECURITY DEFINER triggers (browser RLS
--     intentionally prevents one user from inserting another user's notice).
--   * Trello credentials remain server-only, with an optional list per project.

BEGIN;

ALTER TABLE public.project_emails
  ADD COLUMN IF NOT EXISTS rfc_message_id text;

ALTER TABLE public.project_action_items
  ADD COLUMN IF NOT EXISTS trello_card_id text,
  ADD COLUMN IF NOT EXISTS trello_card_url text;

ALTER TABLE public.action_item_comments
  ADD COLUMN IF NOT EXISTS trello_action_id text;

CREATE TABLE IF NOT EXISTS public.project_action_item_watchers (
  action_item_id uuid NOT NULL REFERENCES public.project_action_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (action_item_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_action_item_watchers_user_idx
  ON public.project_action_item_watchers (user_id, created_at DESC);

ALTER TABLE public.project_action_item_watchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_action_item_watchers_workspace ON public.project_action_item_watchers;
CREATE POLICY project_action_item_watchers_workspace
  ON public.project_action_item_watchers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_action_items pai
      JOIN public.projects p ON p.id = pai.project_id
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE pai.id = project_action_item_watchers.action_item_id
        AND (pr.workspace_id = public.get_my_workspace_id() OR public.is_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_action_items pai
      JOIN public.projects p ON p.id = pai.project_id
      JOIN public.properties pr ON pr.id = p.property_id
      JOIN public.profiles recipient ON recipient.user_id = project_action_item_watchers.user_id
      WHERE pai.id = project_action_item_watchers.action_item_id
        AND (pr.workspace_id = public.get_my_workspace_id() OR public.is_super_admin())
        AND (recipient.workspace_id = pr.workspace_id OR public.is_super_admin())
    )
  );

-- One Trello connection per workspace. Both api_key and token stay behind RLS;
-- only the service-role Trello edge function can read them.
CREATE TABLE IF NOT EXISTS public.trello_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  api_key text NOT NULL,
  token text NOT NULL,
  member_id text,
  member_name text,
  default_board_id text,
  default_board_name text,
  default_list_id text,
  default_list_name text,
  auto_push boolean NOT NULL DEFAULT false,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trello_connections ENABLE ROW LEVEL SECURITY;
-- Deliberately no authenticated policy: credentials never reach the browser.

CREATE TABLE IF NOT EXISTS public.trello_project_lists (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  board_id text NOT NULL,
  board_name text,
  list_id text NOT NULL,
  list_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trello_project_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trello_project_lists_workspace ON public.trello_project_lists;
CREATE POLICY trello_project_lists_workspace
  ON public.trello_project_lists
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE p.id = trello_project_lists.project_id
        AND (pr.workspace_id = public.get_my_workspace_id() OR public.is_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE p.id = trello_project_lists.project_id
        AND (pr.workspace_id = public.get_my_workspace_id() OR public.is_super_admin())
    )
  );

-- The notification bell used to rely on browser inserts for action-item
-- assignments. Those inserts are correctly blocked by notification RLS when
-- the recipient is somebody else. Move this responsibility into trusted DB
-- triggers so it works for every creation path (UI, meeting extraction, AI,
-- imports, and integrations).
CREATE OR REPLACE FUNCTION public.tg_notify_project_action_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_name text;
  v_actor uuid := auth.uid();
  v_recipient uuid;
BEGIN
  SELECT p.name INTO v_project_name FROM public.projects p WHERE p.id = NEW.project_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM NEW.created_by THEN
      PERFORM public.enqueue_notification(
        NEW.assigned_to,
        'assignment',
        'Project instruction assigned to you',
        NEW.title || COALESCE(' — ' || v_project_name, ''),
        'action_item',
        NEW.id
      );
    END IF;
  ELSE
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       AND NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM v_actor THEN
      PERFORM public.enqueue_notification(
        NEW.assigned_to,
        'assignment',
        'Project instruction assigned to you',
        NEW.title || COALESCE(' — ' || v_project_name, ''),
        'action_item',
        NEW.id
      );
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      FOR v_recipient IN
        SELECT DISTINCT recipient
        FROM (
          SELECT NEW.created_by AS recipient
          UNION ALL SELECT NEW.assigned_to
          UNION ALL
          SELECT w.user_id FROM public.project_action_item_watchers w WHERE w.action_item_id = NEW.id
        ) q
        WHERE recipient IS NOT NULL AND recipient IS DISTINCT FROM v_actor
      LOOP
        PERFORM public.enqueue_notification(
          v_recipient,
          'status_change',
          'Project instruction is now ' || replace(NEW.status, '_', ' '),
          NEW.title || COALESCE(' — ' || v_project_name, ''),
          'action_item',
          NEW.id
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_project_action_item ON public.project_action_items;
CREATE TRIGGER trg_notify_project_action_item
  AFTER INSERT OR UPDATE OF assigned_to, status ON public.project_action_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_project_action_item();

CREATE OR REPLACE FUNCTION public.tg_notify_action_item_watcher()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_project_name text;
BEGIN
  IF NEW.user_id IS DISTINCT FROM COALESCE(NEW.added_by, auth.uid()) THEN
    SELECT pai.title, p.name INTO v_title, v_project_name
    FROM public.project_action_items pai
    JOIN public.projects p ON p.id = pai.project_id
    WHERE pai.id = NEW.action_item_id;

    PERFORM public.enqueue_notification(
      NEW.user_id,
      'mention',
      'You were copied on a project instruction',
      COALESCE(v_title, 'Project instruction') || COALESCE(' — ' || v_project_name, ''),
      'action_item',
      NEW.action_item_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_action_item_watcher ON public.project_action_item_watchers;
CREATE TRIGGER trg_notify_action_item_watcher
  AFTER INSERT ON public.project_action_item_watchers
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_action_item_watcher();

CREATE OR REPLACE FUNCTION public.tg_notify_action_item_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.project_action_items%ROWTYPE;
  v_project_name text;
  v_recipient uuid;
BEGIN
  SELECT * INTO v_item FROM public.project_action_items WHERE id = NEW.action_item_id;
  SELECT name INTO v_project_name FROM public.projects WHERE id = v_item.project_id;

  FOR v_recipient IN
    SELECT DISTINCT recipient
    FROM (
      SELECT v_item.created_by AS recipient
      UNION ALL SELECT v_item.assigned_to
      UNION ALL
      SELECT w.user_id FROM public.project_action_item_watchers w WHERE w.action_item_id = NEW.action_item_id
    ) q
    WHERE recipient IS NOT NULL AND recipient IS DISTINCT FROM NEW.created_by
  LOOP
    PERFORM public.enqueue_notification(
      v_recipient,
      'comment',
      'New project instruction update',
      v_item.title || COALESCE(' — ' || v_project_name, ''),
      'action_item',
      NEW.action_item_id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_action_item_comment ON public.action_item_comments;
CREATE TRIGGER trg_notify_action_item_comment
  AFTER INSERT ON public.action_item_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_action_item_comment();

NOTIFY pgrst, 'reload schema';

COMMIT;
