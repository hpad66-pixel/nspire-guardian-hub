-- Give proposals the same narrative depth as change orders: a written overview,
-- a scope-of-services list, and a deliverables list — so a dictated story can be
-- written up as a full, beautifully formatted proposal (not just priced lines).
-- notes = overview narrative; these two add the structured bullet sections.

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS scope_bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deliverables jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.proposals.scope_bullets IS
  'Scope-of-services bullet points rendered in the proposal document.';
COMMENT ON COLUMN public.proposals.deliverables IS
  'Deliverables bullet points rendered in the proposal document.';
