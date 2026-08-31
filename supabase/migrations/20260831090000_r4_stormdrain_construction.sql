-- Lock R4 Capital project kinds to the portfolio taxonomy:
--   Construction: Stormdrain Maintenance, Conveyance & Close-Out
--   Consulting:   Stucco Repairs, Design and Modeling, Water Meter Box Program
--
-- Stormdrain was never explicitly typed in earlier migrations; default
-- project_type='property' is construction, but name-match it so a mistaken
-- flip to consulting cannot hide pay-app financials.

DO $$
DECLARE
  v_consulting uuid[] := ARRAY[
    'dd68476b-542f-4ddf-9d22-8052a1a84c04'::uuid, -- Stucco Repairs
    '124bf1b5-d313-4d4e-aaea-73b861ba71a6'::uuid, -- Design and Modeling
    '9420b571-3383-4bd0-a64f-096634dd1ade'::uuid  -- Water Meter Box Program
  ];
  v_conveyance uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';
  n int := 0;
BEGIN
  -- Consulting row (skip anything with a prime contract — those are construction).
  UPDATE public.projects
  SET project_type = 'consulting',
      updated_at = now()
  WHERE id = ANY (v_consulting)
    AND project_type IS DISTINCT FROM 'consulting'
    AND NOT EXISTS (
      SELECT 1 FROM public.prime_contracts pc WHERE pc.project_id = projects.id
    );

  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'R4 consulting lock: % project(s)', n;

  -- Construction: Conveyance by id
  UPDATE public.projects
  SET project_type = 'property',
      updated_at = now()
  WHERE id = v_conveyance
    AND project_type IS DISTINCT FROM 'property';

  -- Construction: Stormdrain / Storm drain by name (R4 Capital portfolio)
  UPDATE public.projects
  SET project_type = 'property',
      updated_at = now()
  WHERE (
      name ILIKE '%stormdrain%'
      OR name ILIKE '%storm drain%'
    )
    AND project_type IS DISTINCT FROM 'property';

  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'R4 stormdrain construction lock: % project(s)', n;
END $$;
