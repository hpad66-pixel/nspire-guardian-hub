-- Add status column to project_team_members for suspend/deactivate
ALTER TABLE public.project_team_members
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_project_team_members_status ON public.project_team_members(status);

-- Add comment
COMMENT ON COLUMN public.project_team_members.status IS 'active, suspended, or deactivated';