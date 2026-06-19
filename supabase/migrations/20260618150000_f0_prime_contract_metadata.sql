-- ============================================================
-- F0 follow-up · Restore rich contract metadata on prime_contracts that the
-- Stack-A retirement could not carry (parties / dates / narrative / terms).
-- All additive + nullable. Backfills the Glorieta prime's known parties.
-- ============================================================

ALTER TABLE public.prime_contracts
  -- parties (text, alongside the existing owner_org_id / gc_org_id FK links)
  ADD COLUMN IF NOT EXISTS contractor_name    text,
  ADD COLUMN IF NOT EXISTS contractor_address text,
  ADD COLUMN IF NOT EXISTS contractor_contact text,
  ADD COLUMN IF NOT EXISTS contractor_email   text,
  ADD COLUMN IF NOT EXISTS owner_name         text,
  ADD COLUMN IF NOT EXISTS owner_address      text,
  ADD COLUMN IF NOT EXISTS owner_contact      text,
  ADD COLUMN IF NOT EXISTS owner_email        text,
  ADD COLUMN IF NOT EXISTS architect_name     text,
  ADD COLUMN IF NOT EXISTS project_address    text,
  ADD COLUMN IF NOT EXISTS docusign_envelope_id text,
  ADD COLUMN IF NOT EXISTS artifact_id        uuid REFERENCES public.project_artifacts(id) ON DELETE SET NULL,
  -- dates
  ADD COLUMN IF NOT EXISTS contract_date              date,
  ADD COLUMN IF NOT EXISTS start_date                 date,
  ADD COLUMN IF NOT EXISTS substantial_completion_date date,
  ADD COLUMN IF NOT EXISTS final_completion_date      date,
  ADD COLUMN IF NOT EXISTS actual_completion_date     date,
  ADD COLUMN IF NOT EXISTS signed_contract_received_date date,
  -- narrative
  ADD COLUMN IF NOT EXISTS scope_description  text,
  ADD COLUMN IF NOT EXISTS inclusions         text,
  ADD COLUMN IF NOT EXISTS exclusions         text,
  ADD COLUMN IF NOT EXISTS special_conditions text,
  -- terms
  ADD COLUMN IF NOT EXISTS mobilization_advance         numeric(14,2),
  ADD COLUMN IF NOT EXISTS liquidated_damages_per_day    numeric(10,2),
  ADD COLUMN IF NOT EXISTS retainage_release_substantial numeric(5,2),
  ADD COLUMN IF NOT EXISTS retainage_release_final       numeric(5,2),
  ADD COLUMN IF NOT EXISTS retainage_warranty_months     integer,
  ADD COLUMN IF NOT EXISTS payment_cycle_days            integer,
  ADD COLUMN IF NOT EXISTS payment_due_within_days       integer;

-- Backfill the Glorieta prime's known parties (high-confidence from the import).
UPDATE public.prime_contracts
   SET contractor_name = COALESCE(contractor_name, 'APAS Consulting LLC'),
       contractor_email = COALESCE(contractor_email, 'admin@apas.ai'),
       contractor_address = COALESCE(contractor_address, '3256 NW 83 Way, Pembroke Pines, FL 33024'),
       owner_name = COALESCE(owner_name, 'R4 Capital C/o R4 GGOL GP LLC'),
       owner_email = COALESCE(owner_email, 'csullivan@r4cap.com'),
       owner_address = COALESCE(owner_address, '780 Third Avenue, New York, NY 11017'),
       project_address = COALESCE(project_address, '13210 Alexandria Dr, Opa-locka, FL 33054')
 WHERE project_id = '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';
