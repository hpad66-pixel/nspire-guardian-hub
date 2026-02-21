
-- 1. Create credentials table
CREATE TABLE public.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  holder_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  custom_type_label TEXT,
  issuing_authority TEXT,
  credential_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  renewal_url TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  is_org_credential BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES public.profiles(user_id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create credential_alerts table
CREATE TABLE public.credential_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES public.credentials(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  sent_to UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create credential_share_links table
CREATE TABLE public.credential_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES public.credentials(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  accessed_at TIMESTAMPTZ,
  access_count INTEGER NOT NULL DEFAULT 0,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_share_links ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies — credentials
CREATE POLICY "Users can view own credentials"
  ON public.credentials FOR SELECT
  USING (holder_id = auth.uid() OR is_org_credential = true);

CREATE POLICY "Users can insert own credentials"
  ON public.credentials FOR INSERT
  WITH CHECK (holder_id = auth.uid());

CREATE POLICY "Users can update own credentials"
  ON public.credentials FOR UPDATE
  USING (holder_id = auth.uid());

CREATE POLICY "Users can delete own credentials"
  ON public.credentials FOR DELETE
  USING (holder_id = auth.uid());

CREATE POLICY "Admins can view all credentials"
  ON public.credentials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can manage all credentials"
  ON public.credentials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- 6. RLS Policies — credential_alerts
CREATE POLICY "Users can view own alerts"
  ON public.credential_alerts FOR SELECT
  USING (sent_to = auth.uid());

CREATE POLICY "Admins can manage alerts"
  ON public.credential_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- 7. RLS Policies — share links
CREATE POLICY "Users can manage own share links"
  ON public.credential_share_links FOR ALL
  USING (created_by = auth.uid());

CREATE POLICY "Public can read share links by token"
  ON public.credential_share_links FOR SELECT
  USING (true);

CREATE POLICY "Public can read credentials via share"
  ON public.credentials FOR SELECT
  USING (true);

-- 8. Indexes
CREATE INDEX idx_credentials_holder_id ON public.credentials(holder_id);
CREATE INDEX idx_credentials_workspace_id ON public.credentials(workspace_id);
CREATE INDEX idx_credentials_expiry_date ON public.credentials(expiry_date);
CREATE INDEX idx_credentials_status ON public.credentials(status);
CREATE INDEX idx_share_links_token ON public.credential_share_links(token);
CREATE INDEX idx_share_links_expires_at ON public.credential_share_links(expires_at);

-- 9. Updated_at trigger
CREATE TRIGGER update_credentials_updated_at
  BEFORE UPDATE ON public.credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Storage bucket for credential documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'credentials-documents',
  'credentials-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload their own credential docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'credentials-documents'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view their own credential docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'credentials-documents'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their own credential docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'credentials-documents'
    AND auth.uid() IS NOT NULL
  );
