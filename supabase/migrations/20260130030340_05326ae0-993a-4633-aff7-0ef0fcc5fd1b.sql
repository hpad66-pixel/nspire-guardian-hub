-- Create organization_documents table
CREATE TABLE public.organization_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder TEXT NOT NULL DEFAULT 'General',
  subfolder TEXT,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES public.organization_documents(id),
  uploaded_by UUID,
  expiry_date DATE,
  tags TEXT[] DEFAULT '{}',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.organization_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Organization documents RLS policies
CREATE POLICY "Authenticated users can view documents"
ON public.organization_documents FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload documents"
ON public.organization_documents FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders and admins can update documents"
ON public.organization_documents FOR UPDATE
USING (auth.uid() = uploaded_by OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete documents"
ON public.organization_documents FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Notifications RLS policies
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for organization documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-documents', 'organization-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for organization documents bucket
CREATE POLICY "Authenticated users can view org documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload org documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'organization-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update own org documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'organization-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete org documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'organization-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger for organization_documents
CREATE TRIGGER update_organization_documents_updated_at
BEFORE UPDATE ON public.organization_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();