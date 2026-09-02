-- Water Intelligence: replace placeholder Glorieta account numbers with
-- WASD numbers OCR'd from the June/July 2026 bills, overlay those real
-- statements, and attach the Building 8 dispute figures from the 23 Jul 2026 letter.
-- tenant_id → workspaces(id). Idempotent.

BEGIN;

-- Building 8 is billed by WASD as 13010 Alexandria Dr (meter 61302354) even
-- though the formal dispute cites 13200 Alexandria / Building 8.
UPDATE public.water_service_accounts a
SET
  service_address = '13010 Alexandria Dr',
  building_label = 'Building 8 / 13200 Alexandria',
  notes = 'WASD bills this meter as 13010 Alexandria. Formal dispute 23 Jul 2026: $113,874.41 unpaid, $95,017.57 retro rebill, ~216k gal/mo estimates Apr 2024–Jan 2026. Folio 08-2128-007-0210.',
  folio_number = COALESCE(a.folio_number, '08-2128-007-0210'),
  meter_number = COALESCE(a.meter_number, '61302354'),
  status = 'disputed',
  updated_at = now()
WHERE a.account_number = '2745714336'
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = a.property_id AND lower(p.name) LIKE '%glorieta%'
  );

UPDATE public.water_service_accounts a
SET meter_number = '16020263', building_label = COALESCE(NULLIF(a.building_label, ''), '13235 Alexandria'), updated_at = now()
WHERE a.account_number = '1674911185';

UPDATE public.water_service_accounts a
SET meter_number = '16020268', building_label = COALESCE(NULLIF(a.building_label, ''), '13210 Alexandria'), updated_at = now()
WHERE a.account_number = '8082997418';

UPDATE public.water_service_accounts a
SET meter_number = '17096378', updated_at = now()
WHERE a.account_number = '4621903166';

UPDATE public.water_service_accounts a
SET meter_number = '1800224837', updated_at = now()
WHERE a.account_number = '9952938168';

-- Remap placeholder account numbers to the OCR'd WASD ids (bills follow via FK).
UPDATE public.water_service_accounts a
SET account_number = '1787762492', meter_number = '16081147', notes = 'The Gardens', updated_at = now()
WHERE a.account_number = '13120-NW32'
  AND NOT EXISTS (
    SELECT 1 FROM public.water_service_accounts x
    WHERE x.property_id = a.property_id AND x.account_number = '1787762492'
  );

UPDATE public.water_service_accounts a
SET account_number = '7963207450', meter_number = '16020115', updated_at = now()
WHERE a.account_number = '13120-PORT'
  AND NOT EXISTS (
    SELECT 1 FROM public.water_service_accounts x
    WHERE x.property_id = a.property_id AND x.account_number = '7963207450'
  );

UPDATE public.water_service_accounts a
SET account_number = '1692380502', meter_number = '61302335', updated_at = now()
WHERE a.account_number = '13250-ALEX'
  AND NOT EXISTS (
    SELECT 1 FROM public.water_service_accounts x
    WHERE x.property_id = a.property_id AND x.account_number = '1692380502'
  );

UPDATE public.water_service_accounts a
SET account_number = '0285466092', meter_number = '61019149', updated_at = now()
WHERE a.account_number = '13410-ASWAN'
  AND NOT EXISTS (
    SELECT 1 FROM public.water_service_accounts x
    WHERE x.property_id = a.property_id AND x.account_number = '0285466092'
  );

-- 13010 Alexandria PDFs are the Building 8 WASD account. Drop the synthetic duplicate.
DELETE FROM public.water_bills b
USING public.water_service_accounts a, public.properties p
WHERE b.account_id = a.id
  AND a.account_number = '13010-ALEX'
  AND a.property_id = p.id
  AND lower(p.name) LIKE '%glorieta%';

DELETE FROM public.water_service_accounts a
USING public.properties p
WHERE a.property_id = p.id
  AND a.account_number = '13010-ALEX'
  AND lower(p.name) LIKE '%glorieta%';

