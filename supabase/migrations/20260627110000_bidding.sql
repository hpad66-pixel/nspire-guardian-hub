-- Bid / Tender management. A GC creates bid packages per scope/trade, invites
-- subcontractors, records their bids, levels them, and awards the winner.
-- Follows the Procore Lite conventions: tenant_id + current_tenant_id() RLS, and
-- cost_code_id so awarded work flows into the D6 budget matrix.

CREATE TABLE IF NOT EXISTS public.bid_packages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES public.projects(id)   ON DELETE CASCADE,
  cost_code_id uuid REFERENCES public.cost_codes(id),
  title        text NOT NULL,
  trade        text,
  scope        text,
  due_date     date,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'awarded', 'closed')),
  awarded_invitee_id uuid,             -- FK added after bid_invitees exists
  estimate     numeric,               -- optional internal budget for leveling
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bid_packages_project_idx ON public.bid_packages (project_id, status);

CREATE TABLE IF NOT EXISTS public.bid_invitees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bid_package_id  uuid NOT NULL REFERENCES public.bid_packages(id) ON DELETE CASCADE,
  vendor_name     text NOT NULL,
  vendor_company  text,
  vendor_email    text,
  status          text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'declined', 'submitted', 'awarded')),
  bid_amount      numeric,
  notes           text,
  submitted_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bid_invitees_package_idx ON public.bid_invitees (bid_package_id);

ALTER TABLE public.bid_packages
  ADD CONSTRAINT bid_packages_awarded_fk FOREIGN KEY (awarded_invitee_id)
  REFERENCES public.bid_invitees(id) ON DELETE SET NULL;

-- RLS — standard tenant isolation.
ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_invitees ENABLE ROW LEVEL SECURITY;

CREATE POLICY bid_packages_tenant_isolation ON public.bid_packages
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY bid_invitees_tenant_isolation ON public.bid_invitees
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE OR REPLACE FUNCTION public.touch_bid_packages_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS bid_packages_touch ON public.bid_packages;
CREATE TRIGGER bid_packages_touch BEFORE UPDATE ON public.bid_packages
  FOR EACH ROW EXECUTE FUNCTION public.touch_bid_packages_updated_at();
