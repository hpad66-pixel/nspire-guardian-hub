-- Contractor onboarding automation visibility and delivery accountability.

BEGIN;

ALTER TABLE public.contractor_portal_links
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS delivery_error text,
  ADD COLUMN IF NOT EXISTS provider_id text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Legacy links predate provider tracking. They remain valid, but are labeled
-- link-only rather than incorrectly appearing stuck in a pending queue.
UPDATE public.contractor_portal_links
SET delivery_status = 'link_only'
WHERE delivery_status = 'pending' AND delivered_at IS NULL;

ALTER TABLE public.contractor_portal_links
  DROP CONSTRAINT IF EXISTS contractor_portal_links_delivery_status_check;
ALTER TABLE public.contractor_portal_links
  ADD CONSTRAINT contractor_portal_links_delivery_status_check
  CHECK (delivery_status IN ('pending','sent','failed','link_only'));

CREATE INDEX IF NOT EXISTS contractor_portal_links_case_created_idx
  ON public.contractor_portal_links(case_id, created_at DESC);

COMMIT;
