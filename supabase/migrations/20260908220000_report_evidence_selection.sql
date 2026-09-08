ALTER TABLE public.consulting_report_sources
  ADD COLUMN placement_mode text NOT NULL DEFAULT 'supporting' CHECK (placement_mode IN ('supporting', 'mandatory')),
  ADD COLUMN selected_for_report boolean NOT NULL DEFAULT false,
  ADD COLUMN visual_analysis jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Preserve photographs already chosen for existing reports.
UPDATE public.consulting_report_sources SET selected_for_report = included
WHERE mime_type LIKE 'image/%';

CREATE FUNCTION public.apply_consulting_report_selection(p_report_id uuid, p_selected_ids uuid[])
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  UPDATE public.consulting_report_sources
  SET selected_for_report = placement_mode = 'mandatory' OR (included AND id = ANY(p_selected_ids))
  WHERE report_id = p_report_id;
$$;
REVOKE ALL ON FUNCTION public.apply_consulting_report_selection(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_consulting_report_selection(uuid, uuid[]) TO authenticated;
NOTIFY pgrst, 'reload schema';
