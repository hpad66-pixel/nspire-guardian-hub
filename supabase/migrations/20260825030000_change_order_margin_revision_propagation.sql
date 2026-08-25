-- Keep vendor-margin classifications tied to the exact commercial revision of
-- the owner change order that was reviewed.  Reopening an executed CO appends
-- amendment_history; changing its amount while in draft also makes the stored
-- source amount differ.  The UI can therefore preserve the vendor assignment
-- while requiring an explicit review/save before counting the amended value.
ALTER TABLE public.co_margin_links
  ADD COLUMN IF NOT EXISTS source_amount numeric,
  ADD COLUMN IF NOT EXISTS source_amendment_count integer;

-- Backfill each existing link with the source amount currently on the CO and
-- the number of amendments that existed when the link was originally saved.
-- This intentionally identifies links that pre-date a later amendment.
UPDATE public.co_margin_links AS link
SET
  source_amount = COALESCE(co.amount, 0),
  source_amendment_count = COALESCE((
    SELECT count(*)::integer
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(co.amendment_history) = 'array'
        THEN co.amendment_history ELSE '[]'::jsonb END
    ) AS amendment
    WHERE CASE
      WHEN amendment->>'at' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
        THEN (amendment->>'at')::timestamptz <= link.created_at
      ELSE true
    END
  ), 0)
FROM public.change_orders AS co
WHERE co.id = link.prime_co_id
  AND (link.source_amount IS NULL OR link.source_amendment_count IS NULL);

ALTER TABLE public.co_margin_links
  ALTER COLUMN source_amount SET DEFAULT 0,
  ALTER COLUMN source_amount SET NOT NULL,
  ALTER COLUMN source_amendment_count SET DEFAULT 0,
  ALTER COLUMN source_amendment_count SET NOT NULL;

COMMENT ON COLUMN public.co_margin_links.source_amount IS
  'Owner CO amount at the time the vendor-margin classification was last saved.';
COMMENT ON COLUMN public.co_margin_links.source_amendment_count IS
  'Count of owner CO amendment_history entries when the classification was last saved.';

CREATE OR REPLACE FUNCTION public.stamp_co_margin_classification_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_amendment_count integer;
  v_should_stamp boolean := false;
BEGIN
  -- Updating only the pushed sub-CO link must not silently certify an older
  -- classification. Refresh the source snapshot only when the classification
  -- itself is first saved or its commercial/vendor fields are changed.
  IF TG_OP = 'INSERT' THEN
    v_should_stamp := true;
  ELSE
    v_should_stamp :=
      ROW(NEW.treatment, NEW.sub_cost, NEW.sub_label, NEW.sub_commitment_id, NEW.is_pass_through)
      IS DISTINCT FROM
      ROW(OLD.treatment, OLD.sub_cost, OLD.sub_label, OLD.sub_commitment_id, OLD.is_pass_through);
  END IF;

  IF v_should_stamp THEN
    SELECT
      co.amount,
      CASE WHEN jsonb_typeof(co.amendment_history) = 'array'
        THEN jsonb_array_length(co.amendment_history) ELSE 0 END
    INTO v_amount, v_amendment_count
    FROM public.change_orders AS co
    WHERE co.id = NEW.prime_co_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Prime change order % does not exist', NEW.prime_co_id;
    END IF;

    NEW.source_amount := COALESCE(v_amount, 0);
    NEW.source_amendment_count := COALESCE(v_amendment_count, 0);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_co_margin_classification_source ON public.co_margin_links;
CREATE TRIGGER trg_co_margin_classification_source
  BEFORE INSERT OR UPDATE ON public.co_margin_links
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_co_margin_classification_source();
