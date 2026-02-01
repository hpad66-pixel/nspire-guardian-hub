-- Proposal types enum
CREATE TYPE proposal_type AS ENUM (
  'project_proposal',
  'change_order_request',
  'scope_amendment',
  'cost_estimate',
  'letter',
  'memo',
  'correspondence'
);

-- Proposal status enum
CREATE TYPE proposal_status AS ENUM (
  'draft',
  'review',
  'approved',
  'sent',
  'archived'
);

-- Project proposals table
CREATE TABLE public.project_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Proposal metadata
  proposal_number SERIAL,
  proposal_type proposal_type NOT NULL DEFAULT 'project_proposal',
  title TEXT NOT NULL,
  subject TEXT,
  status proposal_status NOT NULL DEFAULT 'draft',
  
  -- Content
  content_html TEXT,
  content_text TEXT,
  
  -- AI generation metadata
  ai_prompt TEXT,
  ai_generated BOOLEAN DEFAULT false,
  
  -- Branding
  include_letterhead BOOLEAN DEFAULT true,
  include_logo BOOLEAN DEFAULT true,
  letterhead_config JSONB DEFAULT '{}',
  
  -- Recipients
  recipient_name TEXT,
  recipient_email TEXT,
  recipient_company TEXT,
  recipient_address TEXT,
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  sent_by UUID,
  sent_email_id UUID REFERENCES public.report_emails(id),
  
  -- Attachments (stored as array of document IDs)
  attachment_ids UUID[] DEFAULT '{}',
  
  -- Audit
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Version control
  version INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES public.project_proposals(id)
);

-- Proposal templates for AI generation
CREATE TABLE public.proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  proposal_type proposal_type NOT NULL,
  prompt_template TEXT NOT NULL,
  content_template TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company branding settings (stored per user)
CREATE TABLE public.company_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#3b82f6',
  address_line1 TEXT,
  address_line2 TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  footer_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Add proposal_id column to report_emails
ALTER TABLE public.report_emails ADD COLUMN proposal_id UUID REFERENCES public.project_proposals(id);

-- Indexes
CREATE INDEX idx_proposals_project ON public.project_proposals(project_id);
CREATE INDEX idx_proposals_status ON public.project_proposals(status);
CREATE INDEX idx_proposals_created_by ON public.project_proposals(created_by);

-- RLS
ALTER TABLE public.project_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;

-- Only admins can manage proposals (full CRUD)
CREATE POLICY "Admins can manage proposals" ON public.project_proposals
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Managers can view proposals (read-only)
CREATE POLICY "Managers can view proposals" ON public.project_proposals
  FOR SELECT USING (has_role(auth.uid(), 'manager'));

-- Admins can manage templates
CREATE POLICY "Admins can manage templates" ON public.proposal_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- All authenticated users can view templates
CREATE POLICY "Authenticated users can view templates" ON public.proposal_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users manage their own branding
CREATE POLICY "Users manage own branding" ON public.company_branding
  FOR ALL USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.project_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branding_updated_at BEFORE UPDATE ON public.company_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.proposal_templates (name, description, proposal_type, prompt_template, is_default) VALUES
(
  'Project Proposal',
  'Standard project proposal template',
  'project_proposal',
  'Generate a professional project proposal for the following project:

Project Name: {{project_name}}
Property: {{property_name}}
Description: {{project_description}}
Scope: {{project_scope}}
Budget: {{budget}}
Timeline: {{start_date}} to {{target_end_date}}

The proposal should include:
1. Executive Summary
2. Project Understanding
3. Proposed Approach
4. Scope of Work
5. Timeline and Milestones
6. Investment Summary
7. Terms and Conditions
8. Next Steps

Write in a professional, confident tone. Be specific about deliverables.',
  true
),
(
  'Change Order Request',
  'Request for project scope or cost changes',
  'change_order_request',
  'Generate a professional change order request for:

Project Name: {{project_name}}
Property: {{property_name}}
Current Status: {{project_status}}

Change Details:
{{user_notes}}

The request should include:
1. Change Order Summary
2. Reason for Change
3. Impact on Timeline
4. Cost Impact
5. Required Approvals',
  true
),
(
  'Professional Letter',
  'General business correspondence',
  'letter',
  'Generate a professional business letter regarding:

Project Name: {{project_name}}
Property: {{property_name}}
Subject: {{subject}}

Key Points:
{{user_notes}}

The letter should be formal, clear, and professional.',
  true
),
(
  'Scope Amendment',
  'Document scope changes to a project',
  'scope_amendment',
  'Generate a professional scope amendment document for:

Project Name: {{project_name}}
Property: {{property_name}}
Original Scope: {{project_scope}}

Amendment Details:
{{user_notes}}

The document should include:
1. Amendment Summary
2. Original Scope Reference
3. Proposed Changes
4. Impact Analysis
5. Approval Requirements',
  true
),
(
  'Cost Estimate',
  'Detailed cost breakdown and estimate',
  'cost_estimate',
  'Generate a professional cost estimate for:

Project Name: {{project_name}}
Property: {{property_name}}
Scope: {{project_scope}}
Budget Range: {{budget}}

Additional Details:
{{user_notes}}

The estimate should include:
1. Executive Summary
2. Scope of Work
3. Itemized Cost Breakdown
4. Contingency Allowances
5. Payment Terms
6. Validity Period',
  true
);