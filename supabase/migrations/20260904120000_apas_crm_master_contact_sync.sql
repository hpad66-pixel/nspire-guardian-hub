-- Workspace-wide, administrator-controlled synchronization into the canonical
-- APAS CRM. Local contacts remain operational snapshots; APAS CRM identifiers
-- make the master relationship explicit and every run remains auditable.

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS apas_contact_id text,
  ADD COLUMN IF NOT EXISTS apas_sync_status text NOT NULL DEFAULT 'not_synced'
    CHECK (apas_sync_status IN ('not_synced', 'synced', 'failed')),
  ADD COLUMN IF NOT EXISTS apas_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS apas_sync_error text
    CHECK (apas_sync_error IS NULL OR char_length(apas_sync_error) <= 500);

CREATE INDEX IF NOT EXISTS crm_contacts_apas_contact_idx
  ON public.crm_contacts(workspace_id, apas_contact_id)
  WHERE apas_contact_id IS NOT NULL;

CREATE TABLE public.crm_master_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  initiated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 16 AND 200),
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_count integer NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  created_count integer NOT NULL DEFAULT 0 CHECK (created_count >= 0),
  matched_count integer NOT NULL DEFAULT 0 CHECK (matched_count >= 0),
  updated_count integer NOT NULL DEFAULT 0 CHECK (updated_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  safe_failure_code text,
  safe_failure_reason text CHECK (safe_failure_reason IS NULL OR char_length(safe_failure_reason) <= 500),
  result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (workspace_id, idempotency_key),
  UNIQUE (correlation_id)
);

ALTER TABLE public.crm_master_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_master_sync_runs_admin_read
  ON public.crm_master_sync_runs FOR SELECT TO authenticated
  USING (
    workspace_id = public.current_tenant_id()
    AND (public.is_workspace_admin(auth.uid()) OR public.is_super_admin())
  );

REVOKE ALL ON public.crm_master_sync_runs FROM authenticated;
GRANT SELECT ON public.crm_master_sync_runs TO authenticated;
