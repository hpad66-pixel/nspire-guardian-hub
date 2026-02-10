
-- Create user_module_access table for per-user module overrides
CREATE TABLE IF NOT EXISTS public.user_module_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_key)
);

ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own module access"
ON public.user_module_access FOR SELECT
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'manager')
));

CREATE POLICY "Admins can manage module access"
ON public.user_module_access FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'manager')
));