-- Second 13210 meter (idle / 0 KGW on the Jun 2026 cycle).
INSERT INTO public.water_service_accounts (
  tenant_id, property_id, account_number, meter_number, service_address,
  building_label, status, notes, sort_order
)
SELECT p.workspace_id, p.id, '2218802663', '19188783', '13210 Alexandria Dr',
       '13210 Alexandria (idle meter)', 'active',
       'Same street as 8082997418. Jun 2026 cycle billed 0 KGW / $221.26 base fees.',
       35
FROM public.properties p
WHERE lower(p.name) LIKE '%glorieta%'
  AND NOT EXISTS (
    SELECT 1 FROM public.water_service_accounts a
    WHERE a.property_id = p.id AND a.account_number = '2218802663'
  )
ORDER BY CASE WHEN lower(p.name) LIKE '%apartment%' THEN 0 ELSE 1 END
LIMIT 1;

-- Overlay OCR'd June 2026 WASD statements (source=ocr beats seed on conflict).
WITH prop AS (
  SELECT p.id AS property_id, p.workspace_id AS tenant_id
  FROM public.properties p
  WHERE lower(p.name) LIKE '%glorieta%'
  ORDER BY CASE WHEN lower(p.name) LIKE '%apartment%' THEN 0 ELSE 1 END
  LIMIT 1
),
real_bills (
  account_number, start_d, end_d, billed, due_d, prev_bal, current_chg, amount_due,
  water_chg, sewer_chg, other_fee, gallons, prior_rd, curr_rd, days, estimated, status, notes
) AS (
  VALUES
    ('2745714336', '2026-06-01', '2026-06-29', '2026-07-13', '2026-08-03',
     113874.41, 8793.24, 122667.65, 3426.54, 4868.97, 497.73, 423000, 5994, 6417, 28, false, 'disputed',
     'OCR Jun 2026 WASD statement. Unpaid $113,874.41 matches the 23 Jul 2026 formal dispute.'),
    ('1674911185', '2026-06-01', '2026-06-29', '2026-07-13', '2026-08-03',
     228.51, 248.99, 248.99, 107.22, 127.68, 14.09, 6000, 561, 567, 28, false, 'open',
     'OCR Jun 2026 WASD statement.'),
    ('8082997418', '2026-06-01', '2026-06-29', '2026-07-13', '2026-08-03',
     351.44, 289.98, 289.98, 123.14, 150.42, 16.42, 8000, 402, 410, 28, false, 'open',
     'OCR Jun 2026 WASD statement.'),
    ('2218802663', '2026-03-23', '2026-06-22', '2026-07-06', '2026-07-27',
     271.26, 221.26, 221.26, 208.74, 0, 12.52, 0, 420, 420, 91, false, 'open',
     'OCR 23 Mar–22 Jun 2026. Zero consumption, base fees only.'),
    ('4621903166', '2026-06-01', '2026-06-29', '2026-07-13', '2026-08-03',
     50.48, 132.43, 132.43, 52.24, 72.70, 7.49, 6000, 77, 83, 28, false, 'open',
     'OCR Jun 2026 WASD statement.'),
    ('1787762492', '2026-06-01', '2026-06-29', '2026-07-13', '2026-08-03',
     371.94, 412.92, 1297.16, 170.90, 218.64, 23.38, 14000, 7848, 7862, 28, false, 'open',
     'OCR Jun 2026 WASD statement. Payment plan $884.24.'),
    ('7963207450', '2026-06-01', '2026-06-29', '2026-07-13', '2026-08-03',
     351.44, 208.02, 737.45, 91.30, 104.94, 11.78, 4000, 7577, 7581, 28, false, 'open',
     'OCR Jun 2026 WASD statement. Payment plan $529.43.'),
    ('1692380502', '2026-06-01', '2026-06-29', '2026-07-15', '2026-08-05',
     5142.10, 7912.18, 19999.49, 3084.26, 4380.06, 447.86, 380000, 8747, 9127, 28, false, 'past_due',
     'OCR Jun 2026 WASD statement. Unpaid previous $5,142.10.'),
    ('0285466092', '2026-05-05', '2026-06-01', '2026-07-15', '2026-08-05',
     -3650.29, 3015.12, 1972.80, 1181.82, 1662.63, 170.67, 141000, 27293, 27434, 27, false, 'open',
     'OCR 5 May–1 Jun 2026 WASD statement.'),
    ('9952938168', '2026-06-01', '2026-06-29', '2026-07-13', '2026-08-03',
     2933.16, 3117.56, 6965.36, 1221.62, 1719.48, 176.46, 146000, 13070, 13216, 28, false, 'open',
     'OCR Jun 2026 WASD statement. Payment plan $3,847.80.')
)
INSERT INTO public.water_bills (
  tenant_id, property_id, account_id,
  bill_period_start, bill_period_end, billing_date, due_date,
  previous_balance, current_charges, amount_due, amount_paid,
  water_charges, sewer_charges, other_fees,
  consumption_gallons, prior_reading, current_reading, days_of_service,
  is_estimated, status, source, notes, document_name
)
SELECT
  prop.tenant_id,
  prop.property_id,
  a.id,
  r.start_d::date,
  r.end_d::date,
  r.billed::date,
  r.due_d::date,
  r.prev_bal,
  r.current_chg,
  r.amount_due,
  GREATEST(r.prev_bal + r.current_chg - r.amount_due, 0),
  r.water_chg,
  r.sewer_chg,
  r.other_fee,
  r.gallons,
  r.prior_rd,
  r.curr_rd,
  r.days,
  r.estimated,
  r.status,
  'ocr',
  r.notes,
  'WASD June/July 2026 cycle'
