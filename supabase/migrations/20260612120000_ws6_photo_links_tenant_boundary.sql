-- ============================================================
-- WS-6 · photo_links polymorphic FK tenant boundary (CLAUDE.md rule 8)
-- ============================================================
-- public.photo_links is polymorphic: it links a photo to one of N parent
-- records via (linked_record_id, linked_record_type) with NO FK constraint
-- and NO same-tenant enforcement.
--
--   linked_record_type   parent table              tenant chain
--   ------------------   -----------------------   --------------------------------
--   'daily'              public.daily_reports      project_id -> projects.property_id
--   'rfi'                public.project_rfis                  -> properties.workspace_id
--   'punch'              public.punch_items
--   'submittal'          public.project_submittals
--
-- The existing RLS policy (pl_via_photo) only checks that the *photo* belongs
-- to the current tenant. It does NOT stop an INSERT/UPDATE that points a
-- tenant-A photo at a tenant-B record: RLS hides the foreign row from reads,
-- but a crafted UUID still writes. CLAUDE.md rule 8 requires a BEFORE
-- INSERT/UPDATE trigger that resolves the parent's tenant and rejects a
-- mismatch.
--
-- The linking photo carries the authoritative tenant_id (photo_links has no
-- tenant_id column of its own), so we compare the resolved record tenant
-- against the photo's tenant.
--
-- Re-runnable: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Trigger function: validate photo.tenant == linked-record.tenant.
-- SECURITY DEFINER + locked search_path so the parent lookups bypass RLS
-- (otherwise a foreign-tenant parent vanishes from the SELECT and the
-- mismatch goes undetected).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_photo_link_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_photo_tenant  uuid;
  v_record_tenant uuid;
BEGIN
  -- 1. Authoritative tenant = the linking photo's tenant.
  SELECT tenant_id INTO v_photo_tenant
    FROM public.photos WHERE id = NEW.photo_id;

  IF v_photo_tenant IS NULL THEN
    RAISE EXCEPTION 'photo_link: photo % not found', NEW.photo_id
      USING ERRCODE = '23503';
  END IF;

  -- 2. Resolve the linked record's tenant via
  --    <table>.project_id -> projects.property_id -> properties.workspace_id.
  IF NEW.linked_record_type = 'daily' THEN
    SELECT pr.workspace_id INTO v_record_tenant
      FROM public.daily_reports d
      JOIN public.projects   p  ON p.id  = d.project_id
      JOIN public.properties pr ON pr.id = p.property_id
     WHERE d.id = NEW.linked_record_id;
  ELSIF NEW.linked_record_type = 'rfi' THEN
    SELECT pr.workspace_id INTO v_record_tenant
      FROM public.project_rfis r
      JOIN public.projects   p  ON p.id  = r.project_id
      JOIN public.properties pr ON pr.id = p.property_id
     WHERE r.id = NEW.linked_record_id;
  ELSIF NEW.linked_record_type = 'punch' THEN
    SELECT pr.workspace_id INTO v_record_tenant
      FROM public.punch_items pi
      JOIN public.projects   p  ON p.id  = pi.project_id
      JOIN public.properties pr ON pr.id = p.property_id
     WHERE pi.id = NEW.linked_record_id;
  ELSIF NEW.linked_record_type = 'submittal' THEN
    SELECT pr.workspace_id INTO v_record_tenant
      FROM public.project_submittals s
      JOIN public.projects   p  ON p.id  = s.project_id
      JOIN public.properties pr ON pr.id = p.property_id
     WHERE s.id = NEW.linked_record_id;
  ELSE
    -- Unknown record type cannot be tenant-verified. Tenant isolation is
    -- absolute (CLAUDE.md rule 1 + 8) -> reject rather than allow an
    -- unverifiable cross-tenant link.
    RAISE EXCEPTION 'photo_link: unknown linked_record_type %', NEW.linked_record_type
      USING ERRCODE = '23514';
  END IF;

  IF v_record_tenant IS NULL THEN
    RAISE EXCEPTION 'photo_link: linked % record % not found',
      NEW.linked_record_type, NEW.linked_record_id
      USING ERRCODE = '23503';
  END IF;

  -- 3. Same-tenant boundary.
  IF v_record_tenant <> v_photo_tenant THEN
    RAISE EXCEPTION
      'photo_link tenant mismatch: photo tenant=% % record tenant=%',
      v_photo_tenant, NEW.linked_record_type, v_record_tenant
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.check_photo_link_tenant() FROM PUBLIC;

-- ------------------------------------------------------------
-- Re-runnable trigger.
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS photo_links_tenant_boundary ON public.photo_links;

CREATE TRIGGER photo_links_tenant_boundary
  BEFORE INSERT OR UPDATE ON public.photo_links
  FOR EACH ROW
  EXECUTE FUNCTION public.check_photo_link_tenant();

-- ------------------------------------------------------------
-- Sanity check: the trigger must be present.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'photo_links_tenant_boundary'
       AND tgrelid = 'public.photo_links'::regclass
  ) THEN
    RAISE EXCEPTION 'WS6 sanity: trigger missing on photo_links';
  END IF;
END $$;

COMMIT;
