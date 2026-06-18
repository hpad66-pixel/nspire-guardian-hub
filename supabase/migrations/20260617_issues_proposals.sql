-- ─────────────────────────────────────────────────────────────────────────────
-- Issues Log + Proposal Generator
-- Feature 2: project_issues  (field observations → PCOs)
-- Feature 4: proposals + proposal_lines (estimates → quotes → contracts)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── project_issues ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_issues (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL DEFAULT 'unforeseen'
                CHECK (category IN ('scope_gap','owner_directed','unforeseen','design_change','deficiency','other')),
  location      TEXT,
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','pending_review','converted_pco','converted_co','closed')),
  estimated_cost NUMERIC(14,2),
  photo_urls    TEXT[] DEFAULT '{}',
  linked_pco_id UUID,   -- change_orders.id when converted to PCO
  linked_co_id  UUID,   -- contract_change_orders.id when promoted to CO
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_issues_tenant_isolation ON public.project_issues
  FOR ALL TO authenticated
  USING  (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE INDEX IF NOT EXISTS project_issues_project_id_idx ON public.project_issues(project_id);
CREATE INDEX IF NOT EXISTS project_issues_status_idx     ON public.project_issues(status);

-- ── proposals ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  proposal_no     TEXT NOT NULL,
  title           TEXT NOT NULL,
  client_name     TEXT,
  client_email    TEXT,
  valid_until     DATE,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','sent','approved','rejected','expired')),
  notes           TEXT,
  terms           TEXT DEFAULT 'Net 30. All work per applicable codes and standards.',
  markup_pct      NUMERIC(5,2) NOT NULL DEFAULT 10,
  source_issue_id UUID REFERENCES public.project_issues(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, project_id, proposal_no)
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposals_tenant_isolation ON public.proposals
  FOR ALL TO authenticated
  USING  (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE INDEX IF NOT EXISTS proposals_project_id_idx ON public.proposals(project_id);

-- ── proposal_lines ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposal_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  line_no     INTEGER NOT NULL DEFAULT 1,
  category    TEXT NOT NULL DEFAULT 'labor'
              CHECK (category IN ('labor','material','equipment','subcontract','other')),
  description TEXT NOT NULL,
  quantity    NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit        TEXT NOT NULL DEFAULT 'ls',
  unit_cost   NUMERIC(14,2) NOT NULL DEFAULT 0,
  markup_pct  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposal_lines_tenant_isolation ON public.proposal_lines
  FOR ALL TO authenticated
  USING  (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE INDEX IF NOT EXISTS proposal_lines_proposal_id_idx ON public.proposal_lines(proposal_id);
