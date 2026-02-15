
-- Create storage bucket for discussion attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('discussion-attachments', 'discussion-attachments', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload discussion attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'discussion-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view discussion attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'discussion-attachments');

CREATE POLICY "Users can delete own discussion attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'discussion-attachments' AND auth.uid() IS NOT NULL);

-- Add attachment columns to discussions and replies
ALTER TABLE public.project_discussions ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}'::text[];
ALTER TABLE public.project_discussion_replies ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}'::text[];
