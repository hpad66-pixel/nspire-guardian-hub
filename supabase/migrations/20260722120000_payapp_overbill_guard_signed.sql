-- ─────────────────────────────────────────────────────────────────────────────
-- Sign-aware overbill guard for pay-app lines.
--
-- The original guard (20260622060000) assumed every sov_line_item.scheduled_value
-- was positive and rejected any `value_to_date > scheduled_value`. That logic is
-- backwards for a DEDUCTIVE change-order line, whose scheduled_value is NEGATIVE
-- (e.g. -1800.00). For such a line, `value_to_date = 0.00 > -1799.99` tripped the
-- guard and blocked pay-app generation entirely — even though 0.00 is not an
-- overbill of a -1800 credit. This CREATE OR REPLACE makes the cap sign-aware:
--
--   • Positive line (base or additive CO): value_to_date may not exceed
--     scheduled_value (unchanged behaviour). Reductions are still allowed so a
--     pre-existing overage can be corrected down.
--   • Negative line (deductive CO): value_to_date runs from scheduled_value
--     (credit fully applied) up to 0. It may not go MORE negative than the
--     scheduled credit, and may not be billed positive. Corrections back toward
--     zero are allowed.
--
-- This is the single source of truth for the cap — enforced even against the
-- REST API. It replaces the function in place; the trigger from 20260622060000
-- keeps pointing at it.
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

  -- ── Positive line: cap the UPPER bound at scheduled_value ──
  IF sched >= 0 THEN
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
  END IF;

  -- ── Deductive line (sched < 0): value_to_date ∈ [scheduled_value, 0] ──
  -- Cannot deduct MORE than the scheduled credit …
  IF NEW.value_to_date < sched - tol THEN
    -- Allow correcting an over-deduction back toward zero.
    IF TG_OP = 'UPDATE' AND NEW.value_to_date >= OLD.value_to_date - tol THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION
      'Cannot deduct beyond the scheduled credit on this line (scheduled %, attempted %). Adjust the deductive change order instead.',
      round(sched, 2), round(NEW.value_to_date, 2)
      USING ERRCODE = 'check_violation';
  END IF;

  -- … and a credit line can never be billed as a positive value.
  IF NEW.value_to_date > tol THEN
    RAISE EXCEPTION
      'This is a deductive change-order line (scheduled %); it can only reduce, not add value (attempted %).',
      round(sched, 2), round(NEW.value_to_date, 2)
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger trg_guard_pay_app_line_overbill (20260622060000) already binds this
-- function BEFORE INSERT OR UPDATE ON public.pay_app_line_progress; no re-bind
-- needed.
