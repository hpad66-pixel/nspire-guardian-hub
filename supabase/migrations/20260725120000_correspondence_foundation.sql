-- Correspondence foundation — per-project email/letter trail for consulting
-- engagements (e.g. Loreato water meters with R4 + City of Opa-Locka).
--   • gmail_connections     — a user's Gmail OAuth token (OUTBOUND secret, edge-only)
--   • project_emails        — the correspondence timeline (inbound synced + outbound sent/drafts)
--   • correspondence_templates — reusable branded letter templates (e.g. "R4 letter")
-- Inbound sync + OAuth wiring land in later PRs; this is the schema + audit trail.

-- ── Gmail connection ─────────────────────────────────────────────────────────
-- Modeled on clickup_connections: the refresh token is an OUTBOUND secret — it
-- must stay server-side (edge functions call Gmail with it) and must NEVER reach
-- the browser. RLS is ON with NO policy for `authenticated`, so only the service
-- role (which bypasses RLS) can read it. The UI learns connected status + the
-- connected address via a gmail-status edge function, never the token.
-- Revocation is a row delete (gmail-disconnect).
CREATE TABLE IF NOT EXISTS public.gmail_connections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email             text NOT NULL,               -- connected Gmail address (e.g. hardeep@apas.ai)
  refresh_token     text NOT NULL,               -- outbound secret, plaintext, edge-only
  access_token      text,                        -- short-lived cache
  token_expires_at  timestamptz,
  scopes            text,
  history_id        text,                         -- Gmail historyId for incremental sync
  last_synced_at    timestamptz,
  status            text NOT NULL DEFAULT 'active', -- active | revoked | error
  last_error        text,
  connected_by      uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policy for authenticated: the browser can never touch this row.

-- ── Correspondence timeline ─────────────────────────────────────────────────
-- Every inbound (synced from Gmail) and outbound (drafted/sent) message for a
-- project. Tenant-isolated; drives the per-project Correspondence tab + audit trail.
CREATE TABLE IF NOT EXISTS public.project_emails (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  direction         text NOT NULL DEFAULT 'inbound',  -- inbound | outbound
  status            text NOT NULL DEFAULT 'received',  -- received | draft | sent | signed
  channel           text NOT NULL DEFAULT 'gmail',     -- gmail | resend | manual
  gmail_thread_id   text,
  gmail_message_id  text,
  in_reply_to       text,
  subject           text,
  from_email        text,
  from_name         text,
  to_emails         text[] NOT NULL DEFAULT '{}',
  cc_emails         text[] NOT NULL DEFAULT '{}',
  snippet           text,
  body_html         text,
  body_text         text,
  has_attachments   boolean NOT NULL DEFAULT false,
  attachments       jsonb NOT NULL DEFAULT '[]',       -- [{filename,mimeType,size,gmail_attachment_id,storage_path}]
  labels            text[] NOT NULL DEFAULT '{}',
  contact_id        uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  template_id       uuid,  -- FK added after correspondence_templates is created (below)
  occurred_at       timestamptz NOT NULL DEFAULT now(),  -- sent/received time (timeline order)
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_emails_project_idx ON public.project_emails (project_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS project_emails_thread_idx  ON public.project_emails (gmail_thread_id);
-- Dedupe synced Gmail messages per tenant (outbound drafts have a null message id → not constrained).
CREATE UNIQUE INDEX IF NOT EXISTS project_emails_gmail_msg_uniq
  ON public.project_emails (tenant_id, gmail_message_id) WHERE gmail_message_id IS NOT NULL;

ALTER TABLE public.project_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_emails_tenant ON public.project_emails
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ── Correspondence templates ────────────────────────────────────────────────
-- Reusable branded letter templates (project-scoped or workspace-wide).
CREATE TABLE IF NOT EXISTS public.correspondence_templates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id        uuid REFERENCES public.projects(id) ON DELETE CASCADE, -- null = workspace-wide
  name              text NOT NULL,
  category          text NOT NULL DEFAULT 'general',   -- r4 | city | transmittal | general
  subject_template  text,
  body_template     text,                               -- HTML with {{placeholders}}
  recipient         text,
  recipient_address text,
  letterhead        text NOT NULL DEFAULT 'APAS',
  is_active         boolean NOT NULL DEFAULT true,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS correspondence_templates_project_idx ON public.correspondence_templates (project_id);

-- Now that correspondence_templates exists, wire the deferred FK from project_emails.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_emails_template_fk') THEN
    ALTER TABLE public.project_emails
      ADD CONSTRAINT project_emails_template_fk
      FOREIGN KEY (template_id) REFERENCES public.correspondence_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.correspondence_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY correspondence_templates_tenant ON public.correspondence_templates
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- AI drafting skill for the correspondence composer (PR2 uses it; model selectable
-- in Settings → AI Skills). Registered now so it's tunable from day one.
INSERT INTO public.ai_skill_prompts (skill_key, display_name, description, system_prompt, model, is_active)
VALUES ('correspondence_draft', 'Project correspondence', 'Drafts a branded project letter/email from context and prior thread', '', 'claude-sonnet-4-6', true)
ON CONFLICT (skill_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
