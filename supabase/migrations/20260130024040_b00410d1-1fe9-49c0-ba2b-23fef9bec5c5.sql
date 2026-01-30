-- Create table to track @mentions in issue comments
CREATE TABLE public.issue_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.issue_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_issue_mentions_user ON public.issue_mentions(mentioned_user_id);
CREATE INDEX idx_issue_mentions_issue ON public.issue_mentions(issue_id);

-- Enable Row Level Security
ALTER TABLE public.issue_mentions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view mentions"
ON public.issue_mentions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create mentions with own comments"
ON public.issue_mentions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.issue_comments 
    WHERE id = comment_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete mentions from own comments"
ON public.issue_mentions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.issue_comments 
    WHERE id = comment_id AND user_id = auth.uid()
  )
);