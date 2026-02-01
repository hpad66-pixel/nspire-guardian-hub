-- Add columns for full email content and read tracking
ALTER TABLE report_emails
ADD COLUMN IF NOT EXISTS body_html TEXT,
ADD COLUMN IF NOT EXISTS body_text TEXT,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attachment_filename TEXT,
ADD COLUMN IF NOT EXISTS attachment_size BIGINT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_emails_is_read ON report_emails(is_read);
CREATE INDEX IF NOT EXISTS idx_report_emails_sent_by ON report_emails(sent_by);