BEGIN;

-- Normalize every water account by the population it serves. These fields are
-- intentionally stored on the service account: they are safe to expose in the
-- owner/magic-link dashboard and do not reveal resident or unit identities.
ALTER TABLE public.water_service_accounts
  ADD COLUMN IF NOT EXISTS connected_units integer,
  ADD COLUMN IF NOT EXISTS occupied_units integer,
  ADD COLUMN IF NOT EXISTS resident_count integer,
  ADD COLUMN IF NOT EXISTS occupancy_as_of date,
  ADD COLUMN IF NOT EXISTS meter_scope text NOT NULL DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS allocation_source text NOT NULL DEFAULT 'unmapped',
  ADD COLUMN IF NOT EXISTS allocation_notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'water_accounts_connected_units_nonnegative'
  ) THEN
    ALTER TABLE public.water_service_accounts
      ADD CONSTRAINT water_accounts_connected_units_nonnegative
      CHECK (connected_units IS NULL OR connected_units >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'water_accounts_occupied_units_valid'
  ) THEN
    ALTER TABLE public.water_service_accounts
      ADD CONSTRAINT water_accounts_occupied_units_valid
      CHECK (
        occupied_units IS NULL
        OR (
          occupied_units >= 0
          AND (connected_units IS NULL OR occupied_units <= connected_units)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'water_accounts_resident_count_nonnegative'
  ) THEN
    ALTER TABLE public.water_service_accounts
      ADD CONSTRAINT water_accounts_resident_count_nonnegative
      CHECK (resident_count IS NULL OR resident_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'water_accounts_meter_scope_valid'
  ) THEN
    ALTER TABLE public.water_service_accounts
      ADD CONSTRAINT water_accounts_meter_scope_valid
      CHECK (meter_scope IN ('indoor', 'mixed', 'outdoor', 'common'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'water_accounts_allocation_source_valid'
  ) THEN
    ALTER TABLE public.water_service_accounts
      ADD CONSTRAINT water_accounts_allocation_source_valid
      CHECK (allocation_source IN ('verified', 'unit_roster', 'inferred', 'unmapped'));
  END IF;
END $$;

-- Anonymous Water Intelligence links need only aggregate property counts. Unit
-- identifiers and resident details never leave the authenticated application.
CREATE OR REPLACE FUNCTION public.water_intel_public_unit_summary(p_token text)
RETURNS TABLE (
  total_units bigint,
  occupied_units bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN count(u.id) FILTER (WHERE NOT COALESCE(u.demo_seed, false)) > 0
        THEN count(u.id) FILTER (WHERE NOT COALESCE(u.demo_seed, false))
      ELSE COALESCE(max(property.total_units), 0)::bigint
    END AS total_units,
    count(u.id) FILTER (
      WHERE NOT COALESCE(u.demo_seed, false)
        AND lower(COALESCE(u.status, '')) = 'occupied'
    ) AS occupied_units
  FROM public.water_intel_resolve_token(p_token) token
  JOIN public.properties property
    ON property.id = token.property_id
  LEFT JOIN public.units u
    ON u.property_id = token.property_id;
$$;

REVOKE ALL ON FUNCTION public.water_intel_public_unit_summary(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.water_intel_public_unit_summary(text) TO anon, authenticated;

-- Glorieta's property row predates the current unit roster. Keep the portfolio
-- count aligned with the non-demo units that actually exist in the system.
UPDATE public.properties property
SET total_units = roster.total_units
FROM (
  SELECT u.property_id, count(*)::integer AS total_units
  FROM public.units u
  WHERE NOT COALESCE(u.demo_seed, false)
  GROUP BY u.property_id
) roster
WHERE property.id = roster.property_id
  AND lower(property.name) LIKE '%glorieta%';

-- Four meter/building relationships are explicit in the verified account
-- labels. Populate those from the live unit roster and leave all ambiguous
-- addresses unmapped for an administrator to verify instead of guessing.
WITH mapping(account_number, prefixes) AS (
  VALUES
    ('2745714336', ARRAY['08']::text[]),
    ('1674911185', ARRAY['03']::text[]),
    ('8082997418', ARRAY['05', '06']::text[]),
    ('1692380502', ARRAY['07']::text[])
), counts AS (
  SELECT
    account.id AS account_id,
    count(unit.id)::integer AS connected_units,
    count(unit.id) FILTER (
      WHERE lower(COALESCE(unit.status, '')) = 'occupied'
    )::integer AS occupied_units
  FROM public.water_service_accounts account
  JOIN public.properties property
    ON property.id = account.property_id
   AND lower(property.name) LIKE '%glorieta%'
  JOIN mapping
    ON mapping.account_number = account.account_number
  LEFT JOIN public.units unit
    ON unit.property_id = account.property_id
   AND NOT COALESCE(unit.demo_seed, false)
   AND EXISTS (
     SELECT 1
     FROM unnest(mapping.prefixes) prefix
     WHERE unit.unit_number LIKE prefix || '-%'
   )
  GROUP BY account.id
)
UPDATE public.water_service_accounts account
SET connected_units = counts.connected_units,
    occupied_units = counts.occupied_units,
    occupancy_as_of = CURRENT_DATE,
    meter_scope = 'mixed',
    allocation_source = 'unit_roster',
    allocation_notes = CASE account.account_number
      WHEN '2745714336' THEN 'Building 8 allocation derived from the non-demo unit roster; resident count remains to be verified.'
      WHEN '1674911185' THEN 'Building 3 allocation derived from the non-demo unit roster; resident count remains to be verified.'
      WHEN '8082997418' THEN 'Buildings 5 and 6 allocation derived from the non-demo unit roster; resident count remains to be verified.'
      WHEN '1692380502' THEN 'Building 7 allocation derived from the non-demo unit roster; resident count remains to be verified.'
      ELSE account.allocation_notes
    END,
    updated_at = now()
FROM counts
WHERE account.id = counts.account_id
  AND account.allocation_source = 'unmapped';

NOTIFY pgrst, 'reload schema';

COMMIT;
