
-- Contractor registry
CREATE TABLE IF NOT EXISTS contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  email text,
  phone text,
  license_number text,
  license_expiry date,
  insurance_expiry date,
  trade text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_contractor_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active','inactive','suspended') THEN
    RAISE EXCEPTION 'Invalid contractor status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_contractor_status
  BEFORE INSERT OR UPDATE ON contractors
  FOR EACH ROW EXECUTE FUNCTION validate_contractor_status();

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace isolation" ON contractors FOR ALL
  USING (workspace_id = public.get_my_workspace_id());

-- Link pay_applications to contractor registry
ALTER TABLE pay_applications ADD COLUMN IF NOT EXISTS contractor_id uuid REFERENCES contractors(id);

-- Link work_orders to contractor registry
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS contractor_id uuid REFERENCES contractors(id);

-- Contractor performance snapshot
CREATE TABLE IF NOT EXISTS contractor_performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  total_work_orders integer DEFAULT 0,
  completed_on_time integer DEFAULT 0,
  completed_late integer DEFAULT 0,
  open_work_orders integer DEFAULT 0,
  total_punch_items integer DEFAULT 0,
  punch_items_resolved integer DEFAULT 0,
  total_pay_apps integer DEFAULT 0,
  pay_apps_disputed integer DEFAULT 0,
  total_certified_amount numeric(12,2) DEFAULT 0,
  avg_days_to_complete numeric(6,2),
  defect_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE contractor_performance_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace isolation" ON contractor_performance_snapshots FOR ALL
  USING (workspace_id = public.get_my_workspace_id());

-- Indexes for FK lookups
CREATE INDEX IF NOT EXISTS idx_contractors_workspace ON contractors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_contractor ON work_orders(contractor_id);
CREATE INDEX IF NOT EXISTS idx_pay_applications_contractor ON pay_applications(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_perf_contractor ON contractor_performance_snapshots(contractor_id);
