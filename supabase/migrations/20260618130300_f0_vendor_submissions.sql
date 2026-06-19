-- ============================================================
-- F0 · Electronic vendor submittal: per-project intake + inbound docs.
-- ============================================================

-- One intake address + drop folder per project.
CREATE TABLE IF NOT EXISTS public.project_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  intake_email text NOT NULL UNIQUE,
  -- rule 10: only the hash is stored; plaintext upload token revealed once in UI.
  intake_token_hash text NOT NULL,
  revoked_at timestamptz,
  storage_prefix text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_intake ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_intake_tenant_isolation ON public.project_intake
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
CREATE TRIGGER project_intake_updated_at
  BEFORE UPDATE ON public.project_intake
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Every inbound document, pre-classification.
CREATE TABLE IF NOT EXISTS public.vendor_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  commitment_id uuid REFERENCES public.commitments(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('email','folder','manual_upload','portal')),
  from_email text,
  subject text,
  received_at timestamptz NOT NULL DEFAULT now(),
  doc_type text NOT NULL DEFAULT 'unknown'
    CHECK (doc_type IN ('invoice','lien_release','co_request','unknown')),
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','parsed','needs_review','processed','rejected')),
  parsed jsonb,
  artifact_id uuid REFERENCES public.project_artifacts(id) ON DELETE SET NULL,
  created_commitment_invoice_id uuid REFERENCES public.commitment_invoices(id) ON DELETE SET NULL,
  created_lien_release_id uuid REFERENCES public.lien_releases(id) ON DELETE SET NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vsub_project ON public.vendor_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_vsub_status ON public.vendor_submissions(status);

ALTER TABLE public.vendor_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_submissions_tenant_isolation ON public.vendor_submissions
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
CREATE TRIGGER vendor_submissions_updated_at
  BEFORE UPDATE ON public.vendor_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tenant-boundary trigger (rule 8) for the nullable FKs.
CREATE OR REPLACE FUNCTION public.enforce_vendor_submission_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid;
BEGIN
  IF NEW.commitment_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant FROM public.commitments WHERE id = NEW.commitment_id;
    IF v_tenant IS NULL OR v_tenant <> NEW.tenant_id THEN
      RAISE EXCEPTION 'commitment_id % is not in tenant %', NEW.commitment_id, NEW.tenant_id; END IF;
  END IF;
  IF NEW.artifact_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant FROM public.project_artifacts WHERE id = NEW.artifact_id;
    IF v_tenant IS NULL OR v_tenant <> NEW.tenant_id THEN
      RAISE EXCEPTION 'artifact_id % is not in tenant %', NEW.artifact_id, NEW.tenant_id; END IF;
  END IF;
  IF NEW.created_commitment_invoice_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant FROM public.commitment_invoices WHERE id = NEW.created_commitment_invoice_id;
    IF v_tenant IS NULL OR v_tenant <> NEW.tenant_id THEN
      RAISE EXCEPTION 'created_commitment_invoice_id % is not in tenant %', NEW.created_commitment_invoice_id, NEW.tenant_id; END IF;
  END IF;
  IF NEW.created_lien_release_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant FROM public.lien_releases WHERE id = NEW.created_lien_release_id;
    IF v_tenant IS NULL OR v_tenant <> NEW.tenant_id THEN
      RAISE EXCEPTION 'created_lien_release_id % is not in tenant %', NEW.created_lien_release_id, NEW.tenant_id; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_submission_tenant ON public.vendor_submissions;
CREATE TRIGGER trg_vendor_submission_tenant
  BEFORE INSERT OR UPDATE ON public.vendor_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vendor_submission_tenant();
