-- ============================================================
-- CRM contact ↔ property many-to-many
-- ============================================================
-- crm_contacts.property_id stays as the primary/legacy property
-- (and satisfies contact_ownership_check). Additional properties
-- live here so a contact can be attached to every workspace
-- property, not just one.
--
-- tenant_id references workspaces(id) — the SaaS tenant — not
-- public.tenants (residential leasing).
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.crm_contact_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_ccp_tenant ON public.crm_contact_properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ccp_contact ON public.crm_contact_properties(contact_id);
CREATE INDEX IF NOT EXISTS idx_ccp_property ON public.crm_contact_properties(property_id);

ALTER TABLE public.crm_contact_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_contact_properties_tenant_isolation ON public.crm_contact_properties;
CREATE POLICY crm_contact_properties_tenant_isolation ON public.crm_contact_properties
FOR ALL TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Same-tenant linkage: RLS cannot see a foreign parent row, so a
-- malicious insert could still write another tenant's UUID. The
-- trigger looks up both parents and compares workspace ids.
CREATE OR REPLACE FUNCTION public.enforce_crm_contact_property_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_contact_ws uuid;
  v_property_ws uuid;
BEGIN
  SELECT workspace_id INTO v_contact_ws
    FROM public.crm_contacts WHERE id = NEW.contact_id;
  SELECT workspace_id INTO v_property_ws
    FROM public.properties WHERE id = NEW.property_id;

  IF v_contact_ws IS NULL THEN
    RAISE EXCEPTION
      'crm_contact_properties: contact % not found or missing workspace',
      NEW.contact_id;
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM v_contact_ws THEN
    RAISE EXCEPTION
      'crm_contact_properties: contact workspace % does not match tenant_id %',
      v_contact_ws, NEW.tenant_id;
  END IF;
  -- Properties created before workspace backfill may have a null
  -- workspace_id; only reject a definite cross-tenant property.
  IF v_property_ws IS NOT NULL AND NEW.tenant_id IS DISTINCT FROM v_property_ws THEN
    RAISE EXCEPTION
      'crm_contact_properties: property workspace % does not match tenant_id %',
      v_property_ws, NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS crm_contact_properties_tenant_boundary
  ON public.crm_contact_properties;
CREATE TRIGGER crm_contact_properties_tenant_boundary
  BEFORE INSERT OR UPDATE ON public.crm_contact_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_crm_contact_property_tenant();

INSERT INTO public.crm_contact_properties (tenant_id, contact_id, property_id)
SELECT c.workspace_id, c.id, c.property_id
  FROM public.crm_contacts c
 WHERE c.property_id IS NOT NULL
   AND c.workspace_id IS NOT NULL
ON CONFLICT (contact_id, property_id) DO NOTHING;

COMMIT;
