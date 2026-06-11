-- ============================================================
-- WS-1 · Fix RFI create + auto-fill tenant on folders & contacts
-- ============================================================
-- Three dead flows, one root family of causes.
--
-- #1 RFI create throws "column p.workspace_id does not exist".
--    tg_emit_rfi_event() and tg_emit_rfi_response() (from
--    20260422105200_webhook_emission_triggers.sql) read
--    p.workspace_id directly off public.projects, but projects
--    has NO workspace_id column -- tenancy chains through
--    projects.property_id -> properties.workspace_id. The
--    AFTER INSERT trigger raised, rolling back every RFI insert.
--    Fixed here via CREATE OR REPLACE, resolving tenant through
--    the properties join.
--
-- #2/#3 document_folders / crm_contacts inserts violate their
--    *_insert RLS (WITH CHECK workspace_id = get_my_workspace_id())
--    because nothing fills workspace_id. We add BEFORE INSERT
--    triggers that set NEW.workspace_id := get_my_workspace_id()
--    when null (mirror of 20260428120300_g1_auto_tenant_triggers).
--    RLS WITH CHECK still validates the filled value, so this
--    does not weaken isolation -- it only stops omitting the
--    column. The hooks also set it explicitly; the trigger is
--    the server-side safety net.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- #1 · RFI webhook emission triggers -- resolve tenant via
--      projects.property_id -> properties.workspace_id.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_emit_rfi_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
  v_ws uuid;
BEGIN
  SELECT pr.workspace_id INTO v_ws
    FROM public.projects p
    JOIN public.properties pr ON pr.id = p.property_id
   WHERE p.id = NEW.project_id;
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

CREATE OR REPLACE FUNCTION public.tg_emit_rfi_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rfi record;
BEGIN
  IF NEW.is_official = true THEN
    SELECT r.*, pr.workspace_id AS tenant_id INTO v_rfi
    FROM public.project_rfis r
    JOIN public.projects p ON p.id = r.project_id
    JOIN public.properties pr ON pr.id = p.property_id
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

-- ------------------------------------------------------------
-- #2/#3 · Auto-fill workspace_id on document_folders & crm_contacts.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fill_workspace_from_current()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_ws uuid;
BEGIN
  v_ws := public.get_my_workspace_id();
  IF v_ws IS NULL THEN
    RAISE EXCEPTION
      'fill_workspace_from_current: no workspace for current user'
      USING ERRCODE = '23502';
  END IF;
  NEW.workspace_id := v_ws;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.fill_workspace_from_current() FROM PUBLIC;

DROP TRIGGER IF EXISTS document_folders_fill_workspace ON public.document_folders;
CREATE TRIGGER document_folders_fill_workspace
  BEFORE INSERT ON public.document_folders
  FOR EACH ROW
  WHEN (NEW.workspace_id IS NULL)
  EXECUTE FUNCTION public.fill_workspace_from_current();

DROP TRIGGER IF EXISTS crm_contacts_fill_workspace ON public.crm_contacts;
CREATE TRIGGER crm_contacts_fill_workspace
  BEFORE INSERT ON public.crm_contacts
  FOR EACH ROW
  WHEN (NEW.workspace_id IS NULL)
  EXECUTE FUNCTION public.fill_workspace_from_current();

COMMIT;
