
-- 1. Make property_id nullable on projects
ALTER TABLE public.projects
  ALTER COLUMN property_id DROP NOT NULL;

-- 2. Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  industry TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 4. RLS: all authenticated users can view clients
CREATE POLICY "Authenticated users can view clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (true);

-- 5. RLS: admins and managers can insert clients
CREATE POLICY "Admins and managers can create clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- 6. RLS: admins and managers can update clients
CREATE POLICY "Admins and managers can update clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- 7. RLS: admins can delete clients
CREATE POLICY "Admins can delete clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. Add client_id foreign key to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- 9. Add project_type column to projects (default 'property' for existing rows)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'property';

-- 10. updated_at trigger for clients
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
