
-- Schedule of Values table
CREATE TABLE IF NOT EXISTS public.sov_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  item_number text NOT NULL,
  description text NOT NULL,
  scheduled_value numeric(12,2) NOT NULL DEFAULT 0,
  retainage_pct numeric(5,2) NOT NULL DEFAULT 10.00,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.sov_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation_sov" ON public.sov_line_items FOR ALL
  USING (workspace_id = public.get_my_workspace_id());

-- Pay Applications table
CREATE TABLE IF NOT EXISTS public.pay_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pay_app_number integer NOT NULL,
  period_from date NOT NULL,
  period_to date NOT NULL,
  submitted_date date,
  certified_date date,
  status text NOT NULL DEFAULT 'draft',
  contractor_name text,
  contract_number text,
  notes text,
  certified_by uuid REFERENCES public.profiles(user_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, pay_app_number)
);
ALTER TABLE public.pay_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation_pa" ON public.pay_applications FOR ALL
  USING (workspace_id = public.get_my_workspace_id());

-- Pay Application line items
CREATE TABLE IF NOT EXISTS public.pay_app_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_app_id uuid NOT NULL REFERENCES public.pay_applications(id) ON DELETE CASCADE,
  sov_line_item_id uuid NOT NULL REFERENCES public.sov_line_items(id) ON DELETE CASCADE,
  work_completed_previous numeric(12,2) NOT NULL DEFAULT 0,
  work_completed_this_period numeric(12,2) NOT NULL DEFAULT 0,
  materials_stored numeric(12,2) NOT NULL DEFAULT 0,
  certified_this_period numeric(12,2),
  retainage_pct_override numeric(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pay_app_id, sov_line_item_id)
);
ALTER TABLE public.pay_app_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation_pali" ON public.pay_app_line_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.pay_applications pa
      WHERE pa.id = pay_app_id AND pa.workspace_id = public.get_my_workspace_id()
    )
  );

-- Lien waivers table
CREATE TABLE IF NOT EXISTS public.lien_waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_app_id uuid NOT NULL REFERENCES public.pay_applications(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  waiver_type text NOT NULL,
  amount numeric(12,2),
  through_date date,
  received_date date,
  file_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.lien_waivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation_lw" ON public.lien_waivers FOR ALL
  USING (workspace_id = public.get_my_workspace_id());

-- Indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_sov_line_items_project ON public.sov_line_items(project_id);
CREATE INDEX IF NOT EXISTS idx_sov_line_items_workspace ON public.sov_line_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pay_applications_project ON public.pay_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_pay_applications_workspace ON public.pay_applications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pay_app_line_items_pay_app ON public.pay_app_line_items(pay_app_id);
CREATE INDEX IF NOT EXISTS idx_pay_app_line_items_sov ON public.pay_app_line_items(sov_line_item_id);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_pay_app ON public.lien_waivers(pay_app_id);
