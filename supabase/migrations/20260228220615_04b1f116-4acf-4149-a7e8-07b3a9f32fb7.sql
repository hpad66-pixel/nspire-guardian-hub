
-- Saved report configurations
CREATE TABLE IF NOT EXISTS saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by uuid,
  name text NOT NULL,
  description text,
  report_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  is_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace isolation" ON saved_reports FOR ALL
  USING (workspace_id = public.get_my_workspace_id());

-- Scheduled report deliveries
CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  saved_report_id uuid NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
  frequency text NOT NULL,
  day_of_week integer,
  day_of_month integer,
  recipient_emails text[] NOT NULL DEFAULT '{}',
  subject_template text,
  last_sent_at timestamptz,
  next_send_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Validation trigger for frequency
CREATE OR REPLACE FUNCTION public.validate_report_schedule_frequency()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.frequency NOT IN ('daily','weekly','biweekly','monthly') THEN
    RAISE EXCEPTION 'Invalid frequency: %', NEW.frequency;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_report_schedule_frequency
  BEFORE INSERT OR UPDATE ON report_schedules
  FOR EACH ROW EXECUTE FUNCTION validate_report_schedule_frequency();

ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace isolation" ON report_schedules FOR ALL
  USING (workspace_id = public.get_my_workspace_id());

-- Report delivery log
CREATE TABLE IF NOT EXISTS report_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES report_schedules(id) ON DELETE SET NULL,
  saved_report_id uuid REFERENCES saved_reports(id) ON DELETE SET NULL,
  workspace_id uuid NOT NULL,
  sent_to text[] NOT NULL,
  sent_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  error_message text
);

CREATE OR REPLACE FUNCTION public.validate_delivery_log_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('sent','failed') THEN
    RAISE EXCEPTION 'Invalid delivery status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_delivery_log_status
  BEFORE INSERT OR UPDATE ON report_delivery_log
  FOR EACH ROW EXECUTE FUNCTION validate_delivery_log_status();

ALTER TABLE report_delivery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace isolation" ON report_delivery_log FOR ALL
  USING (workspace_id = public.get_my_workspace_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_reports_workspace ON saved_reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_workspace ON report_schedules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_saved_report ON report_schedules(saved_report_id);
CREATE INDEX IF NOT EXISTS idx_report_delivery_log_workspace ON report_delivery_log(workspace_id);
