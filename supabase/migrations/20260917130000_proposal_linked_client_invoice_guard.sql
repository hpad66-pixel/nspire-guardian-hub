-- Client invoices must come from approved financial proposals. This prevents
-- loose custom invoices, cross-project proposal billing, and over-billing past
-- the approved proposal amount.

CREATE OR REPLACE FUNCTION public.guard_consulting_invoice_proposal_billing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_record record;
  proposal_record record;
  approved_total numeric := 0;
  already_billed numeric := 0;
  next_billed numeric := 0;
  line_amount numeric := 0;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT id, tenant_id, project_id, status
      INTO invoice_record
      FROM public.consulting_invoices
      WHERE id = OLD.invoice_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'consulting invoice % not found', OLD.invoice_id;
    END IF;

    IF invoice_record.status <> 'draft' THEN
      RAISE EXCEPTION 'Only draft invoice lines can be deleted';
    END IF;

    RETURN OLD;
  END IF;

  SELECT id, tenant_id, project_id, status
    INTO invoice_record
    FROM public.consulting_invoices
    WHERE id = NEW.invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'consulting invoice % not found', NEW.invoice_id;
  END IF;

  IF invoice_record.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft invoice lines can be changed';
  END IF;

  IF NEW.proposal_id IS NULL THEN
    RAISE EXCEPTION 'Client invoice lines must be linked to an approved proposal';
  END IF;

  line_amount := ROUND(COALESCE(NEW.amount, 0), 2);
  IF line_amount <= 0 THEN
    RAISE EXCEPTION 'Client invoice line amount must be greater than zero';
  END IF;

  SELECT id, tenant_id, project_id, status, overhead_pct, profit_pct
    INTO proposal_record
    FROM public.proposals
    WHERE id = NEW.proposal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal % not found', NEW.proposal_id;
  END IF;

  IF proposal_record.tenant_id IS DISTINCT FROM NEW.tenant_id
     OR proposal_record.tenant_id IS DISTINCT FROM invoice_record.tenant_id THEN
    RAISE EXCEPTION 'invoice line proposal crosses tenant boundary';
  END IF;

  IF proposal_record.project_id IS DISTINCT FROM invoice_record.project_id THEN
    RAISE EXCEPTION 'invoice line proposal belongs to a different project';
  END IF;

  IF proposal_record.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved proposals can be invoiced';
  END IF;

  SELECT ROUND(
      COALESCE(SUM(COALESCE(pl.quantity, 0) * COALESCE(pl.unit_cost, 0)), 0)
      * (1 + (COALESCE(proposal_record.overhead_pct, 0) + COALESCE(proposal_record.profit_pct, 0)) / 100.0),
      2
    )
    INTO approved_total
    FROM public.proposal_lines pl
    WHERE pl.proposal_id = NEW.proposal_id;

  SELECT ROUND(COALESCE(SUM(l.amount), 0), 2)
    INTO already_billed
    FROM public.consulting_invoice_lines l
    JOIN public.consulting_invoices i ON i.id = l.invoice_id
    WHERE l.proposal_id = NEW.proposal_id
      AND i.status <> 'void'
      AND (TG_OP <> 'UPDATE' OR l.id <> OLD.id);

  next_billed := ROUND(already_billed + line_amount, 2);
  IF next_billed > approved_total + 0.01 THEN
    RAISE EXCEPTION 'Invoice would exceed approved proposal amount. Approved %, already billed %, this line %',
      approved_total, already_billed, line_amount;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consulting_invoice_proposal_billing_guard_trg ON public.consulting_invoice_lines;
CREATE TRIGGER consulting_invoice_proposal_billing_guard_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.consulting_invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_consulting_invoice_proposal_billing();

NOTIFY pgrst, 'reload schema';
