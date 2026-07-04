-- Environmental Compliance — Regulatory correspondence. Draft an agency letter,
-- route it for sign-off, mark it submitted, and keep the timestamped trail.
-- Project-scoped (an engagement's letters), tenant-isolated.
CREATE TABLE IF NOT EXISTS public.compliance_correspondence (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  letter_type       text NOT NULL DEFAULT 'general', -- regulatory_notice | response | transmittal | request | general
  subject           text NOT NULL,
  agency            text,
  recipient         text,
  recipient_address text,
  reference_no      text,
  body              text,
  status            text NOT NULL DEFAULT 'draft',   -- draft | signed | submitted
  signed_by         text,
  signed_at         timestamptz,
  submitted_at      timestamptz,
  submission_method text,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compliance_correspondence_project_idx ON public.compliance_correspondence (project_id);

ALTER TABLE public.compliance_correspondence ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_correspondence_tenant ON public.compliance_correspondence
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- AI drafting skill (model selectable in Settings → AI Skills)
INSERT INTO public.ai_skill_prompts (skill_key, display_name, description, system_prompt, model, is_active)
VALUES ('compliance_letter', 'Regulatory letter', 'Drafts a formal agency/regulatory letter', '', 'claude-sonnet-4-6', true)
ON CONFLICT (skill_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
