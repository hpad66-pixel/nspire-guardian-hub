-- Keep client invoice lifecycle rules consistent with the application:
-- drafts may be deleted, unpaid issued invoices may return to draft or void,
-- paid/payment-referenced invoices remain preserved for audit.

CREATE OR REPLACE FUNCTION public.guard_consulting_invoice_settlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_received numeric(14,2);
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT COALESCE(sum(amount), 0) INTO v_received
      FROM public.consulting_invoice_payments
     WHERE invoice_id = OLD.id;

    IF OLD.status = 'paid' AND NEW.status <> 'paid' THEN
      RAISE EXCEPTION 'Paid invoices are locked for audit; use a correction or adjustment';
    END IF;

    IF NEW.status = 'paid' AND v_received < NEW.total - 0.005 THEN
      RAISE EXCEPTION 'Invoice cannot be marked paid until receipts equal the invoice total';
    END IF;

    IF NEW.status = 'void' AND v_received > 0 THEN
      RAISE EXCEPTION 'A received invoice cannot be voided; correct its receipts first';
    END IF;

    IF NEW.status = 'draft' AND OLD.status NOT IN ('draft', 'sent', 'void') THEN
      RAISE EXCEPTION 'Only sent or void unpaid invoices can return to draft';
    END IF;

    IF NEW.status = 'draft' AND v_received > 0 THEN
      RAISE EXCEPTION 'A received invoice cannot return to draft; use a correction or adjustment';
    END IF;

    IF OLD.status = 'void' AND NEW.status NOT IN ('void', 'draft') THEN
      RAISE EXCEPTION 'Void invoices must return to draft before being reissued';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_consulting_invoice_settlement_trg ON public.consulting_invoices;
CREATE TRIGGER guard_consulting_invoice_settlement_trg
  BEFORE UPDATE ON public.consulting_invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_consulting_invoice_settlement();

CREATE OR REPLACE FUNCTION public.guard_consulting_invoice_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_received numeric(14,2);
BEGIN
  SELECT COALESCE(sum(amount), 0) INTO v_received
    FROM public.consulting_invoice_payments
   WHERE invoice_id = OLD.id;

  IF v_received > 0 THEN
    RAISE EXCEPTION 'This invoice has payment history and must stay in the audit trail';
  END IF;

  IF OLD.status NOT IN ('draft', 'void') THEN
    RAISE EXCEPTION 'Return issued invoices to draft before deleting a mistaken invoice';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS guard_consulting_invoice_delete_trg ON public.consulting_invoices;
CREATE TRIGGER guard_consulting_invoice_delete_trg
  BEFORE DELETE ON public.consulting_invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_consulting_invoice_delete();
