-- Consulting meetings: minutes + transcript, with action items for that day
-- linked back to the meeting. Kept separate from the construction C5 meetings
-- module (agenda/templates/meeting_action_items) — this is the lightweight
-- advisory-engagement surface.

CREATE TABLE IF NOT EXISTS public.consulting_meetings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title         text NOT NULL DEFAULT 'Meeting',
  meeting_date  date NOT NULL DEFAULT current_date,
  attendees     text,
  minutes       text,
  transcript    text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consulting_meetings_project_idx ON public.consulting_meetings (project_id, meeting_date DESC);
ALTER TABLE public.consulting_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY consulting_meetings_tenant ON public.consulting_meetings FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Link action items to the meeting they came out of (additive, nullable).
ALTER TABLE public.project_action_items
  ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES public.consulting_meetings(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
