-- Add new columns for archive, delete, and threading functionality
ALTER TABLE public.report_emails
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.report_emails(id),
ADD COLUMN IF NOT EXISTS thread_id uuid;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_report_emails_archived ON public.report_emails(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_report_emails_deleted ON public.report_emails(is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_report_emails_thread ON public.report_emails(thread_id) WHERE thread_id IS NOT NULL;

-- Add DELETE policy for authenticated users
CREATE POLICY "Users can delete their own emails"
ON public.report_emails
FOR DELETE
USING (auth.uid() = sent_by);