-- Freeze an auditable cash-basis profit/loss for construction closeouts too.
-- Consulting closeouts already supply the same financial_position JSON shape.

BEGIN;

CREATE OR REPLACE FUNCTION public.enrich_project_closeout_financial_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_financial_activity boolean := false;
  v_revised_contract numeric(14,2) := 0;
  v_billed numeric(14,2) := 0;
  v_received numeric(14,2) := 0;
  v_committed numeric(14,2) := 0;
  v_paid_to_subs numeric(14,2) := 0;
  v_ar_outstanding numeric(14,2) := 0;
  v_ap_outstanding numeric(14,2) := 0;
  v_direct_costs numeric(14,2) := 0;
  v_direct_paid numeric(14,2) := 0;
  v_total_costs numeric(14,2) := 0;
  v_cash_paid numeric(14,2) := 0;
  v_net_profit numeric(14,2) := 0;
  v_margin_pct numeric(8,2) := 0;
  v_is_reconciled boolean := false;
  v_position jsonb;
BEGIN
  IF NEW.status <> 'closed'
     OR OLD.status = 'closed'
     OR NEW.project_type IN ('consulting', 'client')
     OR NEW.close_snapshot IS NULL
     OR jsonb_typeof(NEW.close_snapshot) <> 'object'
     OR (
       NEW.close_snapshot ? 'financial_position'
       AND NEW.close_snapshot->'financial_position' IS DISTINCT FROM 'null'::jsonb
     ) THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.prime_contracts pc WHERE pc.project_id = NEW.id
    UNION ALL
    SELECT 1 FROM public.commitments c WHERE c.project_id = NEW.id
    UNION ALL
    SELECT 1 FROM public.direct_costs dc WHERE dc.project_id = NEW.id AND dc.status <> 'void'
  ) INTO v_has_financial_activity;

  IF NOT v_has_financial_activity THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(s.revised_contract, 0),
    COALESCE(s.billed_to_date, 0),
    COALESCE(s.received_to_date, 0),
    COALESCE(s.committed_total, 0),
    COALESCE(s.paid_to_subs, 0),
    COALESCE(s.ar_outstanding, 0),
    COALESCE(s.ap_outstanding, 0)
  INTO
    v_revised_contract,
    v_billed,
    v_received,
    v_committed,
    v_paid_to_subs,
    v_ar_outstanding,
    v_ap_outstanding
  FROM public.v_project_financial_summary s
  WHERE s.project_id = NEW.id;

  SELECT
    COALESCE(SUM(dc.amount) FILTER (WHERE dc.status IN ('approved', 'paid')), 0),
    COALESCE(SUM(dc.amount) FILTER (WHERE dc.status = 'paid'), 0)
  INTO v_direct_costs, v_direct_paid
  FROM public.direct_costs dc
  WHERE dc.project_id = NEW.id;

  v_revised_contract := COALESCE(v_revised_contract, 0);
  v_billed := COALESCE(v_billed, 0);
  v_received := COALESCE(v_received, 0);
  v_committed := COALESCE(v_committed, 0);
  v_paid_to_subs := COALESCE(v_paid_to_subs, 0);
  v_ar_outstanding := COALESCE(v_ar_outstanding, 0);
  v_ap_outstanding := COALESCE(v_ap_outstanding, 0);
  v_total_costs := v_committed + v_direct_costs;
  v_cash_paid := v_paid_to_subs + v_direct_paid;
  v_net_profit := v_received - v_cash_paid;
  v_margin_pct := CASE
    WHEN v_received = 0 THEN 0
    ELSE round((v_net_profit / v_received) * 100, 2)
  END;
  v_is_reconciled := abs(v_ar_outstanding) < 0.01 AND abs(v_ap_outstanding) < 0.01;

  v_position := jsonb_build_object(
    'project_id', NEW.id,
    'basis', 'cash_received_minus_cash_paid',
    'approved_revenue', v_revised_contract,
    'invoiced_revenue', v_billed,
    'cash_received', v_received,
    'total_costs', v_total_costs,
    'cash_paid', v_cash_paid,
    'net_profit', v_net_profit,
    'margin_pct', v_margin_pct,
    'is_reconciled', v_is_reconciled,
    'ar_outstanding', v_ar_outstanding,
    'ap_outstanding', v_ap_outstanding,
    'paid_to_subcontractors', v_paid_to_subs,
    'direct_costs_paid', v_direct_paid,
    'captured_at', now()
  );

  NEW.close_snapshot := jsonb_set(
    NEW.close_snapshot,
    '{financial_position}',
    v_position,
    true
  );

  RETURN NEW;
END;
$$;

-- Alphabetically precedes guard_closed_project_row_write_trg, ensuring the
-- financial result is present before the certified closeout write is checked.
DROP TRIGGER IF EXISTS closed_project_financial_snapshot_trg ON public.projects;
CREATE TRIGGER closed_project_financial_snapshot_trg
  BEFORE UPDATE OF status ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.enrich_project_closeout_financial_snapshot();

COMMIT;
