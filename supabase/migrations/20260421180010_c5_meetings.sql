-- ============================================================
-- C5 · Meetings — templates, agenda, attendees, action items.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meeting_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  default_agenda jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- project_meetings may already exist; only ALTER if so, otherwise create minimal skeleton.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'project_meetings' AND relnamespace = 'public'::regnamespace) THEN
    CREATE TABLE public.project_meetings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      title text NOT NULL,
      scheduled_at timestamptz,
      created_by uuid REFERENCES auth.users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE public.project_meetings ENABLE ROW LEVEL SECURITY;
    CREATE POLICY pm_tenant ON public.project_meetings FOR ALL TO authenticated
      USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
      WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
  END IF;
END $$;

ALTER TABLE public.project_meetings
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.meeting_templates(id),
  ADD COLUMN IF NOT EXISTS meeting_type text,
  ADD COLUMN IF NOT EXISTS series_id uuid,
  ADD COLUMN IF NOT EXISTS distribution_list_id uuid REFERENCES public.distribution_lists(id),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';

CREATE TABLE IF NOT EXISTS public.meeting_agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.project_meetings(id) ON DELETE CASCADE,
  sort_order int NOT NULL,
  title text NOT NULL,
  category text,
  discussion text,
  decision text,
  presenter_id uuid REFERENCES auth.users(id),
  is_carryover boolean NOT NULL DEFAULT false,
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.project_meetings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  contact_id uuid REFERENCES public.crm_contacts(id),
  attended boolean NOT NULL DEFAULT false,
  sign_in_at timestamptz,
  UNIQUE (meeting_id, user_id, contact_id)
);

CREATE TABLE IF NOT EXISTS public.meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_item_id uuid NOT NULL REFERENCES public.meeting_agenda_items(id) ON DELETE CASCADE,
  description text NOT NULL,
  assignee_id uuid REFERENCES auth.users(id),
  due_date date,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_tenant ON public.meeting_templates FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY mai_via_meeting ON public.meeting_agenda_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_meetings m WHERE m.id = meeting_agenda_items.meeting_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.project_meetings m WHERE m.id = meeting_agenda_items.meeting_id));

CREATE POLICY matt_via_meeting ON public.meeting_attendees FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_meetings m WHERE m.id = meeting_attendees.meeting_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.project_meetings m WHERE m.id = meeting_attendees.meeting_id));

CREATE POLICY mact_via_agenda ON public.meeting_action_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meeting_agenda_items a WHERE a.id = meeting_action_items.agenda_item_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.meeting_agenda_items a WHERE a.id = meeting_action_items.agenda_item_id));
