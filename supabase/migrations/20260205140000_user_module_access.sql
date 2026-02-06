-- User-level module access controls
CREATE TABLE IF NOT EXISTS public.user_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_user_module_access_user ON public.user_module_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_access_module ON public.user_module_access(module_key);

ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own module access"
  ON public.user_module_access FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Admins and owners can insert module access"
  ON public.user_module_access FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Admins and owners can update module access"
  ON public.user_module_access FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Admins and owners can delete module access"
  ON public.user_module_access FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

DROP TRIGGER IF EXISTS update_user_module_access_updated_at ON public.user_module_access;
CREATE TRIGGER update_user_module_access_updated_at
  BEFORE UPDATE ON public.user_module_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
