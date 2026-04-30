-- ============================================================
-- C1 · RFIs (field parity) — enhance existing project_rfis.
-- ============================================================

ALTER TABLE public.project_rfis
  ADD COLUMN IF NOT EXISTS rfi_number text,
  ADD COLUMN IF NOT EXISTS rfi_manager_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS responsible_contractor_org_id uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS received_from text,
  ADD COLUMN IF NOT EXISTS specification_section_id uuid REFERENCES public.specification_sections(id),
  ADD COLUMN IF NOT EXISTS drawing_number text,
  ADD COLUMN IF NOT EXISTS schedule_impact_days int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_impact_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_code_id uuid REFERENCES public.cost_codes(id),
  ADD COLUMN IF NOT EXISTS location_path text,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS date_initiated date DEFAULT current_date;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_rfis_number_per_project
  ON public.project_rfis(project_id, rfi_number) WHERE rfi_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.rfi_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id uuid NOT NULL REFERENCES public.project_rfis(id) ON DELETE CASCADE,
  responder_id uuid REFERENCES auth.users(id),
  body text NOT NULL,
  is_official boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfir_rfi ON public.rfi_responses(rfi_id, created_at);

CREATE TABLE IF NOT EXISTS public.rfi_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id uuid NOT NULL REFERENCES public.project_rfis(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.pl_documents(id),
  photo_id uuid REFERENCES public.photos(id),
  drawing_markup_id uuid REFERENCES public.drawing_markups(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (document_id IS NOT NULL OR photo_id IS NOT NULL OR drawing_markup_id IS NOT NULL)
);

ALTER TABLE public.rfi_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfi_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY rfir_via_rfi ON public.rfi_responses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_rfis r WHERE r.id = rfi_responses.rfi_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.project_rfis r WHERE r.id = rfi_responses.rfi_id));

CREATE POLICY rfiat_via_rfi ON public.rfi_attachments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_rfis r WHERE r.id = rfi_attachments.rfi_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.project_rfis r WHERE r.id = rfi_attachments.rfi_id));

-- Auto RFI number per project (RFI-NNNN)
CREATE OR REPLACE FUNCTION public.next_rfi_number(p_project_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE v int;
BEGIN
  SELECT COALESCE(MAX((regexp_match(rfi_number, '^RFI-(\d+)$'))[1]::int), 0) + 1
    INTO v
    FROM public.project_rfis WHERE project_id = p_project_id;
  RETURN 'RFI-' || lpad(v::text, 4, '0');
END;
$$;
