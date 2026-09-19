-- Proposal value lines can be led by APAS or by an approved project-directory
-- contractor / consultant. This keeps billing rows tied to the project team
-- instead of free-typed names.

ALTER TABLE public.proposal_lines
  ADD COLUMN IF NOT EXISTS lead_type text NOT NULL DEFAULT 'apas',
  ADD COLUMN IF NOT EXISTS lead_directory_entry_id uuid REFERENCES public.project_directory_entries(id) ON DELETE SET NULL;

ALTER TABLE public.proposal_lines
  DROP CONSTRAINT IF EXISTS proposal_lines_lead_type_check;

ALTER TABLE public.proposal_lines
  ADD CONSTRAINT proposal_lines_lead_type_check
  CHECK (lead_type IN ('apas', 'contractor', 'consultant'));

CREATE INDEX IF NOT EXISTS proposal_lines_lead_directory_entry_idx
  ON public.proposal_lines(lead_directory_entry_id);
