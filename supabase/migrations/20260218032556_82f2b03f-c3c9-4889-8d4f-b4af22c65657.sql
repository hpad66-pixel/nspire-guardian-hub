
-- Create project_action_items table
CREATE TABLE public.project_action_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'todo'
                    CHECK (status IN ('todo','in_progress','in_review','done','cancelled')),
  priority          TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('urgent','high','medium','low')),
  assigned_to       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date          DATE,
  completed_at      TIMESTAMPTZ,
  tags              TEXT[] DEFAULT '{}',
  linked_entity_type TEXT,
  linked_entity_id  UUID,
  sort_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view action items"
  ON public.project_action_items FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can create action items"
  ON public.project_action_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator or assignee can update action items"
  ON public.project_action_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "Creator can delete action items"
  ON public.project_action_items FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- updated_at trigger
CREATE TRIGGER update_project_action_items_updated_at
  BEFORE UPDATE ON public.project_action_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create action_item_comments table
CREATE TABLE public.action_item_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_item_id  UUID NOT NULL REFERENCES project_action_items(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.action_item_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comments"
  ON public.action_item_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create comments"
  ON public.action_item_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own comments"
  ON public.action_item_comments FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own comments"
  ON public.action_item_comments FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE TRIGGER update_action_item_comments_updated_at
  BEFORE UPDATE ON public.action_item_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_action_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_item_comments;