FROM real_bills r
JOIN prop ON true
JOIN public.water_service_accounts a
  ON a.property_id = prop.property_id AND a.account_number = r.account_number
ON CONFLICT (account_id, bill_period_start) DO UPDATE
SET
  bill_period_end = EXCLUDED.bill_period_end,
  billing_date = EXCLUDED.billing_date,
  due_date = EXCLUDED.due_date,
  previous_balance = EXCLUDED.previous_balance,
  current_charges = EXCLUDED.current_charges,
  amount_due = EXCLUDED.amount_due,
  amount_paid = EXCLUDED.amount_paid,
  water_charges = EXCLUDED.water_charges,
  sewer_charges = EXCLUDED.sewer_charges,
  other_fees = EXCLUDED.other_fees,
  consumption_gallons = EXCLUDED.consumption_gallons,
  prior_reading = EXCLUDED.prior_reading,
  current_reading = EXCLUDED.current_reading,
  days_of_service = EXCLUDED.days_of_service,
  is_estimated = EXCLUDED.is_estimated,
  status = EXCLUDED.status,
  source = 'ocr',
  notes = EXCLUDED.notes,
  document_name = EXCLUDED.document_name,
  updated_at = now();

-- Keep the executive note current with the letter + latest statement.
UPDATE public.water_exec_notes n
SET body = 'Water Intelligence is live on the real June/July 2026 WASD cycle. Building 8 (acct 2745714336, meter 61302354) still carries the 23 Jul 2026 formal dispute: $113,874.41 unpaid from the 11 Jun 2026 statement, $95,017.57 retro rebill, ~216k gal/mo estimates. The 13 Jul 2026 bill added $8,793.24 current charges (423 KGW) for a $122,667.65 total. 13250 Alexandria (acct 1692380502) is the next cost center at $19,999.49 due. Drop remaining PDFs on the staff desk to replace any leftover seed months.',
    updated_at = now()
WHERE n.property_id IN (
  SELECT p.id FROM public.properties p WHERE lower(p.name) LIKE '%glorieta%'
)
AND n.body ILIKE '%Building 8%';

COMMIT;
