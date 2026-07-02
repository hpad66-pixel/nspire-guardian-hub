-- Consulting engagement "scopes" — the workstream / deliverable spine.
--
-- Each scope carries a fee and a % complete; the Invoicing module (next
-- migration) bills against the delta in % complete, and action items roll up
-- under a scope via project_action_items.scope_id.

CREATE TABLE IF NOT EXISTS public.project_scopes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scope_no      integer,
  title         text NOT NULL,
  description   text,
  owner_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'not_started',
  start_date    date,
  due_date      date,
  fee_amount    numeric NOT NULL DEFAULT 0,
  pct_complete  numeric(5,2) NOT NULL DEFAULT 0,
  pct_billed    numeric(5,2) NOT NULL DEFAULT 0,
  sort_order    integer NOT NULL DEFAULT 0,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_scopes_project_idx
  ON public.project_scopes (project_id, sort_order);

ALTER TABLE public.project_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_scopes_tenant ON public.project_scopes FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Roll action items up under a scope (nullable, additive — existing items keep
-- working unchanged; populated from the Action Items module in a later PR).
ALTER TABLE public.project_action_items
  ADD COLUMN IF NOT EXISTS scope_id uuid REFERENCES public.project_scopes(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
