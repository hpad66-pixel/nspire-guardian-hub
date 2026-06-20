-- Prime payment over-payment guard: cap at the REVISED CONTRACT VALUE across all
-- pay apps, not at a single pay app's this-period billed amount.
--
-- Owners pay progress billings in lump checks that span periods, so an individual
-- pay app can legitimately be over- or under-paid; what must never happen is total
-- cash received exceeding the contract's revised value (original + executed COs).
CREATE OR REPLACE FUNCTION public.guard_prime_payment_overpay()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contract uuid;
  v_ceiling  numeric(14,2);
  v_existing numeric(14,2);
BEGIN
  SELECT prime_contract_id INTO v_contract
    FROM public.prime_contract_pay_apps WHERE id = NEW.pay_app_id;

  -- Revised contract value = original + executed/approved prime change orders.
  SELECT pc.original_value
       + COALESCE((
           SELECT SUM(co.amount) FROM public.change_orders co
           WHERE co.prime_contract_id = v_contract
             AND co.status IN ('executed','approved')
         ), 0)
    INTO v_ceiling
    FROM public.prime_contracts pc WHERE pc.id = v_contract;

  -- Cumulative payments already posted across this contract's pay apps.
  SELECT COALESCE(SUM(p.amount), 0) INTO v_existing
    FROM public.prime_contract_payments p
    JOIN public.prime_contract_pay_apps a ON a.id = p.pay_app_id
    WHERE a.prime_contract_id = v_contract AND p.id <> NEW.id;

  IF (v_existing + NEW.amount) > v_ceiling THEN
    RAISE EXCEPTION 'OVERPAYMENT: contract payments (%) would exceed revised contract value (%)',
      v_existing + NEW.amount, v_ceiling;
  END IF;
  RETURN NEW;
END;
$function$;
