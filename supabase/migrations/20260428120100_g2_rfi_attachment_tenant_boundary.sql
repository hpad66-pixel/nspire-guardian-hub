-- ============================================================
-- G2 · rfi_attachments polymorphic FK tenant boundary
-- ============================================================
-- rfi_attachments references one of three parents:
--   document_id        -> public.pl_documents
--   photo_id           -> public.photos
--   drawing_markup_id  -> public.drawing_markups
--
-- All three parents carry tenant_id. RLS prevents reading a
-- foreign-tenant row, but does NOT prevent an INSERT/UPDATE
-- that writes a foreign-tenant UUID into the FK column. CLAUDE.md
-- rule 8 requires a BEFORE INSERT/UPDATE trigger that validates
-- parent-tenant alignment.
--
-- This migration depends on G1, which adds tenant_id to
-- rfi_attachments.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Replace the legacy "at least one FK" CHECK with an
--    "exactly one of three FKs" CHECK. The C1 migration created
--    an inline CHECK without a name; we drop any existing
--    constraint by either of the names this file may have
--    used in earlier rollouts, then add the strict one.
-- ------------------------------------------------------------
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.rfi_attachments'::regclass
       AND contype  = 'c'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.rfi_attachments DROP CONSTRAINT IF EXISTS %I', c);
  END LOOP;
END $$;

ALTER TABLE public.rfi_attachments
  ADD CONSTRAINT rfi_attachments_one_parent_chk
  CHECK (
    (document_id        IS NOT NULL)::int
  + (photo_id           IS NOT NULL)::int
  + (drawing_markup_id  IS NOT NULL)::int
  = 1
  );

-- ------------------------------------------------------------
-- 2. Trigger function: validate parent-tenant alignment.
--    SECURITY DEFINER + locked search_path so the lookup
--    bypasses RLS (we WANT to see the parent regardless of
--    the caller's tenant -- otherwise the parent disappears
--    from the SELECT and we miss the mismatch).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_rfi_attachment_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_parent_tenant uuid;
  v_parent_label  text;
BEGIN
  IF NEW.document_id IS NOT NULL THEN
    SELECT tenant_id INTO v_parent_tenant
      FROM public.pl_documents WHERE id = NEW.document_id;
    v_parent_label := 'pl_documents';
  ELSIF NEW.photo_id IS NOT NULL THEN
    SELECT tenant_id INTO v_parent_tenant
      FROM public.photos WHERE id = NEW.photo_id;
    v_parent_label := 'photos';
  ELSIF NEW.drawing_markup_id IS NOT NULL THEN
    SELECT tenant_id INTO v_parent_tenant
      FROM public.drawing_markups WHERE id = NEW.drawing_markup_id;
    v_parent_label := 'drawing_markups';
  ELSE
    RAISE EXCEPTION
      'rfi_attachment: exactly one of document_id/photo_id/drawing_markup_id must be set'
      USING ERRCODE = '23514';
  END IF;

  IF v_parent_tenant IS NULL THEN
    RAISE EXCEPTION
      'rfi_attachment: parent row in % not found',
      v_parent_label
      USING ERRCODE = '23503';
  END IF;

  IF v_parent_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION
      'rfi_attachment tenant mismatch: parent tenant=% attachment tenant=%',
      v_parent_tenant, NEW.tenant_id
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.check_rfi_attachment_tenant() FROM PUBLIC;

-- ------------------------------------------------------------
-- 3. Re-runnable trigger.
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS rfi_attachments_tenant_boundary
  ON public.rfi_attachments;

CREATE TRIGGER rfi_attachments_tenant_boundary
  BEFORE INSERT OR UPDATE ON public.rfi_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_rfi_attachment_tenant();

-- ------------------------------------------------------------
-- 4. Sanity check: trigger and CHECK must both be present.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'rfi_attachments_tenant_boundary'
       AND tgrelid = 'public.rfi_attachments'::regclass
  ) THEN
    RAISE EXCEPTION 'G2 sanity: trigger missing on rfi_attachments';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'rfi_attachments_one_parent_chk'
       AND conrelid = 'public.rfi_attachments'::regclass
  ) THEN
    RAISE EXCEPTION 'G2 sanity: one-parent CHECK missing on rfi_attachments';
  END IF;
END $$;

COMMIT;
