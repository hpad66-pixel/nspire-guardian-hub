-- =====================================================
-- ENTERPRISE ENHANCEMENT MIGRATION
-- Email Categorization + Work Order Workflow + Comments
-- =====================================================

-- PART 1: Email Categorization
-- Add source module and linking columns to report_emails
ALTER TABLE report_emails ADD COLUMN IF NOT EXISTS source_module TEXT;
ALTER TABLE report_emails ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id);
ALTER TABLE report_emails ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
ALTER TABLE report_emails ADD COLUMN IF NOT EXISTS work_order_id UUID REFERENCES work_orders(id);

-- Create index for filtering by source module
CREATE INDEX IF NOT EXISTS idx_report_emails_source_module ON report_emails(source_module);
CREATE INDEX IF NOT EXISTS idx_report_emails_property ON report_emails(property_id);

-- PART 2: Work Order Workflow Enhancement
-- Add new status values to enum
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'pending_approval' AFTER 'draft';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'pending_approval';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'closed' AFTER 'verified';

-- Add workflow columns to work_orders table
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS rejected_by UUID;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS actual_cost NUMERIC;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS closed_by UUID;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS work_order_number SERIAL;

-- PART 3: Work Order Comments for threaded communication
CREATE TABLE IF NOT EXISTS work_order_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on work_order_comments
ALTER TABLE work_order_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for work_order_comments
DROP POLICY IF EXISTS "Authenticated users can view work order comments" ON work_order_comments;
CREATE POLICY "Authenticated users can view work order comments"
  ON work_order_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can create comments" ON work_order_comments;
CREATE POLICY "Users can create comments"
  ON work_order_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON work_order_comments;
CREATE POLICY "Users can update own comments"
  ON work_order_comments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON work_order_comments;
CREATE POLICY "Users can delete own comments"
  ON work_order_comments FOR DELETE
  USING (auth.uid() = user_id);

-- PART 4: Work Order Activity Log
CREATE TABLE IF NOT EXISTS work_order_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on work_order_activity
ALTER TABLE work_order_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies for work_order_activity
DROP POLICY IF EXISTS "Authenticated users can view work order activity" ON work_order_activity;
CREATE POLICY "Authenticated users can view work order activity"
  ON work_order_activity FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert activity" ON work_order_activity;
CREATE POLICY "Authenticated users can insert activity"
  ON work_order_activity FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_wo_comments_work_order ON work_order_comments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_activity_work_order ON work_order_activity(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON work_orders(created_by);

-- Update trigger for work_order_comments
CREATE TRIGGER update_work_order_comments_updated_at
  BEFORE UPDATE ON work_order_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();