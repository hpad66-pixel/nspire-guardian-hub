-- Add a true client-send and signature lifecycle to consulting invoices.
-- Existing invoice records are preserved. The token lets clients review and
-- countersign without a Proj OS login, using the Edge Function as the gate.

ALTER TABLE public.consulting_invoices
  ADD COLUMN IF NOT EXISTS sign_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS sent_to_client_at timestamptz,
  ADD COLUMN IF NOT EXISTS sender_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS sender_signed_name text,
  ADD COLUMN IF NOT EXISTS sender_signature_path text,
  ADD COLUMN IF NOT EXISTS client_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_signed_name text,
  ADD COLUMN IF NOT EXISTS client_signature_path text,
  ADD COLUMN IF NOT EXISTS client_signature_method text,
  ADD COLUMN IF NOT EXISTS client_comments text;

CREATE UNIQUE INDEX IF NOT EXISTS consulting_invoices_sign_token_idx
  ON public.consulting_invoices (sign_token);

NOTIFY pgrst, 'reload schema';
