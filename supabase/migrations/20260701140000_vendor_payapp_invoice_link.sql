-- Link a vendor pay-app submission to the commitment invoice it becomes on
-- approval, so the unconditional lien can be tied to that invoice on payment.
ALTER TABLE public.vendor_payapp_submissions
  ADD COLUMN IF NOT EXISTS commitment_invoice_id uuid REFERENCES public.commitment_invoices(id) ON DELETE SET NULL;
