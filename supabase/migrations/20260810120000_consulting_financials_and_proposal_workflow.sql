-- Consulting engagements can carry proposals, amendments/change orders and
-- client billing. Keep Financials discoverable, and give priced proposals the
-- same immutable sign/send/amend workflow used by change orders.

UPDATE public.projects
SET module_config = jsonb_set(COALESCE(module_config, '{}'::jsonb), '{financials}', 'true'::jsonb, true)
WHERE project_type = 'consulting'
  AND lower(name) LIKE '%hospital%'
  AND (lower(name) LIKE '%lorcan%' OR lower(name) LIKE '%larkin%');

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS sign_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted_signature_path text,
  ADD COLUMN IF NOT EXISTS submitted_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_signed_by uuid,
  ADD COLUMN IF NOT EXISTS accepted_signature_path text,
  ADD COLUMN IF NOT EXISTS accepted_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_signed_name text,
  ADD COLUMN IF NOT EXISTS sent_to_client_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_comments text,
  ADD COLUMN IF NOT EXISTS pdf_path text,
  ADD COLUMN IF NOT EXISTS amendment_history jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS proposals_sign_token_uidx
  ON public.proposals (sign_token);

COMMENT ON COLUMN public.proposals.locked IS
  'True after the consultant signs this version. Amend clears signatures and unlocks a new draft version.';
COMMENT ON COLUMN public.proposals.amendment_history IS
  'Append-only array of {reason,at,from_status} entries created when a signed proposal is reopened.';
