-- Restore Glorieta Sewer Extension / Conveyance as CONSTRUCTION.
--
-- Pay apps on PC-01 were never deleted — the project was flipped to
-- project_type = 'consulting', which hid construction financials (pay apps,
-- commitments, budget) behind the consulting invoice UI.
--
-- Rule: any project that already has a prime contract must be construction.
-- Explicitly force the known Conveyance / Sewer Extension project as well.

DO $$
DECLARE
  v_conveyance uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';
  n_prime int := 0;
  n_named int := 0;
BEGIN
  -- 1) Explicit: Conveyance & Close-Out (Glorieta sewer extension tracker + PC-01)
  UPDATE public.projects
  SET project_type = 'property',
      updated_at = now()
  WHERE id = v_conveyance
    AND project_type IS DISTINCT FROM 'property';

  GET DIAGNOSTICS n_named = ROW_COUNT;
  IF n_named > 0 THEN
    RAISE NOTICE 'Restored Conveyance/Sewer Extension (%) to construction (property)', v_conveyance;
  END IF;

  -- 2) Safety net: any consulting/client project that already has a prime contract
  --    is construction work — restore pay-app financials.
  UPDATE public.projects p
  SET project_type = 'property',
      updated_at = now()
  WHERE p.project_type IN ('consulting', 'client')
    AND EXISTS (
      SELECT 1
      FROM public.prime_contracts pc
      WHERE pc.project_id = p.id
    );

  GET DIAGNOSTICS n_prime = ROW_COUNT;
  IF n_prime > 0 THEN
    RAISE NOTICE 'Restored % project(s) with prime contracts from consulting → construction', n_prime;
  END IF;

  -- 3) Name-based catch for sewer extension / conveyance still marked consulting
  UPDATE public.projects p
  SET project_type = 'property',
      updated_at = now()
  WHERE p.project_type IN ('consulting', 'client')
    AND (
      lower(p.name) LIKE '%sewer extension%'
      OR lower(p.name) LIKE '%conveyance%close%'
      OR lower(p.name) LIKE '%conveyance & close%'
    );

  RAISE NOTICE 'Sewer/construction restore complete';
END $$;
