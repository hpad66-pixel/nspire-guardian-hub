-- R4 / Larkin consulting projects must carry project_type = 'consulting'
-- so project tiles render solid dark-green (not construction orange) and the
-- financial nav shows Client Invoices instead of Pay Apps.
--
-- Explicit IDs from live Proj OS (2026-08-31):
--   Stucco Repairs, Design and Modeling, Water Meter Box Program, Larkin MRI.
-- Conveyance & Close-Out stays construction (project_type = 'property').

DO $$
DECLARE
  v_ids uuid[] := ARRAY[
    'dd68476b-542f-4ddf-9d22-8052a1a84c04'::uuid, -- Stucco Repairs
    '124bf1b5-d313-4d4e-aaea-73b861ba71a6'::uuid, -- Design and Modeling
    '9420b571-3383-4bd0-a64f-096634dd1ade'::uuid, -- Water Meter Box Program
    '332ee1d6-b165-4893-bd25-c31a212e206e'::uuid  -- Larkin MRI Building
  ];
  v_conveyance uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';
  n int := 0;
BEGIN
  UPDATE public.projects
  SET project_type = 'consulting',
      updated_at = now()
  WHERE id = ANY (v_ids)
    AND project_type IS DISTINCT FROM 'consulting'
    -- Never flip a project that already has a prime contract (construction billing).
    AND NOT EXISTS (
      SELECT 1 FROM public.prime_contracts pc WHERE pc.project_id = projects.id
    );

  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Marked % R4/Larkin project(s) as consulting', n;

  -- Belt-and-suspenders: Conveyance stays construction.
  UPDATE public.projects
  SET project_type = 'property',
      updated_at = now()
  WHERE id = v_conveyance
    AND project_type IS DISTINCT FROM 'property';
END $$;
