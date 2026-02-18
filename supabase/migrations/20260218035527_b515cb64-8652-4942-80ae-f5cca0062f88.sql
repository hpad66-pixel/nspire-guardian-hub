
-- Expand clients table with new fields
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS client_type TEXT NOT NULL DEFAULT 'business_client',
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add check constraint for client_type
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_client_type_check;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_client_type_check 
  CHECK (client_type IN ('internal_org','business_client','property_management','government','other'));

-- Link profiles -> clients (org affiliation)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Link user_invitations -> clients (pre-assign org during invite)
ALTER TABLE public.user_invitations
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Fix RLS on clients: tighten INSERT to require admin or manager
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Managers and admins can insert clients" ON public.clients;

CREATE POLICY "Managers and admins can insert clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'owner')
);

-- Ensure SELECT policy exists for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
CREATE POLICY "Authenticated users can view clients"
ON public.clients
FOR SELECT
TO authenticated
USING (true);

-- Update policy for admins/managers/owners
DROP POLICY IF EXISTS "Managers and admins can update clients" ON public.clients;
CREATE POLICY "Managers and admins can update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'owner')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'owner')
);

-- Delete policy for admins/owners
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
CREATE POLICY "Admins can delete clients"
ON public.clients
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
);
