-- Create user_invitations table for invitation-only registration
CREATE TABLE public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create onboarding_status table for first-time setup tracking
CREATE TABLE public.onboarding_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  completed_at TIMESTAMPTZ,
  steps_completed JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_invitations

-- Admins and managers can view all invitations
CREATE POLICY "Admins and managers can view invitations"
ON public.user_invitations
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Admins and managers can create invitations
CREATE POLICY "Admins and managers can create invitations"
ON public.user_invitations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Admins can update invitations
CREATE POLICY "Admins can update invitations"
ON public.user_invitations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
ON public.user_invitations
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Public can select invitations by token (for accepting)
CREATE POLICY "Anyone can view invitation by token"
ON public.user_invitations
FOR SELECT
USING (true);

-- RLS Policies for onboarding_status

-- Users can view their own onboarding status
CREATE POLICY "Users can view own onboarding status"
ON public.onboarding_status
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own onboarding status
CREATE POLICY "Users can insert own onboarding status"
ON public.onboarding_status
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own onboarding status
CREATE POLICY "Users can update own onboarding status"
ON public.onboarding_status
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster token lookups
CREATE INDEX idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);