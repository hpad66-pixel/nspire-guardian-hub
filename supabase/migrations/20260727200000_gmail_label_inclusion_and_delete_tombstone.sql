-- Two real gaps closed (PR3r):
--
-- 1. gmail-sync never used Gmail LABELS as an inclusion signal — only domains and
--    keywords. A manually-labeled email (e.g. an all-internal @apas.ai thread with
--    no external party at all) could never be found, since it has no matching
--    domain. gmail_label_name (the exact label text, needed for Gmail's `label:`
--    search operator — distinct from gmail_label_id, which is the internal id
--    needed for the *write* path, modifyThreadLabels) lets a project be found by
--    "anything with this label", independent of domain/keyword matching.
--
-- 2. Deleting a synced message from the app only removed the project_emails row —
--    nothing stopped the NEXT sync from re-importing the exact same message,
--    since "seen" was computed purely from what's currently in project_emails.
--    correspondence_deleted_messages is a tombstone: gmail-sync excludes any
--    message id recorded here, permanently, the same way it already skips
--    messages already present.
ALTER TABLE public.correspondence_settings ADD COLUMN IF NOT EXISTS gmail_label_name text;

CREATE TABLE IF NOT EXISTS public.correspondence_deleted_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  gmail_message_id text NOT NULL,
  deleted_at       timestamptz NOT NULL DEFAULT now(),
  deleted_by       uuid,
  UNIQUE (project_id, gmail_message_id)
);
ALTER TABLE public.correspondence_deleted_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY correspondence_deleted_messages_tenant ON public.correspondence_deleted_messages
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Backfill the exact label names for the four already-created labels (needed for
-- the search-by-label read path; gmail_label_id already existed for the write path).
UPDATE public.correspondence_settings SET gmail_label_name = 'Projects/Glorieta/Water'                       WHERE project_id = '9420b571-3383-4bd0-a64f-096634dd1ade';
UPDATE public.correspondence_settings SET gmail_label_name = 'Projects/Larkin-MRI/Contamination-Stormwater'  WHERE project_id = '332ee1d6-b165-4893-bd25-c31a212e206e';
UPDATE public.correspondence_settings SET gmail_label_name = 'Projects/COOL-PWD/Public-Works'                WHERE project_id = '72c7ce60-d9b8-46d3-ba7d-c1e9a6f02f47';
UPDATE public.correspondence_settings SET gmail_label_name = 'Projects/Sewer-Ext/Sewer-Stormwater'           WHERE project_id = '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';

NOTIFY pgrst, 'reload schema';
