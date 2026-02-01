-- =============================================
-- CRM CONTACTS SYSTEM
-- =============================================

-- Contact type enum
CREATE TYPE public.contact_type AS ENUM (
  'vendor',
  'regulator',
  'contractor',
  'tenant',
  'owner',
  'inspector',
  'utility',
  'government',
  'other'
);

-- Main contacts table (supports both personal and property-level)
CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Ownership: if user_id is set = personal contact, if property_id is set = property contact
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Contact info
  first_name TEXT NOT NULL,
  last_name TEXT,
  company_name TEXT,
  job_title TEXT,
  contact_type contact_type NOT NULL DEFAULT 'other',
  
  -- Communication details
  email TEXT,
  phone TEXT,
  mobile TEXT,
  fax TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Organization details
  website TEXT,
  license_number TEXT,
  insurance_expiry DATE,
  
  -- Custom categorization
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  
  -- Metadata
  is_favorite BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- At least one of user_id or property_id must be set
  CONSTRAINT contact_ownership_check CHECK (user_id IS NOT NULL OR property_id IS NOT NULL)
);

-- Index for fast lookups
CREATE INDEX idx_crm_contacts_user_id ON public.crm_contacts(user_id);
CREATE INDEX idx_crm_contacts_property_id ON public.crm_contacts(property_id);
CREATE INDEX idx_crm_contacts_type ON public.crm_contacts(contact_type);
CREATE INDEX idx_crm_contacts_email ON public.crm_contacts(email);
CREATE INDEX idx_crm_contacts_tags ON public.crm_contacts USING GIN(tags);

-- Enable RLS
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_contacts
-- Users can view their own personal contacts
CREATE POLICY "Users can view own personal contacts"
  ON public.crm_contacts FOR SELECT
  USING (user_id = auth.uid());

-- Users can view property-level contacts for properties they have access to
CREATE POLICY "Users can view property contacts"
  ON public.crm_contacts FOR SELECT
  USING (
    property_id IS NOT NULL 
    AND auth.uid() IS NOT NULL
    AND (
      -- User is on the property team
      EXISTS (
        SELECT 1 FROM public.property_team_members 
        WHERE property_id = crm_contacts.property_id 
        AND user_id = auth.uid() 
        AND status = 'active'
      )
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
    )
  );

-- Users can create personal contacts
CREATE POLICY "Users can create personal contacts"
  ON public.crm_contacts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins/managers can create property-level contacts
CREATE POLICY "Admins can create property contacts"
  ON public.crm_contacts FOR INSERT
  WITH CHECK (
    property_id IS NOT NULL 
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- Users can update their own personal contacts
CREATE POLICY "Users can update own contacts"
  ON public.crm_contacts FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can update property contacts
CREATE POLICY "Admins can update property contacts"
  ON public.crm_contacts FOR UPDATE
  USING (
    property_id IS NOT NULL 
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- Users can delete their own personal contacts
CREATE POLICY "Users can delete own contacts"
  ON public.crm_contacts FOR DELETE
  USING (user_id = auth.uid());

-- Admins can delete property contacts
CREATE POLICY "Admins can delete property contacts"
  ON public.crm_contacts FOR DELETE
  USING (
    property_id IS NOT NULL 
    AND has_role(auth.uid(), 'admin')
  );

-- Add updated_at trigger
CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- UPDATE REPORT_EMAILS FOR BCC SUPPORT
-- =============================================

-- Add bcc_recipients column to report_emails if not exists
ALTER TABLE public.report_emails 
  ADD COLUMN IF NOT EXISTS bcc_recipients TEXT[] DEFAULT '{}';

-- =============================================
-- UPDATE PROFILES FOR WORK EMAIL
-- =============================================

-- Add work_email field to profiles for auto-BCC (if they want a separate work email)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS work_email TEXT,
  ADD COLUMN IF NOT EXISTS auto_bcc_enabled BOOLEAN DEFAULT true;