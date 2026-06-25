-- E-signature support for proposals, mirroring the change-order counter-sign flow.
-- Every proposal gets a capability token (sign_token); the public sign page +
-- proposal-countersign edge function use it to record the recipient's signature.
-- "Signed" is represented by signed_at IS NOT NULL (no enum change needed).
ALTER TABLE public.project_proposals
  ADD COLUMN IF NOT EXISTS sign_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signature_path text,
  ADD COLUMN IF NOT EXISTS signed_name text;

CREATE INDEX IF NOT EXISTS idx_project_proposals_sign_token
  ON public.project_proposals (sign_token);
