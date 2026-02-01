-- Add daily_grounds_enabled column to properties table
ALTER TABLE properties 
ADD COLUMN daily_grounds_enabled BOOLEAN DEFAULT false;

-- Optionally enable daily_grounds for properties that already have nspire_enabled
-- This provides backward compatibility for existing inspection workflows
UPDATE properties 
SET daily_grounds_enabled = true 
WHERE nspire_enabled = true;