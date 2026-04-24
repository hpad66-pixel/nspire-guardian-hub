-- ============================================================
-- T2.5 · Webhook emission triggers
-- AFTER INSERT/UPDATE on financial + field tables → emit_webhook_event()
-- which fans out to webhook_subscriptions matching the event_type.
-- ============================================================

-- Generic trigger function: emit event named '<record_type>.<verb>'
-- where verb is derived from TG_OP + status transitions where relevant.
CREATE OR REPLACE FUNCTION public.tg_emit_crud_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event text;
  v_tenant uuid;
  v_payload jsonb;
BEGIN
  -- resolve tenant_id (some tables store it directly, others inherit)
  BEGIN
    v_tenant := (NEW.tenant_id)::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_tenant := NULL;
  END;

  v_payload := to_jsonb(NEW);

  IF TG_OP = 'INSERT' THEN
    v_event := TG_ARGV[0] || '.created';
    PERFORM public.emit_webhook_event(v_tenant, v_event, v_payload);

  ELSIF TG_OP = 'UPDATE' THEN
    -- status transition? emit both generic .updated and specific .<status>
    v_event := TG_ARGV[0] || '.updated';
    PERFORM public.emit_webhook_event(v_tenant, v_event, v_payload);

    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IS NOT NULL THEN
      v_event := TG_ARGV[0] || '.' || NEW.status;
      PERFORM public.emit_webhook_event(v_tenant, v_event, v_payload);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Commitments: commitment.created | updated | executed | closed | terminated | void
DROP TRIGGER IF EXISTS trg_emit_commitments ON public.commitments;
CREATE TRIGGER trg_emit_commitments
  AFTER INSERT OR UPDATE ON public.commitments
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_crud_event('commitment');

-- Change orders: change_order.created | .executed | .rejected | .void
DROP TRIGGER IF EXISTS trg_emit_change_orders ON public.change_orders;
CREATE TRIGGER trg_emit_change_orders
  AFTER INSERT OR UPDATE ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_crud_event('change_order');

-- Change events: change_event.created | .closed | .void
DROP TRIGGER IF EXISTS trg_emit_change_events ON public.change_events;
CREATE TRIGGER trg_emit_change_events
  AFTER INSERT OR UPDATE ON public.change_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_crud_event('change_event');

-- Prime contract pay apps: pay_app.submitted | .approved | .paid | .rejected
DROP TRIGGER IF EXISTS trg_emit_pay_apps ON public.prime_contract_pay_apps;
CREATE TRIGGER trg_emit_pay_apps
  AFTER INSERT OR UPDATE ON public.prime_contract_pay_apps
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_crud_event('pay_app');

-- Commitment invoices: invoice.submitted | .approved | .paid | .rejected
DROP TRIGGER IF EXISTS trg_emit_commitment_invoices ON public.commitment_invoices;
CREATE TRIGGER trg_emit_commitment_invoices
  AFTER INSERT OR UPDATE ON public.commitment_invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_crud_event('invoice');

-- Direct costs: direct_cost.created | .approved | .paid | .void
DROP TRIGGER IF EXISTS trg_emit_direct_costs ON public.direct_costs;
CREATE TRIGGER trg_emit_direct_costs
  AFTER INSERT OR UPDATE ON public.direct_costs
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_crud_event('direct_cost');

-- RFIs: rfi.created | .open | .closed (uses `stage` column, so specialized trigger)
CREATE OR REPLACE FUNCTION public.tg_emit_rfi_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
  v_ws uuid;
BEGIN
  SELECT p.workspace_id INTO v_ws FROM public.projects p WHERE p.id = NEW.project_id;
  v_tenant := v_ws;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_webhook_event(v_tenant, 'rfi.created', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.emit_webhook_event(v_tenant, 'rfi.updated', to_jsonb(NEW));
    IF NEW.stage IS DISTINCT FROM OLD.stage AND NEW.stage IS NOT NULL THEN
      PERFORM public.emit_webhook_event(v_tenant, 'rfi.' || NEW.stage, to_jsonb(NEW));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_rfis ON public.project_rfis;
CREATE TRIGGER trg_emit_rfis
  AFTER INSERT OR UPDATE ON public.project_rfis
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_rfi_event();

-- RFI responses: rfi.responded (when is_official flips true)
CREATE OR REPLACE FUNCTION public.tg_emit_rfi_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
  v_rfi record;
BEGIN
  IF NEW.is_official = true THEN
    SELECT r.*, p.workspace_id AS tenant_id INTO v_rfi
    FROM public.project_rfis r
    JOIN public.projects p ON p.id = r.project_id
    WHERE r.id = NEW.rfi_id;
    IF v_rfi IS NOT NULL THEN
      PERFORM public.emit_webhook_event(
        v_rfi.tenant_id, 'rfi.responded',
        jsonb_build_object('rfi', to_jsonb(v_rfi), 'response', to_jsonb(NEW))
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_rfi_responses ON public.rfi_responses;
CREATE TRIGGER trg_emit_rfi_responses
  AFTER INSERT OR UPDATE ON public.rfi_responses
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_rfi_response();
