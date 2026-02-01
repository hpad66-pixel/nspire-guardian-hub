-- Training Resources table (catalog of training materials)
CREATE TABLE public.training_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('course', 'ebook', 'video', 'guide', 'document')),
  category TEXT NOT NULL CHECK (category IN ('onboarding', 'maintenance', 'safety', 'compliance', 'operations', 'emergency')),
  target_roles app_role[] DEFAULT '{}',
  external_url TEXT,
  embed_code TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training Progress table (track user completion)
CREATE TABLE public.training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  resource_id UUID NOT NULL REFERENCES public.training_resources(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_id)
);

-- Training Requests table (feedback from staff)
CREATE TABLE public.training_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('new_topic', 'improvement', 'question', 'resource_request')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'implemented', 'declined')),
  admin_response TEXT,
  responded_by UUID,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.training_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_requests ENABLE ROW LEVEL SECURITY;

-- Training Resources policies
CREATE POLICY "Authenticated users can view active training resources"
  ON public.training_resources FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage training resources"
  ON public.training_resources FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Training Progress policies  
CREATE POLICY "Users can view own progress"
  ON public.training_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.training_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.training_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.training_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Training Requests policies
CREATE POLICY "Users can view own requests"
  ON public.training_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own requests"
  ON public.training_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending requests"
  ON public.training_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all requests"
  ON public.training_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can update requests"
  ON public.training_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Add updated_at trigger for training_resources
CREATE TRIGGER update_training_resources_updated_at
  BEFORE UPDATE ON public.training_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default eBook resource with provided embed code
INSERT INTO public.training_resources (title, description, resource_type, category, embed_code, is_active, sort_order)
VALUES (
  'PRD Professional Handbook',
  'Comprehensive operational guide for property management professionals. Learn best practices, procedures, and standards for effective property operations.',
  'ebook',
  'operations',
  'https://3e4ed0b2-6b22-4160-aee9-ee4110f6dd2f.lovableproject.com/embed/enzark-prd-professional-1769980229295',
  true,
  1
);