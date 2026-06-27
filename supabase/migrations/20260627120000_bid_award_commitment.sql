-- Awarding a bid package auto-creates a subcontract commitment. Link them so the
-- award is idempotent (never double-creates) and the package can show its commitment.
ALTER TABLE public.bid_packages
  ADD COLUMN IF NOT EXISTS commitment_id uuid REFERENCES public.commitments(id) ON DELETE SET NULL;
