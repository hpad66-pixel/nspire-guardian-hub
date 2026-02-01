-- Add report_type column to distinguish between report types
ALTER TABLE report_emails 
ADD COLUMN report_type TEXT DEFAULT 'daily_report';

-- Add sender info
ALTER TABLE report_emails
ADD COLUMN sent_by UUID REFERENCES auth.users(id);

-- Add optional reference to daily_inspection
ALTER TABLE report_emails
ADD COLUMN daily_inspection_id UUID REFERENCES daily_inspections(id);

-- Drop the existing foreign key constraint on report_id so we can make it nullable
ALTER TABLE report_emails DROP CONSTRAINT IF EXISTS report_emails_report_id_fkey;

-- Make report_id nullable since we're adding daily_inspection_id
ALTER TABLE report_emails
ALTER COLUMN report_id DROP NOT NULL;

-- Re-add the foreign key without NOT NULL constraint
ALTER TABLE report_emails
ADD CONSTRAINT report_emails_report_id_fkey FOREIGN KEY (report_id) REFERENCES daily_reports(id);

-- Add check constraint to ensure at least one reference exists
ALTER TABLE report_emails
ADD CONSTRAINT report_reference_check 
CHECK (report_id IS NOT NULL OR daily_inspection_id IS NOT NULL);

-- Add RLS policy for sent_by viewing
CREATE POLICY "Users can view emails they sent"
ON report_emails FOR SELECT
USING (auth.uid() = sent_by);

-- Add update policy for resending failed emails
CREATE POLICY "Users can update emails they sent"
ON report_emails FOR UPDATE
USING (auth.uid() = sent_by);