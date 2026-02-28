
-- Add client_id to properties so owners can see their scoped properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
