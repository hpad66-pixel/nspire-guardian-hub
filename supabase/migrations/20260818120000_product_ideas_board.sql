-- Product Ideas: a signed-in community feedback board with voting and a
-- transparent administrator-managed delivery timeline.

BEGIN;

CREATE TABLE IF NOT EXISTS public.product_ideas (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_workspace_id   uuid NOT NULL DEFAULT public.current_tenant_id()
                        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by            uuid NOT NULL DEFAULT auth.uid()
                        REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name        text NOT NULL DEFAULT 'Proj OS member',
  requester_avatar_url  text,
  title                 text NOT NULL CHECK (btrim(title) <> ''),
  description           text NOT NULL CHECK (btrim(description) <> ''),
  category              text NOT NULL DEFAULT 'other'
                        CHECK (category IN (
                          'project_controls', 'financials', 'field_operations',
                          'reporting', 'mobile', 'integrations', 'other'
                        )),
  status                text NOT NULL DEFAULT 'submitted'
                        CHECK (status IN (
                          'submitted', 'under_review', 'escalated', 'planned',
                          'in_progress', 'shipped', 'rejected'
                        )),
  status_changed_at     timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_idea_votes (
  idea_id              uuid NOT NULL REFERENCES public.product_ideas(id) ON DELETE CASCADE,
  user_id              uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  source_workspace_id  uuid NOT NULL DEFAULT public.current_tenant_id()
                       REFERENCES public.workspaces(id) ON DELETE CASCADE,
  value                smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.product_idea_updates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id        uuid NOT NULL REFERENCES public.product_ideas(id) ON DELETE CASCADE,
  created_by     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  author_name    text NOT NULL DEFAULT 'Proj OS team',
  update_type    text NOT NULL DEFAULT 'note' CHECK (update_type IN ('note', 'status')),
  from_status    text,
  to_status      text,
  title          text NOT NULL CHECK (btrim(title) <> ''),
  body           text NOT NULL CHECK (btrim(body) <> ''),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_ideas_status_created_idx
  ON public.product_ideas (status, created_at DESC);
CREATE INDEX IF NOT EXISTS product_ideas_creator_idx
  ON public.product_ideas (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS product_idea_votes_idea_idx
  ON public.product_idea_votes (idea_id, value);
CREATE INDEX IF NOT EXISTS product_idea_updates_idea_created_idx
  ON public.product_idea_updates (idea_id, created_at DESC);

DROP TRIGGER IF EXISTS product_ideas_set_updated_at ON public.product_ideas;
CREATE TRIGGER product_ideas_set_updated_at
  BEFORE UPDATE ON public.product_ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS product_idea_votes_set_updated_at ON public.product_idea_votes;
CREATE TRIGGER product_idea_votes_set_updated_at
  BEFORE UPDATE ON public.product_idea_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.product_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_idea_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_idea_updates ENABLE ROW LEVEL SECURITY;

-- Product Ideas is intentionally a cross-workspace community board, but it is
-- never public: every read requires a signed-in Proj OS account.
CREATE POLICY product_ideas_signed_in_read
  ON public.product_ideas FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY product_ideas_signed_in_create
  ON public.product_ideas FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND source_workspace_id = public.current_tenant_id()
    AND status = 'submitted'
  );

CREATE POLICY product_ideas_admin_update
  ON public.product_ideas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY product_ideas_creator_delete_draft
  ON public.product_ideas FOR DELETE TO authenticated
  USING (auth.uid() = created_by AND status = 'submitted');

CREATE POLICY product_idea_votes_own_read
  ON public.product_idea_votes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY product_idea_votes_own_write
  ON public.product_idea_votes FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND source_workspace_id = public.current_tenant_id()
  );

CREATE POLICY product_idea_updates_signed_in_read
  ON public.product_idea_updates FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY product_idea_updates_admin_create
  ON public.product_idea_updates FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_ideas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_idea_votes TO authenticated;
GRANT SELECT, INSERT ON public.product_idea_updates TO authenticated;

-- Return aggregate vote totals without exposing the voters of other tenants.
CREATE OR REPLACE FUNCTION public.get_product_idea_vote_summary()
RETURNS TABLE (
  idea_id uuid,
  upvotes bigint,
  downvotes bigint,
  user_vote smallint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    count(v.*) FILTER (WHERE v.value = 1) AS upvotes,
    count(v.*) FILTER (WHERE v.value = -1) AS downvotes,
    max(v.value) FILTER (WHERE v.user_id = auth.uid())::smallint AS user_vote
  FROM public.product_ideas i
  LEFT JOIN public.product_idea_votes v ON v.idea_id = i.id
  WHERE auth.uid() IS NOT NULL
  GROUP BY i.id;
$$;

-- Create the idea and its first supporter in one transaction. The text columns
-- intentionally have no length cap; clients can supply all the context needed.
CREATE OR REPLACE FUNCTION public.create_product_idea(
  p_title text,
  p_description text,
  p_category text,
  p_requester_name text,
  p_requester_avatar_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea_id uuid;
  v_workspace uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF btrim(coalesce(p_title, '')) = '' OR btrim(coalesce(p_description, '')) = '' THEN
    RAISE EXCEPTION 'A title and description are required';
  END IF;
  IF p_category NOT IN (
    'project_controls', 'financials', 'field_operations',
    'reporting', 'mobile', 'integrations', 'other'
  ) THEN
    RAISE EXCEPTION 'Invalid product idea category';
  END IF;

  v_workspace := public.current_tenant_id();
  IF v_workspace IS NULL THEN
    RAISE EXCEPTION 'Workspace required';
  END IF;

  INSERT INTO public.product_ideas (
    source_workspace_id, created_by, requester_name, requester_avatar_url,
    title, description, category, status
  ) VALUES (
    v_workspace,
    auth.uid(),
    coalesce(nullif(btrim(p_requester_name), ''), 'Proj OS member'),
    p_requester_avatar_url,
    btrim(p_title),
    btrim(p_description),
    p_category,
    'submitted'
  )
  RETURNING id INTO v_idea_id;

  INSERT INTO public.product_idea_votes (
    idea_id, user_id, source_workspace_id, value
  ) VALUES (
    v_idea_id, auth.uid(), v_workspace, 1
  );

  RETURN v_idea_id;
END;
$$;

-- A repeated click removes the vote; choosing the other direction switches it.
CREATE OR REPLACE FUNCTION public.cast_product_idea_vote(
  p_idea_id uuid,
  p_value smallint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing smallint;
  v_workspace uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_value NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Vote must be 1 or -1';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.product_ideas WHERE id = p_idea_id) THEN
    RAISE EXCEPTION 'Product idea not found';
  END IF;

  v_workspace := public.current_tenant_id();
  IF v_workspace IS NULL THEN
    RAISE EXCEPTION 'Workspace required';
  END IF;

  SELECT value INTO v_existing
  FROM public.product_idea_votes
  WHERE idea_id = p_idea_id AND user_id = auth.uid();

  IF v_existing = p_value THEN
    DELETE FROM public.product_idea_votes
    WHERE idea_id = p_idea_id AND user_id = auth.uid();
  ELSE
    INSERT INTO public.product_idea_votes (
      idea_id, user_id, source_workspace_id, value
    ) VALUES (
      p_idea_id, auth.uid(), v_workspace, p_value
    )
    ON CONFLICT (idea_id, user_id)
    DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  END IF;
END;
$$;

-- Status changes and their public explanation are committed atomically. This
-- prevents an idea from being declined without the reason clients were promised.
CREATE OR REPLACE FUNCTION public.publish_product_idea_update(
  p_idea_id uuid,
  p_status text,
  p_title text,
  p_body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_update_id uuid;
  v_author_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF btrim(coalesce(p_title, '')) = '' OR btrim(coalesce(p_body, '')) = '' THEN
    RAISE EXCEPTION 'An update title and explanation are required';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN (
    'submitted', 'under_review', 'escalated', 'planned',
    'in_progress', 'shipped', 'rejected'
  ) THEN
    RAISE EXCEPTION 'Invalid product idea status';
  END IF;
  IF p_status = 'rejected' AND btrim(coalesce(p_body, '')) = '' THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;

  SELECT status INTO v_old_status
  FROM public.product_ideas
  WHERE id = p_idea_id
  FOR UPDATE;
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Product idea not found';
  END IF;

  IF p_status IS NOT NULL AND p_status <> v_old_status THEN
    UPDATE public.product_ideas
    SET status = p_status, status_changed_at = now()
    WHERE id = p_idea_id;
  END IF;

  v_author_name := coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(split_part(auth.jwt() ->> 'email', '@', 1), ''),
    'Proj OS team'
  );

  INSERT INTO public.product_idea_updates (
    idea_id, created_by, author_name, update_type,
    from_status, to_status, title, body
  ) VALUES (
    p_idea_id,
    auth.uid(),
    v_author_name,
    CASE WHEN p_status IS NOT NULL AND p_status <> v_old_status THEN 'status' ELSE 'note' END,
    v_old_status,
    coalesce(p_status, v_old_status),
    btrim(p_title),
    btrim(p_body)
  )
  RETURNING id INTO v_update_id;

  RETURN v_update_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_product_idea_vote_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_product_idea(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cast_product_idea_vote(uuid, smallint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_product_idea_update(uuid, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_product_idea_vote_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_idea(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_product_idea_vote(uuid, smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_product_idea_update(uuid, text, text, text) TO authenticated;

COMMIT;
