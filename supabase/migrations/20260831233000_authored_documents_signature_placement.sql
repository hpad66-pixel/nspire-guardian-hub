-- Store click-to-place e-signature coordinates on authored correspondence docs.
ALTER TABLE public.authored_documents
  ADD COLUMN IF NOT EXISTS signature_placement jsonb;

COMMENT ON COLUMN public.authored_documents.signature_placement IS
  'Normalized signature placement: { page, xPct, yPct, widthPct }. Used with contractor_signature_data.';

NOTIFY pgrst, 'reload schema';
