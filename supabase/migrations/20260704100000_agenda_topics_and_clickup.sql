-- Agenda upgrade: AI groups items under free-text topics (not just urgency
-- buckets), and each meeting keeps ONE ClickUp agenda task it updates in place
-- (so re-pushing doesn't clutter the list with duplicates).
ALTER TABLE public.consulting_agenda_items  ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE public.consulting_meetings      ADD COLUMN IF NOT EXISTS clickup_agenda_task_id text;

NOTIFY pgrst, 'reload schema';
