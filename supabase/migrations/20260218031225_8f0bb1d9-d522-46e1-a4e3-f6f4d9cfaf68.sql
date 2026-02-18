
-- Add unlock_requested status to project_meetings
ALTER TABLE public.project_meetings 
  ADD COLUMN IF NOT EXISTS unlock_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlock_requested_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS unlock_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS unlock_request_reason text;

-- Create meeting unlock requests table for supervisor approval workflow
CREATE TABLE IF NOT EXISTS public.meeting_unlock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.project_meetings(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_unlock_requests ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view unlock requests for meetings they can see
CREATE POLICY "Authenticated users can view unlock requests"
  ON public.meeting_unlock_requests FOR SELECT
  TO authenticated
  USING (true);

-- Users can create their own unlock requests
CREATE POLICY "Users can create unlock requests"
  ON public.meeting_unlock_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Admins, owners and managers can update (approve/reject) requests
CREATE POLICY "Supervisors can review unlock requests"
  ON public.meeting_unlock_requests FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Trigger for updated_at
CREATE TRIGGER update_meeting_unlock_requests_updated_at
  BEFORE UPDATE ON public.meeting_unlock_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
