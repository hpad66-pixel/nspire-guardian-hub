-- Drop the existing constraint that requires a report reference
ALTER TABLE public.report_emails DROP CONSTRAINT IF EXISTS report_reference_check;

-- Add a new constraint that allows standalone emails (source_module = 'mailbox')
ALTER TABLE public.report_emails ADD CONSTRAINT report_reference_check 
CHECK (
  (source_module = 'mailbox') OR 
  (report_id IS NOT NULL) OR 
  (daily_inspection_id IS NOT NULL)
);