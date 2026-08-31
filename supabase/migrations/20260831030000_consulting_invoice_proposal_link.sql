-- Link consulting invoice lines back to approved financial proposals so
-- "New invoice → Approved proposals" can subtract already-billed amounts and
-- avoid double-billing. Also enforce same-tenant linkage via trigger.

ALTER TABLE public.consulting_invoice_lines
  ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS consulting_invoice_lines_proposal_idx
  ON public.consulting_invoice_lines (proposal_id)
  WHERE proposal_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.consulting_invoice_line_tenant_boundary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_tenant uuid;
BEGIN
  IF NEW.proposal_id IS NOT NULL THEN
    SELECT tenant_id INTO parent_tenant FROM public.proposals WHERE id = NEW.proposal_id;
    IF parent_tenant IS NULL THEN
      RAISE EXCEPTION 'consulting_invoice_lines.proposal_id % not found', NEW.proposal_id;
    END IF;
    IF parent_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'consulting_invoice_lines.proposal_id crosses tenant boundary';
    END IF;
  END IF;

  IF NEW.scope_id IS NOT NULL THEN
    SELECT tenant_id INTO parent_tenant FROM public.project_scopes WHERE id = NEW.scope_id;
    IF parent_tenant IS NULL THEN
      RAISE EXCEPTION 'consulting_invoice_lines.scope_id % not found', NEW.scope_id;
    END IF;
    IF parent_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'consulting_invoice_lines.scope_id crosses tenant boundary';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consulting_invoice_line_tenant_boundary_trg ON public.consulting_invoice_lines;
CREATE TRIGGER consulting_invoice_line_tenant_boundary_trg
  BEFORE INSERT OR UPDATE ON public.consulting_invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.consulting_invoice_line_tenant_boundary();

NOTIFY pgrst, 'reload schema';
