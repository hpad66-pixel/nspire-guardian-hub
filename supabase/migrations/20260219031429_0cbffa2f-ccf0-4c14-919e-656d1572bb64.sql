-- Add is_managed_property flag to properties table
-- TRUE = real PM property (Glorietta) with units, NSPIRE, inspections, etc.
-- FALSE = commercial/project site that should live under Projects/Clients

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_managed_property BOOLEAN NOT NULL DEFAULT true;

-- Mark ERC Recyclables as non-managed (it's a client/project, not a PM property)
UPDATE public.properties
  SET is_managed_property = false
  WHERE name ILIKE '%ERC%';