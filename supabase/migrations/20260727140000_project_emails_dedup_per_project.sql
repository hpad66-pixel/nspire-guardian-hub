-- Fix: message dedup must be scoped PER PROJECT, not tenant-wide (PR3o).
--
-- The same real person (R4, City of Opa-Locka, Bala/Eco Tech) legitimately sends
-- messages relevant to MULTIPLE projects — e.g. an Opa-Locka Public Works email can
-- belong to Glorieta's water dispute, the separate Sewer Ext Project, AND the
-- broader COOL PWD Projects engagement. gmail-sync's own dedup check ("seen") was
-- already scoped per project_id, but the actual database constraint was tenant-wide
-- on (tenant_id, gmail_message_id) — so importing the same message into a SECOND
-- project silently violated the constraint and killed that whole insert batch
-- (surfacing as "imported: 0" despite correct classification). A message needs to
-- be importable into every project it's genuinely relevant to.
DROP INDEX IF EXISTS public.project_emails_gmail_msg_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS project_emails_gmail_msg_uniq
  ON public.project_emails (tenant_id, project_id, gmail_message_id) WHERE gmail_message_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
