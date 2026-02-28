
-- Prompt 5: Escalation Rules & Log
CREATE TABLE escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  trigger_entity text NOT NULL CHECK (trigger_entity IN (
    'work_order', 'issue', 'compliance_event', 'risk', 
    'permit', 'inspection', 'regulatory_action_item'
  )),
  trigger_condition jsonb NOT NULL,
  delay_hours integer NOT NULL DEFAULT 2,
  notify_roles text[] DEFAULT '{}',
  notify_user_ids uuid[] DEFAULT '{}',
  notification_channel text[] DEFAULT '{"in_app"}',
  message_template text,
  resolution_condition jsonb,
  created_by uuid REFERENCES profiles(user_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE escalation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES escalation_rules(id) ON DELETE SET NULL,
  rule_name text,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_title text,
  notified_user_ids uuid[] DEFAULT '{}',
  notification_channels text[] DEFAULT '{}',
  fired_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  acknowledged_by uuid REFERENCES profiles(user_id),
  acknowledged_at timestamptz
);

ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can manage escalation_rules"
ON escalation_rules FOR ALL
USING (workspace_id = (SELECT get_my_workspace_id()))
WITH CHECK (workspace_id = (SELECT get_my_workspace_id()));

CREATE POLICY "workspace members can view escalation_log"
ON escalation_log FOR SELECT
USING (workspace_id = (SELECT get_my_workspace_id()));

CREATE POLICY "workspace members can insert escalation_log"
ON escalation_log FOR INSERT
WITH CHECK (workspace_id = (SELECT get_my_workspace_id()));

-- Prompt 6: Corrective Loop columns on issues and work_orders
ALTER TABLE issues ADD COLUMN IF NOT EXISTS linked_work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS corrective_action_required boolean DEFAULT false;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS corrective_deadline date;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS corrective_status text DEFAULT 'none';
ALTER TABLE issues ADD COLUMN IF NOT EXISTS verified_by uuid;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS verification_notes text;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS closure_photo_url text;

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS source_issue_id uuid REFERENCES issues(id) ON DELETE SET NULL;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS source_regulatory_action_id uuid;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS requires_verification boolean DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS verified_by uuid;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS verification_notes text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS closure_photos text[] DEFAULT '{}';
