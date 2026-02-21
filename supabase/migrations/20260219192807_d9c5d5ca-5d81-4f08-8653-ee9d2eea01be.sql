
-- ============================================================
-- CLIENT PORTAL SYSTEM MIGRATION
-- Uses profiles.workspace_id pattern (no workspace_members table)
-- ============================================================

-- 1. PORTALS TABLE
CREATE TABLE public.client_portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,

  -- Identity
  name TEXT NOT NULL,
  portal_type TEXT NOT NULL DEFAULT 'client',
  -- 'client' | 'project'
  project_id UUID,

  -- Client org info
  client_name TEXT,
  client_contact_name TEXT,
  client_contact_email TEXT,

  -- Branding
  brand_logo_url TEXT,
  brand_accent_color TEXT DEFAULT '#0F172A',
  welcome_message TEXT,

  -- Access
  portal_slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft',
  -- 'draft' | 'active' | 'archived'

  -- Shared modules config
  shared_modules TEXT[] NOT NULL DEFAULT '{}',

  -- Pending document requests count (denormalized)
  pending_requests_count INTEGER NOT NULL DEFAULT 0,

  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers manage own portals"
  ON public.client_portals FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

-- 2. PORTAL ACCESS (client users)
CREATE TABLE public.portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL
    REFERENCES public.client_portals(id)
    ON DELETE CASCADE,

  email TEXT NOT NULL,
  name TEXT,
  company TEXT,

  -- Auth
  password_hash TEXT,
  magic_link_token TEXT,
  magic_link_expires_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER NOT NULL DEFAULT 0,

  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_by UUID NOT NULL REFERENCES public.profiles(user_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(portal_id, email)
);

ALTER TABLE public.portal_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers manage portal access"
  ON public.portal_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portals cp
      JOIN public.profiles pr ON pr.workspace_id = cp.workspace_id
      WHERE cp.id = portal_id
      AND pr.user_id = auth.uid()
    )
  );

-- 3. PORTAL EXCLUDED RECORDS
CREATE TABLE public.portal_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL
    REFERENCES public.client_portals(id)
    ON DELETE CASCADE,

  module TEXT NOT NULL,
  record_id UUID NOT NULL,
  excluded_by UUID NOT NULL REFERENCES public.profiles(user_id),
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(portal_id, module, record_id)
);

ALTER TABLE public.portal_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers manage exclusions"
  ON public.portal_exclusions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portals cp
      JOIN public.profiles pr ON pr.workspace_id = cp.workspace_id
      WHERE cp.id = portal_id
      AND pr.user_id = auth.uid()
    )
  );

-- 4. PORTAL DOCUMENT REQUESTS
CREATE TABLE public.portal_document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL
    REFERENCES public.client_portals(id)
    ON DELETE CASCADE,

  requested_by_email TEXT NOT NULL,
  requested_by_name TEXT,

  request_type TEXT NOT NULL DEFAULT 'document',
  -- 'document' | 'update' | 'clarification'

  module TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'in_review' | 'fulfilled' | 'declined'

  response_message TEXT,
  responded_by UUID REFERENCES public.profiles(user_id),
  responded_at TIMESTAMPTZ,

  fulfilled_record_id UUID,
  fulfilled_module TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers manage requests"
  ON public.portal_document_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portals cp
      JOIN public.profiles pr ON pr.workspace_id = cp.workspace_id
      WHERE cp.id = portal_id
      AND pr.user_id = auth.uid()
    )
  );

-- 5. PORTAL ACTIVITY LOG
CREATE TABLE public.portal_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL
    REFERENCES public.client_portals(id)
    ON DELETE CASCADE,

  actor_email TEXT NOT NULL,
  actor_name TEXT,

  activity_type TEXT NOT NULL,
  -- 'login' | 'view_module' | 'download_document' |
  -- 'submit_request' | 'view_record'

  module TEXT,
  record_id UUID,
  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers view activity"
  ON public.portal_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portals cp
      JOIN public.profiles pr ON pr.workspace_id = cp.workspace_id
      WHERE cp.id = portal_id
      AND pr.user_id = auth.uid()
    )
  );

-- Allow inserts from edge functions (service role) or anonymous portal clients
-- via a permissive insert policy (portal clients don't have Supabase auth)
CREATE POLICY "Allow activity inserts"
  ON public.portal_activity FOR INSERT
  WITH CHECK (true);

-- 6. TRIGGER: update updated_at on portals
CREATE OR REPLACE FUNCTION public.update_portal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_client_portals_updated_at
  BEFORE UPDATE ON public.client_portals
  FOR EACH ROW EXECUTE FUNCTION public.update_portal_updated_at();

CREATE TRIGGER update_portal_access_updated_at
  BEFORE UPDATE ON public.portal_access
  FOR EACH ROW EXECUTE FUNCTION public.update_portal_updated_at();

CREATE TRIGGER update_portal_document_requests_updated_at
  BEFORE UPDATE ON public.portal_document_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_portal_updated_at();

-- 7. STORAGE BUCKET: portal-assets (public for logos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portal-assets',
  'portal-assets',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Portal assets are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portal-assets');

CREATE POLICY "Managers can upload portal assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portal-assets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Managers can update portal assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'portal-assets'
    AND auth.uid() IS NOT NULL
  );

-- 8. INDEXES
CREATE INDEX idx_client_portals_workspace ON public.client_portals(workspace_id);
CREATE INDEX idx_client_portals_slug ON public.client_portals(portal_slug);
CREATE INDEX idx_client_portals_status ON public.client_portals(status);
CREATE INDEX idx_portal_access_portal ON public.portal_access(portal_id);
CREATE INDEX idx_portal_access_email ON public.portal_access(email);
CREATE INDEX idx_portal_access_token ON public.portal_access(magic_link_token);
CREATE INDEX idx_portal_exclusions_portal ON public.portal_exclusions(portal_id);
CREATE INDEX idx_portal_requests_portal ON public.portal_document_requests(portal_id);
CREATE INDEX idx_portal_requests_status ON public.portal_document_requests(status);
CREATE INDEX idx_portal_activity_portal ON public.portal_activity(portal_id);
