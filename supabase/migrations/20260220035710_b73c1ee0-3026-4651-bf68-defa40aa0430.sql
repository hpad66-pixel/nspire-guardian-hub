-- Create workspace-logos storage bucket (public, for company logos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-logos',
  'workspace-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone authenticated can read logos (used in public portal pages)
CREATE POLICY "Workspace logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'workspace-logos');

-- RLS: Admins can upload/replace their workspace logo
CREATE POLICY "Admins can upload workspace logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'workspace-logos'
  AND auth.role() = 'authenticated'
);

-- RLS: Admins can update workspace logos
CREATE POLICY "Admins can update workspace logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'workspace-logos'
  AND auth.role() = 'authenticated'
);

-- RLS: Admins can delete workspace logos
CREATE POLICY "Admins can delete workspace logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'workspace-logos'
  AND auth.role() = 'authenticated'
);