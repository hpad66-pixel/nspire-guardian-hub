-- Create maintenance_requests table for voice-initiated requests
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ticket Identification (auto-generated sequence)
  ticket_number SERIAL UNIQUE,
  
  -- Caller Information
  caller_name TEXT NOT NULL,
  caller_phone TEXT NOT NULL,
  caller_email TEXT,
  caller_unit_number TEXT,
  
  -- Property Mapping
  property_id UUID REFERENCES public.properties(id),
  unit_id UUID REFERENCES public.units(id),
  
  -- Issue Details (collected by voice agent)
  issue_category TEXT NOT NULL,
  issue_subcategory TEXT,
  issue_description TEXT NOT NULL,
  issue_location TEXT,
  
  -- Urgency & Priority
  urgency_level TEXT DEFAULT 'normal' CHECK (urgency_level IN ('emergency', 'urgent', 'normal', 'low')),
  is_emergency BOOLEAN DEFAULT false,
  
  -- Availability
  preferred_contact_time TEXT,
  preferred_access_time TEXT,
  has_pets BOOLEAN DEFAULT false,
  special_access_instructions TEXT,
  
  -- Voice Agent Data
  call_id TEXT,
  call_duration_seconds INTEGER,
  call_transcript TEXT,
  call_recording_url TEXT,
  call_started_at TIMESTAMPTZ,
  call_ended_at TIMESTAMPTZ,
  
  -- Workflow Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'assigned', 'in_progress', 'completed', 'closed')),
  
  -- Assignment
  assigned_to UUID,
  assigned_at TIMESTAMPTZ,
  assigned_by UUID,
  
  -- Resolution
  resolution_notes TEXT,
  resolution_photos TEXT[],
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  
  -- Work Order Link
  work_order_id UUID REFERENCES public.work_orders(id),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create voice_agent_config table
CREATE TABLE public.voice_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) UNIQUE,
  
  -- Agent Personality
  agent_name TEXT DEFAULT 'Alex',
  greeting_message TEXT,
  closing_message TEXT,
  
  -- Business Hours
  business_hours_start TIME DEFAULT '08:00',
  business_hours_end TIME DEFAULT '18:00',
  after_hours_message TEXT,
  
  -- Emergency Keywords
  emergency_keywords TEXT[] DEFAULT ARRAY['flood', 'fire', 'gas leak', 'no heat', 'no water', 'broken window', 'security'],
  
  -- Issue Categories
  issue_categories JSONB DEFAULT '[
    {"id": "plumbing", "label": "Plumbing", "subcategories": ["leak", "clog", "toilet", "faucet", "water heater"]},
    {"id": "electrical", "label": "Electrical", "subcategories": ["outlet", "light", "breaker", "switch"]},
    {"id": "hvac", "label": "Heating/Cooling", "subcategories": ["no heat", "no ac", "thermostat", "noise"]},
    {"id": "appliance", "label": "Appliances", "subcategories": ["refrigerator", "stove", "dishwasher", "washer", "dryer"]},
    {"id": "structural", "label": "Structural", "subcategories": ["door", "window", "lock", "floor", "ceiling"]},
    {"id": "pest", "label": "Pest Control", "subcategories": ["insects", "rodents", "wildlife"]},
    {"id": "other", "label": "Other", "subcategories": []}
  ]'::jsonb,
  
  -- Knowledge Base
  knowledge_base JSONB DEFAULT '[]'::jsonb,
  
  -- Notification Settings
  supervisor_notification_emails TEXT[],
  emergency_notification_phone TEXT,
  
  -- Analytics
  calls_handled INTEGER DEFAULT 0,
  avg_call_duration_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create maintenance_request_activity table
CREATE TABLE public.maintenance_request_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_request_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_requests
CREATE POLICY "Authenticated users can view maintenance requests"
ON public.maintenance_requests FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Edge functions can create requests"
ON public.maintenance_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Assigned users and admins can update requests"
ON public.maintenance_requests FOR UPDATE
USING (
  auth.uid() = assigned_to OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'project_manager')
);

CREATE POLICY "Admins can delete requests"
ON public.maintenance_requests FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for voice_agent_config
CREATE POLICY "Authenticated users can view config"
ON public.voice_agent_config FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage config"
ON public.voice_agent_config FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for maintenance_request_activity
CREATE POLICY "Authenticated users can view activity"
ON public.maintenance_request_activity FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert activity"
ON public.maintenance_request_activity FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_maintenance_requests_updated_at
BEFORE UPDATE ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voice_agent_config_updated_at
BEFORE UPDATE ON public.voice_agent_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to log maintenance request activity
CREATE OR REPLACE FUNCTION public.log_maintenance_request_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.maintenance_request_activity (request_id, user_id, action, details)
    VALUES (NEW.id, auth.uid(), 'created', jsonb_build_object('status', NEW.status, 'urgency', NEW.urgency_level));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.maintenance_request_activity (request_id, user_id, action, details)
      VALUES (NEW.id, auth.uid(), 'status_changed', jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
    END IF;
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.maintenance_request_activity (request_id, user_id, action, details)
      VALUES (NEW.id, auth.uid(), 'assigned', jsonb_build_object('assigned_to', NEW.assigned_to));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for activity logging
CREATE TRIGGER log_maintenance_request_changes
AFTER INSERT OR UPDATE ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION public.log_maintenance_request_activity();

-- Enable realtime for maintenance_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;