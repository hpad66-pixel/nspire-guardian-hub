-- Line-item provenance: tag an individual SOV / G703 line item to the
-- subcontractor commitment that performs it, so each vendor dashboard can roll up
-- the exact line items attributed to them.
ALTER TABLE public.sov_line_items
  ADD COLUMN IF NOT EXISTS commitment_id uuid REFERENCES public.commitments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sov_line_commitment ON public.sov_line_items(commitment_id);
