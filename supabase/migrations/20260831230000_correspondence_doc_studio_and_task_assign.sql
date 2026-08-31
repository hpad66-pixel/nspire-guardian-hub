-- Correspondence Doc Studio (e-sign + send) + action-item CRM assign / email deep-links.
-- authored_documents gains a CO-style sign/send workflow.
-- project_action_items can be owned by a CRM contact (no portal required) with a
-- token-gated public card URL for the branded assignment email.

-- ── Authored documents: sign + send workflow ───────────────────────────────
ALTER TABLE public.authored_documents
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS sign_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS contractor_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contractor_signed_name text,
  ADD COLUMN IF NOT EXISTS contractor_signature_data text,
  ADD COLUMN IF NOT EXISTS client_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_signed_name text,
  ADD COLUMN IF NOT EXISTS client_signature_data text,
  ADD COLUMN IF NOT EXISTS sent_to_client_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_to_email text;

-- workflow_status: uploaded | drafting | signed | sent | executed
DO $$ BEGIN
  ALTER TABLE public.authored_documents
    ADD CONSTRAINT authored_documents_workflow_status_chk
    CHECK (workflow_status IN ('uploaded', 'drafting', 'signed', 'sent', 'executed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS authored_documents_sign_token_uidx
  ON public.authored_documents (sign_token);

CREATE INDEX IF NOT EXISTS authored_documents_workflow_idx
  ON public.authored_documents (project_id, workflow_status, updated_at DESC);

-- Backfill sensible workflow statuses from existing rows
UPDATE public.authored_documents
SET workflow_status = CASE
  WHEN status = 'final' THEN 'drafting'
  WHEN COALESCE(has_original, false) THEN 'uploaded'
  ELSE 'drafting'
END
WHERE workflow_status = 'uploaded';

-- ── Action items: CRM contact assignee + public access token ───────────────
ALTER TABLE public.project_action_items
  ADD COLUMN IF NOT EXISTS assigned_contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS access_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS assignment_email_sent_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS project_action_items_access_token_uidx
  ON public.project_action_items (access_token);

CREATE INDEX IF NOT EXISTS project_action_items_assigned_contact_idx
  ON public.project_action_items (assigned_contact_id)
  WHERE assigned_contact_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
