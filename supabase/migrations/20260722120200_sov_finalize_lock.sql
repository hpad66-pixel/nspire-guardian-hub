-- ─────────────────────────────────────────────────────────────────────────────
-- Finalize + lock the base Schedule of Values (Procore-style).
--
-- Once a prime contract's SOV is finalized, its BASE lines become immutable:
-- scheduled qty / unit price / scheduled value / description / item_no / unit
-- can no longer be edited, and base lines cannot be deleted. The only way the
-- contract value moves after that is through a change order (which lands as its
-- own change_order SOV line). To revise a finalized SOV, an admin explicitly
-- UNLOCKS it (sets sov_finalized_at back to NULL), edits, then re-finalizes.
--
-- change_order lines are NOT locked by this guard — they are billed/adjusted
-- through their own workflow. INSERTs are not blocked, so importing/extracting
-- new lines still works up until the SOV is finalized.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.prime_contracts
  ADD COLUMN IF NOT EXISTS sov_finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS sov_finalized_by uuid;

COMMENT ON COLUMN public.prime_contracts.sov_finalized_at IS
  'When set, the base SOV lines are locked (see guard_base_sov_line_locked). NULL = SOV still editable. Admin unlock = set back to NULL.';

CREATE OR REPLACE FUNCTION public.guard_base_sov_line_locked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  finalized timestamptz;
BEGIN
  -- Only base lines are locked; change_order lines stay editable.
  IF COALESCE(OLD.kind, NEW.kind) <> 'base' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  SELECT sov_finalized_at INTO finalized
  FROM public.prime_contracts WHERE id = OLD.prime_contract_id;

  IF finalized IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;  -- not finalized yet
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'The Schedule of Values is finalized — base line "%" cannot be deleted. Unlock the SOV to revise it, or raise a deductive change order.',
      OLD.item_no
      USING ERRCODE = 'check_violation';
  END IF;

  -- UPDATE: block only structural / money columns. Non-structural fields
  -- (retainage override, cost-code mapping, vendor, sort order) stay editable.
  IF NEW.item_no         IS DISTINCT FROM OLD.item_no
     OR NEW.description   IS DISTINCT FROM OLD.description
     OR NEW.unit          IS DISTINCT FROM OLD.unit
     OR NEW.scheduled_qty   IS DISTINCT FROM OLD.scheduled_qty
     OR NEW.unit_price      IS DISTINCT FROM OLD.unit_price
     OR NEW.scheduled_value IS DISTINCT FROM OLD.scheduled_value
  THEN
    RAISE EXCEPTION
      'The Schedule of Values is finalized — base line "%" is locked. Unlock the SOV to revise it, or raise a change order for the change in scope.',
      OLD.item_no
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_base_sov_line_locked ON public.sov_line_items;
CREATE TRIGGER trg_guard_base_sov_line_locked
  BEFORE UPDATE OR DELETE ON public.sov_line_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_base_sov_line_locked();
