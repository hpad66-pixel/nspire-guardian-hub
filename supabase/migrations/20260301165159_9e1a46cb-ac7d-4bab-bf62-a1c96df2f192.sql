ALTER TABLE public.project_milestones 
ADD COLUMN collaborator_ids uuid[] DEFAULT '{}'::uuid[];