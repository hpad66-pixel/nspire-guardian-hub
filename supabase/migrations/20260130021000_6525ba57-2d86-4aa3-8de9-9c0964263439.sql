-- Expand app_role enum with construction-specific roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'project_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superintendent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'subcontractor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- Create communication type enum
CREATE TYPE public.communication_type AS ENUM ('call', 'email', 'meeting', 'note');

-- Create RFI status enum
CREATE TYPE public.rfi_status AS ENUM ('open', 'pending', 'answered', 'closed');

-- Create submittal status enum
CREATE TYPE public.submittal_status AS ENUM ('pending', 'approved', 'rejected', 'revise');

-- Create punch item status enum
CREATE TYPE public.punch_status AS ENUM ('open', 'in_progress', 'completed', 'verified');

-- Add enhanced fields to daily_reports
ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS work_performed_html TEXT,
ADD COLUMN IF NOT EXISTS safety_notes TEXT,
ADD COLUMN IF NOT EXISTS equipment_used TEXT[],
ADD COLUMN IF NOT EXISTS materials_received TEXT,
ADD COLUMN IF NOT EXISTS subcontractors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS delays TEXT,
ADD COLUMN IF NOT EXISTS visitor_log JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS signature_date TIMESTAMPTZ;

-- Create project_team_members table for project-level permissions
CREATE TABLE IF NOT EXISTS public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  added_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view team members"
ON public.project_team_members FOR SELECT
USING (true);

CREATE POLICY "Admins and managers can manage team members"
ON public.project_team_members FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Create project_communications table
CREATE TABLE IF NOT EXISTS public.project_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  type communication_type NOT NULL DEFAULT 'note',
  subject TEXT NOT NULL,
  content TEXT,
  participants TEXT[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view communications"
ON public.project_communications FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create communications"
ON public.project_communications FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their communications"
ON public.project_communications FOR UPDATE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Create project_rfis table
CREATE TABLE IF NOT EXISTS public.project_rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  rfi_number SERIAL,
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  response TEXT,
  status rfi_status NOT NULL DEFAULT 'open',
  due_date DATE,
  assigned_to UUID,
  responded_by UUID,
  responded_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_rfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view RFIs"
ON public.project_rfis FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create RFIs"
ON public.project_rfis FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Assigned users and managers can update RFIs"
ON public.project_rfis FOR UPDATE
USING (auth.uid() = assigned_to OR auth.uid() = created_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Create project_submittals table
CREATE TABLE IF NOT EXISTS public.project_submittals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  submittal_number SERIAL,
  title TEXT NOT NULL,
  description TEXT,
  status submittal_status NOT NULL DEFAULT 'pending',
  revision INTEGER DEFAULT 1,
  due_date DATE,
  file_urls TEXT[] DEFAULT '{}',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_submittals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view submittals"
ON public.project_submittals FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create submittals"
ON public.project_submittals FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Managers can update submittals"
ON public.project_submittals FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR auth.uid() = created_by);

-- Create punch_items table
CREATE TABLE IF NOT EXISTS public.punch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_to UUID,
  status punch_status NOT NULL DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  before_photos TEXT[] DEFAULT '{}',
  after_photos TEXT[] DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.punch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view punch items"
ON public.punch_items FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create punch items"
ON public.punch_items FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Assigned users and managers can update punch items"
ON public.punch_items FOR UPDATE
USING (auth.uid() = assigned_to OR auth.uid() = created_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Create project_documents table
CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  folder TEXT DEFAULT 'General',
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view documents"
ON public.project_documents FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can upload documents"
ON public.project_documents FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders and managers can update documents"
ON public.project_documents FOR UPDATE
USING (auth.uid() = uploaded_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete documents"
ON public.project_documents FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create activity_log table for full audit trail
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view activity log"
ON public.activity_log FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "System can insert activity log"
ON public.activity_log FOR INSERT
WITH CHECK (true);

-- Create report_emails table to track sent emails
CREATE TABLE IF NOT EXISTS public.report_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.daily_reports(id) ON DELETE CASCADE NOT NULL,
  recipients TEXT[] NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'sent',
  error_message TEXT
);

ALTER TABLE public.report_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view report emails"
ON public.report_emails FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create report emails"
ON public.report_emails FOR INSERT
WITH CHECK (true);

-- Create storage bucket for daily report photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('daily-report-photos', 'daily-report-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for daily report photos bucket
CREATE POLICY "Daily report photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'daily-report-photos');

CREATE POLICY "Authenticated users can upload daily report photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'daily-report-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own daily report photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'daily-report-photos' AND auth.uid() IS NOT NULL);

-- Create storage bucket for project documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for project documents bucket
CREATE POLICY "Authenticated users can view project documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload project documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete project documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-documents' AND has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_project_team_members_updated_at
BEFORE UPDATE ON public.project_team_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_communications_updated_at
BEFORE UPDATE ON public.project_communications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_rfis_updated_at
BEFORE UPDATE ON public.project_rfis
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_submittals_updated_at
BEFORE UPDATE ON public.project_submittals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_punch_items_updated_at
BEFORE UPDATE ON public.punch_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_documents_updated_at
BEFORE UPDATE ON public.project_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();