
-- Project Discussions table
CREATE TABLE public.project_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  created_by UUID NOT NULL,
  linked_entity_type TEXT, -- 'issue', 'rfi', 'punch_item', 'milestone', null for standalone
  linked_entity_id UUID,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Discussion Replies table
CREATE TABLE public.project_discussion_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.project_discussions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_html TEXT,
  created_by UUID NOT NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_project_discussions_project ON public.project_discussions(project_id);
CREATE INDEX idx_project_discussions_date ON public.project_discussions(created_at);
CREATE INDEX idx_project_discussion_replies_discussion ON public.project_discussion_replies(discussion_id);

-- RLS
ALTER TABLE public.project_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_discussion_replies ENABLE ROW LEVEL SECURITY;

-- Policies for discussions
CREATE POLICY "Authenticated users can view project discussions"
  ON public.project_discussions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create discussions"
  ON public.project_discussions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators admins managers can update discussions"
  ON public.project_discussions FOR UPDATE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete discussions"
  ON public.project_discussions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for replies
CREATE POLICY "Authenticated users can view discussion replies"
  ON public.project_discussion_replies FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create replies"
  ON public.project_discussion_replies FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their replies"
  ON public.project_discussion_replies FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creators and admins can delete replies"
  ON public.project_discussion_replies FOR DELETE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_project_discussions_updated_at
  BEFORE UPDATE ON public.project_discussions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_discussion_replies;
