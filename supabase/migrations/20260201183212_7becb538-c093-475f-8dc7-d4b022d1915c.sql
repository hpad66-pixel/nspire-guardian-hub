-- Create permit types enum
CREATE TYPE permit_type AS ENUM (
  'building_permit', 'occupancy_certificate', 'fire_safety', 
  'elevator', 'pool', 'boiler', 'environmental', 
  'hud_compliance', 'ada', 'other'
);

-- Create requirement types enum
CREATE TYPE requirement_type AS ENUM (
  'inspection', 'report', 'certification', 
  'filing', 'payment', 'training', 'other'
);

-- Create frequency enum
CREATE TYPE requirement_frequency AS ENUM (
  'one_time', 'monthly', 'quarterly', 'semi_annual', 
  'annual', 'biennial', 'as_needed'
);

-- Create permit status enum
CREATE TYPE permit_status AS ENUM (
  'draft', 'active', 'expired', 'renewed', 'revoked'
);

-- Create requirement status enum
CREATE TYPE requirement_status AS ENUM (
  'pending', 'in_progress', 'compliant', 'non_compliant', 'waived'
);

-- Create deliverable status enum
CREATE TYPE deliverable_status AS ENUM (
  'pending', 'submitted', 'approved', 'rejected', 'overdue'
);

-- Add 'permits' to issue_source enum
ALTER TYPE issue_source ADD VALUE IF NOT EXISTS 'permits';

-- Permits table
CREATE TABLE permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  permit_type permit_type NOT NULL,
  permit_number TEXT,
  name TEXT NOT NULL,
  description TEXT,
  issuing_authority TEXT,
  issue_date DATE,
  expiry_date DATE,
  status permit_status NOT NULL DEFAULT 'draft',
  document_id UUID REFERENCES organization_documents(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permit requirements table
CREATE TABLE permit_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  requirement_type requirement_type NOT NULL,
  frequency requirement_frequency NOT NULL DEFAULT 'annual',
  start_date DATE,
  end_date DATE,
  status requirement_status NOT NULL DEFAULT 'pending',
  next_due_date DATE,
  last_completed_date DATE,
  responsible_user_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permit deliverables table
CREATE TABLE permit_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES permit_requirements(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  submitted_at TIMESTAMPTZ,
  status deliverable_status NOT NULL DEFAULT 'pending',
  document_id UUID REFERENCES organization_documents(id) ON DELETE SET NULL,
  submitted_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_permits_property ON permits(property_id);
CREATE INDEX idx_permits_status ON permits(status);
CREATE INDEX idx_permits_expiry ON permits(expiry_date);
CREATE INDEX idx_permits_type ON permits(permit_type);
CREATE INDEX idx_requirements_permit ON permit_requirements(permit_id);
CREATE INDEX idx_requirements_due ON permit_requirements(next_due_date);
CREATE INDEX idx_requirements_status ON permit_requirements(status);
CREATE INDEX idx_deliverables_requirement ON permit_deliverables(requirement_id);
CREATE INDEX idx_deliverables_due ON permit_deliverables(due_date);
CREATE INDEX idx_deliverables_status ON permit_deliverables(status);

-- Enable RLS
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_deliverables ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permits
CREATE POLICY "Authenticated users can view permits" ON permits
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can create permits" ON permits
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update permits" ON permits
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete permits" ON permits
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for permit_requirements
CREATE POLICY "Authenticated users can view requirements" ON permit_requirements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can create requirements" ON permit_requirements
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update requirements" ON permit_requirements
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete requirements" ON permit_requirements
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for permit_deliverables
CREATE POLICY "Authenticated users can view deliverables" ON permit_deliverables
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create deliverables" ON permit_deliverables
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins managers and submitters can update deliverables" ON permit_deliverables
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    submitted_by = auth.uid()
  );

CREATE POLICY "Admins can delete deliverables" ON permit_deliverables
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_permits_updated_at BEFORE UPDATE ON permits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON permit_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON permit_deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger function to create issue on deliverable becoming overdue
CREATE OR REPLACE FUNCTION create_issue_from_permit_noncompliance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permit RECORD;
  v_requirement RECORD;
BEGIN
  -- When deliverable becomes overdue
  IF NEW.status = 'overdue' AND (OLD.status IS NULL OR OLD.status != 'overdue') THEN
    -- Get requirement and permit details
    SELECT * INTO v_requirement FROM permit_requirements WHERE id = NEW.requirement_id;
    SELECT * INTO v_permit FROM permits WHERE id = v_requirement.permit_id;
    
    -- Create issue
    INSERT INTO issues (
      property_id, 
      source_module, 
      severity, 
      deadline,
      title, 
      description, 
      status,
      created_by
    ) VALUES (
      v_permit.property_id, 
      'permits', 
      'moderate',
      NEW.due_date + INTERVAL '7 days',
      v_permit.name || ' - ' || NEW.title || ' Overdue',
      'Permit deliverable is overdue and requires immediate attention. Permit: ' || v_permit.name || ', Requirement: ' || v_requirement.title,
      'open',
      NEW.submitted_by
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for deliverable status changes
CREATE TRIGGER trigger_permit_deliverable_overdue
  AFTER UPDATE OF status ON permit_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION create_issue_from_permit_noncompliance();