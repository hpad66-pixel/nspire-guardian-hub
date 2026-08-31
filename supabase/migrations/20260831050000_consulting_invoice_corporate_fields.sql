-- Corporate consulting invoice fields: bill-to snapshot, subject, payment terms,
-- and PO so branded PDFs and editable drafts carry a complete client invoice.

ALTER TABLE public.consulting_invoices
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS po_number text,
  ADD COLUMN IF NOT EXISTS bill_to_name text,
  ADD COLUMN IF NOT EXISTS bill_to_company text,
  ADD COLUMN IF NOT EXISTS bill_to_email text,
  ADD COLUMN IF NOT EXISTS bill_to_phone text,
  ADD COLUMN IF NOT EXISTS bill_to_address text,
  ADD COLUMN IF NOT EXISTS bill_to_city text,
  ADD COLUMN IF NOT EXISTS bill_to_state text,
  ADD COLUMN IF NOT EXISTS bill_to_postal text;

COMMENT ON COLUMN public.consulting_invoices.subject IS
  'Invoice subject / RE line shown on PDF and email.';
COMMENT ON COLUMN public.consulting_invoices.payment_terms IS
  'Payment terms (e.g. Net 30) snapshotted onto the invoice.';
COMMENT ON COLUMN public.consulting_invoices.bill_to_name IS
  'Bill-to contact name snapshotted at create/edit time.';

-- Helpful for "running tab" queries that join lines → invoices → payments.
CREATE INDEX IF NOT EXISTS consulting_invoice_payments_received_idx
  ON public.consulting_invoice_payments (received_date DESC);

NOTIFY pgrst, 'reload schema';
