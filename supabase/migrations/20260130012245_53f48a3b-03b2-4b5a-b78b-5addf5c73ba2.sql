-- Add contact and mailing information to properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS mailing_address text,
ADD COLUMN IF NOT EXISTS mailing_city text,
ADD COLUMN IF NOT EXISTS mailing_state text,
ADD COLUMN IF NOT EXISTS mailing_zip text;