-- ===== OCCUPANCY TRACKING MODULE =====
-- Create tenants table for occupancy management
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  lease_start DATE NOT NULL,
  lease_end DATE,
  rent_amount NUMERIC,
  deposit_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'active', -- active, notice_given, moved_out
  move_in_date DATE,
  move_out_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants
CREATE POLICY "Authenticated users can view tenants"
  ON public.tenants FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage tenants"
  ON public.tenants FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create updated_at trigger for tenants
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for tenant lookups
CREATE INDEX idx_tenants_unit_id ON public.tenants(unit_id);
CREATE INDEX idx_tenants_status ON public.tenants(status);

-- ===== PROPERTY MODULE FLAGS =====
-- Add new module columns to properties table
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS occupancy_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_scanning_enabled BOOLEAN DEFAULT false;