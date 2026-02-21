-- Create email-attachments storage bucket (private, signed URLs for download)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-attachments',
  'email-attachments',
  false,
  26214400, -- 25MB limit
  ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv', 'application/zip', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for email-attachments bucket
CREATE POLICY "Authenticated users can upload email attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'email-attachments');

CREATE POLICY "Authenticated users can view email attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'email-attachments');

CREATE POLICY "Authenticated users can delete their email attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'email-attachments');