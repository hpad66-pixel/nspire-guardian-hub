-- Point OCR'd Glorieta WASD statements at the in-repo HTML backups
-- so staff can open a quick view of every ingested June/July 2026 bill.
-- tenant_id → workspaces(id). Idempotent.

BEGIN;

UPDATE public.water_bills b
SET
  document_url = '/water-bills/' || a.account_number || '-' || to_char(b.bill_period_start, 'YYYY-MM') || '.html',
  document_name = COALESCE(NULLIF(b.document_name, ''), 'WASD June/July 2026 cycle'),
  updated_at = now()
FROM public.water_service_accounts a
JOIN public.properties p ON p.id = a.property_id
WHERE b.account_id = a.id
  AND lower(p.name) LIKE '%glorieta%'
  AND b.source = 'ocr'
  AND a.account_number IN (
    '2745714336',
    '1674911185',
    '8082997418',
    '2218802663',
    '4621903166',
    '1787762492',
    '7963207450',
    '1692380502',
    '0285466092',
    '9952938168'
  );

-- Idle-meter cycle starts in March; keep the path in sync with the archive file name.
UPDATE public.water_bills b
SET
  document_url = '/water-bills/2218802663-2026-03.html',
  updated_at = now()
FROM public.water_service_accounts a
JOIN public.properties p ON p.id = a.property_id
WHERE b.account_id = a.id
  AND a.account_number = '2218802663'
  AND b.bill_period_start = '2026-03-23'
  AND lower(p.name) LIKE '%glorieta%';

UPDATE public.water_bills b
SET
  document_url = '/water-bills/0285466092-2026-05.html',
  updated_at = now()
FROM public.water_service_accounts a
JOIN public.properties p ON p.id = a.property_id
WHERE b.account_id = a.id
  AND a.account_number = '0285466092'
  AND b.bill_period_start = '2026-05-05'
  AND lower(p.name) LIKE '%glorieta%';

COMMIT;
