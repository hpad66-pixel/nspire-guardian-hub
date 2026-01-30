-- Create enums for work orders and projects
CREATE TYPE public.work_order_priority AS ENUM ('emergency', 'routine');
CREATE TYPE public.work_order_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'verified');
CREATE TYPE public.project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'closed');
CREATE TYPE public.change_order_status AS ENUM ('draft', 'pending', 'approved', 'rejected');

-- Create storage bucket for inspection photos
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-photos', 'inspection-photos', true);

-- Storage policies for inspection photos
CREATE POLICY "Anyone can view inspection photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'inspection-photos');

CREATE POLICY "Authenticated users can upload inspection photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'inspection-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inspection-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Work Orders Table
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID REFERENCES public.defects(id) ON DELETE SET NULL,
  issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority work_order_priority NOT NULL DEFAULT 'routine',
  status work_order_status NOT NULL DEFAULT 'pending',
  assigned_to UUID,
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  proof_photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view work orders"
ON public.work_orders FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins and managers can create work orders"
ON public.work_orders FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'inspector'));

CREATE POLICY "Admins managers and assignees can update work orders"
ON public.work_orders FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR assigned_to = auth.uid());

CREATE POLICY "Admins can delete work orders"
ON public.work_orders FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_work_orders_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Projects Table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT,
  status project_status NOT NULL DEFAULT 'planning',
  budget DECIMAL(12, 2),
  spent DECIMAL(12, 2) DEFAULT 0,
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projects"
ON public.projects FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins and managers can create projects"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can update projects"
ON public.projects FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete projects"
ON public.projects FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Project Milestones Table
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view milestones"
ON public.project_milestones FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins and managers can manage milestones"
ON public.project_milestones FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE TRIGGER update_milestones_updated_at
BEFORE UPDATE ON public.project_milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily Reports Table
CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather TEXT,
  work_performed TEXT NOT NULL,
  workers_count INTEGER DEFAULT 0,
  issues_encountered TEXT,
  photos TEXT[] DEFAULT '{}',
  submitted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view daily reports"
ON public.daily_reports FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create daily reports"
ON public.daily_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Submitters can update their reports"
ON public.daily_reports FOR UPDATE TO authenticated
USING (auth.uid() = submitted_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Change Orders Table
CREATE TABLE public.change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status change_order_status NOT NULL DEFAULT 'draft',
  requested_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view change orders"
ON public.change_orders FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create change orders"
ON public.change_orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Admins and managers can update change orders"
ON public.change_orders FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR auth.uid() = requested_by);

CREATE TRIGGER update_change_orders_updated_at
BEFORE UPDATE ON public.change_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate NSPIRE deadline based on severity
CREATE OR REPLACE FUNCTION public.calculate_nspire_deadline(p_severity severity_level)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_severity
    WHEN 'severe' THEN RETURN CURRENT_DATE + INTERVAL '1 day';
    WHEN 'moderate' THEN RETURN CURRENT_DATE + INTERVAL '30 days';
    WHEN 'low' THEN RETURN CURRENT_DATE + INTERVAL '60 days';
    ELSE RETURN CURRENT_DATE + INTERVAL '60 days';
  END CASE;
END;
$$;

-- Trigger function to auto-create issue and work order from defect
CREATE OR REPLACE FUNCTION public.create_issue_from_defect()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inspection RECORD;
  v_issue_id UUID;
  v_work_order_priority work_order_priority;
BEGIN
  -- Get inspection details
  SELECT * INTO v_inspection FROM public.inspections WHERE id = NEW.inspection_id;
  
  -- Create issue linked to the defect
  INSERT INTO public.issues (
    property_id,
    unit_id,
    defect_id,
    source_module,
    area,
    severity,
    deadline,
    proof_required,
    title,
    description,
    status
  ) VALUES (
    v_inspection.property_id,
    v_inspection.unit_id,
    NEW.id,
    'nspire',
    v_inspection.area,
    NEW.severity,
    NEW.repair_deadline,
    NEW.proof_required,
    NEW.item_name || ' - ' || NEW.defect_condition,
    'NSPIRE defect found: ' || NEW.category || ' > ' || NEW.item_name || '. Condition: ' || NEW.defect_condition,
    'open'
  ) RETURNING id INTO v_issue_id;
  
  -- Determine work order priority
  IF NEW.severity = 'severe' THEN
    v_work_order_priority := 'emergency';
  ELSE
    v_work_order_priority := 'routine';
  END IF;
  
  -- Create work order
  INSERT INTO public.work_orders (
    defect_id,
    issue_id,
    property_id,
    unit_id,
    title,
    description,
    priority,
    due_date
  ) VALUES (
    NEW.id,
    v_issue_id,
    v_inspection.property_id,
    v_inspection.unit_id,
    'Repair: ' || NEW.item_name,
    'Defect condition: ' || NEW.defect_condition || '. Category: ' || NEW.category || '. Notes: ' || COALESCE(NEW.notes, 'None'),
    v_work_order_priority,
    NEW.repair_deadline
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on defects table
CREATE TRIGGER trigger_create_issue_from_defect
AFTER INSERT ON public.defects
FOR EACH ROW
EXECUTE FUNCTION public.create_issue_from_defect();