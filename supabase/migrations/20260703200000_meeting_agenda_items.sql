-- Structured, trackable consulting meeting-agenda items (one agenda per meeting).
-- NOTE: named consulting_agenda_items to avoid collision with the C5 construction
-- module's existing public.meeting_agenda_items table.
CREATE TABLE IF NOT EXISTS public.consulting_agenda_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id     uuid NOT NULL REFERENCES public.consulting_meetings(id) ON DELETE CASCADE,
  project_id     uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  action_item_id uuid REFERENCES public.project_action_items(id) ON DELETE SET NULL,
  category       text NOT NULL DEFAULT 'discussion',  -- overdue | due | open | objective | decision | next_step | update | discussion
  title          text NOT NULL,
  description    text,
  owner_name     text,
  due_date       date,
  discussed      boolean NOT NULL DEFAULT false,
  sort_order     integer NOT NULL DEFAULT 0,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consulting_agenda_items_meeting_idx ON public.consulting_agenda_items (meeting_id, sort_order);

ALTER TABLE public.consulting_agenda_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS consulting_agenda_items_tenant ON public.consulting_agenda_items;
CREATE POLICY consulting_agenda_items_tenant ON public.consulting_agenda_items FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

NOTIFY pgrst, 'reload schema';
