-- Bring financial proposals to the same auditable sign/send/amend lifecycle as
-- generated change orders. These fields do not affect proposal arithmetic;
-- they record document control, delivery, revisions, and physical signatures.

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS revision_no integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proposal_no_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS acceptance_method text
    CHECK (acceptance_method IS NULL OR acceptance_method IN ('electronic', 'offline')),
  ADD COLUMN IF NOT EXISTS signed_hardcopy_path text,
  ADD COLUMN IF NOT EXISTS signed_hardcopy_note text,
  ADD COLUMN IF NOT EXISTS signed_hardcopy_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_hardcopy_by uuid;

COMMENT ON COLUMN public.proposals.revision_no IS
  'Zero-based proposal revision. Incremented whenever a signed/sent proposal is reopened for amendment.';
COMMENT ON COLUMN public.proposals.delivery_history IS
  'Append-only delivery log: [{to,at,by,kind}] for initial sends and re-sends.';
COMMENT ON COLUMN public.proposals.proposal_no_history IS
  'Append-only admin renumber log: [{from,to,reason,at,by}].';
COMMENT ON COLUMN public.proposals.signed_hardcopy_path IS
  'Scan of a client-signed physical proposal kept with the electronic record.';

-- Once signed, commercial content remains immutable until the explicit Amend
-- workflow unlocks it. Response metadata, delivery metadata, and hard-copy
-- metadata remain writable so the client-response workflow can complete.
CREATE OR REPLACE FUNCTION public.guard_financial_proposal_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.locked AND NEW.locked THEN
    IF NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
       OR NEW.proposal_no IS DISTINCT FROM OLD.proposal_no
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.client_name IS DISTINCT FROM OLD.client_name
       OR NEW.client_email IS DISTINCT FROM OLD.client_email
       OR NEW.valid_until IS DISTINCT FROM OLD.valid_until
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.terms IS DISTINCT FROM OLD.terms
       OR NEW.scope_bullets IS DISTINCT FROM OLD.scope_bullets
       OR NEW.deliverables IS DISTINCT FROM OLD.deliverables
       OR NEW.markup_pct IS DISTINCT FROM OLD.markup_pct
       OR NEW.source_issue_id IS DISTINCT FROM OLD.source_issue_id
       OR NEW.submitted_signature_path IS DISTINCT FROM OLD.submitted_signature_path
       OR NEW.submitted_signed_at IS DISTINCT FROM OLD.submitted_signed_at
       OR NEW.submitted_signed_by IS DISTINCT FROM OLD.submitted_signed_by THEN
      RAISE EXCEPTION 'LOCKED: this proposal is signed; amend it before changing commercial content';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_financial_proposal_lock_guard ON public.proposals;
CREATE TRIGGER trg_financial_proposal_lock_guard
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.guard_financial_proposal_lock();

-- Lock proposal line items at the database boundary as well as in the UI.
CREATE OR REPLACE FUNCTION public.guard_financial_proposal_lines()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  parent_id uuid;
  parent_locked boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    parent_id := OLD.proposal_id;
    SELECT locked INTO parent_locked FROM public.proposals WHERE id = parent_id;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(bool_or(locked), false) INTO parent_locked
      FROM public.proposals
      WHERE id IN (OLD.proposal_id, NEW.proposal_id);
  ELSE
    parent_id := NEW.proposal_id;
    SELECT locked INTO parent_locked FROM public.proposals WHERE id = parent_id;
  END IF;
  IF COALESCE(parent_locked, false) THEN
    RAISE EXCEPTION 'LOCKED: amend the signed proposal before changing line items';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_financial_proposal_lines_guard ON public.proposal_lines;
CREATE TRIGGER trg_financial_proposal_lines_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.proposal_lines
  FOR EACH ROW EXECUTE FUNCTION public.guard_financial_proposal_lines();
