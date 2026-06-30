-- Margin classification links to the subcontractor's COMMITMENT (deterministic),
-- not just a free-text sub_label. This is what lets each vendor dashboard show its
-- exact share of every owner change order without fuzzy name matching.
ALTER TABLE public.co_margin_links
  ADD COLUMN IF NOT EXISTS sub_commitment_id uuid REFERENCES public.commitments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_co_margin_links_sub_commitment ON public.co_margin_links(sub_commitment_id);
