-- Add message type enum
CREATE TYPE public.message_type AS ENUM ('external', 'internal');

-- Add columns for internal messaging
ALTER TABLE public.report_emails
ADD COLUMN IF NOT EXISTS message_type public.message_type DEFAULT 'external',
ADD COLUMN IF NOT EXISTS recipient_user_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS from_user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS from_user_name text,
ADD COLUMN IF NOT EXISTS cc_recipients text[] DEFAULT '{}';

-- Create index for recipient lookup
CREATE INDEX IF NOT EXISTS idx_report_emails_recipient_user_ids 
ON public.report_emails USING GIN (recipient_user_ids);

-- Update RLS policy to allow users to see messages sent TO them
DROP POLICY IF EXISTS "Users can view own sent emails" ON public.report_emails;

CREATE POLICY "Users can view emails they sent or received"
ON public.report_emails
FOR SELECT
USING (
  sent_by = auth.uid() 
  OR auth.uid() = ANY(recipient_user_ids)
);

-- Policy for inserting emails (users can send)
DROP POLICY IF EXISTS "Users can insert emails" ON public.report_emails;

CREATE POLICY "Users can insert emails"
ON public.report_emails
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for updating emails (mark as read, archive, etc.)
DROP POLICY IF EXISTS "Users can update their emails" ON public.report_emails;

CREATE POLICY "Users can update their emails"
ON public.report_emails
FOR UPDATE
USING (
  sent_by = auth.uid() 
  OR auth.uid() = ANY(recipient_user_ids)
);