-- ─────────────────────────────────────────────────────────────────────────────
-- Hard cap: a pay-app line can never be billed beyond its scheduled value.
--
-- value_to_date (= qty completed × unit price) may not exceed the sov_line_item's
-- scheduled_value. To bill more, the user must raise an approved change order
-- (which becomes its own SOV line with its own scheduled value). This is the
-- single source of truth for the cap — enforced even against the REST API.
--
-- Reductions are always allowed (so any line already over 100% from before the
-- cap can be corrected DOWN) — only an INCREASE past scheduled is rejected.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.guard_pay_app_line_overbill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sched numeric;
  tol   numeric := 0.01;   -- rounding tolerance
BEGIN
  SELECT scheduled_value INTO sched
  FROM public.sov_line_items WHERE id = NEW.sov_line_item_id;

  IF sched IS NULL THEN
    RETURN NEW;  -- no scheduled line to compare against
  END IF;

  IF NEW.value_to_date > sched + tol THEN
    -- Allow holding/reducing an existing overage so it can be corrected down.
    IF TG_OP = 'UPDATE' AND NEW.value_to_date <= OLD.value_to_date + tol THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION
      'Cannot bill beyond the scheduled value on this line (scheduled %, attempted %). Create an approved change order for the additional scope and bill it on the change-order line.',
      round(sched, 2), round(NEW.value_to_date, 2)
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_pay_app_line_overbill ON public.pay_app_line_progress;
CREATE TRIGGER trg_guard_pay_app_line_overbill
  BEFORE INSERT OR UPDATE ON public.pay_app_line_progress
  FOR EACH ROW EXECUTE FUNCTION public.guard_pay_app_line_overbill();
