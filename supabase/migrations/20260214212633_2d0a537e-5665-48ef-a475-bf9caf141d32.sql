
-- =============================================
-- NEW PROJECT FEATURES: Safety, Procurement, Progress, Closeout
-- =============================================

-- 1. Safety Incidents
CREATE TABLE public.project_safety_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_type TEXT NOT NULL DEFAULT 'near_miss',
  severity TEXT NOT NULL DEFAULT 'minor',
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  injured_party TEXT,
  witnesses TEXT,
  corrective_action TEXT,
  osha_recordable BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open',
  reported_by TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_safety_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage safety incidents" ON public.project_safety_incidents FOR ALL USING (auth.uid() IS NOT NULL);

-- 2. Toolbox Talks
CREATE TABLE public.project_toolbox_talks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  talk_date DATE NOT NULL DEFAULT CURRENT_DATE,
  topic TEXT NOT NULL,
  description TEXT,
  presenter TEXT,
  attendees TEXT[] DEFAULT '{}',
  duration_minutes INTEGER,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_toolbox_talks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage toolbox talks" ON public.project_toolbox_talks FOR ALL USING (auth.uid() IS NOT NULL);

-- 3. Purchase Orders
CREATE TABLE public.project_purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  po_number SERIAL,
  vendor_name TEXT NOT NULL,
  vendor_contact TEXT,
  description TEXT,
  line_items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  order_date DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage purchase orders" ON public.project_purchase_orders FOR ALL USING (auth.uid() IS NOT NULL);

-- 4. Progress Tracking (per trade/scope)
CREATE TABLE public.project_progress_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  trade TEXT NOT NULL,
  scope_description TEXT,
  percent_complete NUMERIC DEFAULT 0,
  planned_value NUMERIC DEFAULT 0,
  earned_value NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  notes TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_progress_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage progress entries" ON public.project_progress_entries FOR ALL USING (auth.uid() IS NOT NULL);

-- 5. Warranty Tracking
CREATE TABLE public.project_warranties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  vendor TEXT,
  warranty_type TEXT DEFAULT 'standard',
  start_date DATE,
  end_date DATE,
  duration_months INTEGER,
  coverage_details TEXT,
  contact_info TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_warranties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage warranties" ON public.project_warranties FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. Closeout Checklist
CREATE TABLE public.project_closeout_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  due_date DATE,
  document_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_closeout_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage closeout items" ON public.project_closeout_items FOR ALL USING (auth.uid() IS NOT NULL);

-- 7. Lessons Learned
CREATE TABLE public.project_lessons_learned (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  what_happened TEXT,
  impact TEXT,
  lesson TEXT,
  recommendation TEXT,
  submitted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_lessons_learned ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage lessons learned" ON public.project_lessons_learned FOR ALL USING (auth.uid() IS NOT NULL);

-- Add milestones dependency columns for Gantt
ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS depends_on UUID REFERENCES public.project_milestones(id);
ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS progress_percent NUMERIC DEFAULT 0;
ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS color TEXT;

-- Triggers for updated_at
CREATE TRIGGER update_safety_incidents_updated_at BEFORE UPDATE ON public.project_safety_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_toolbox_talks_updated_at BEFORE UPDATE ON public.project_toolbox_talks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.project_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_progress_entries_updated_at BEFORE UPDATE ON public.project_progress_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_warranties_updated_at BEFORE UPDATE ON public.project_warranties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_closeout_items_updated_at BEFORE UPDATE ON public.project_closeout_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_learned_updated_at BEFORE UPDATE ON public.project_lessons_learned FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
