BEGIN;

-- Property-operations users may contribute a new source bill, but only a
-- workspace administrator may alter an analytical account profile or rewrite
-- an existing ledger row. Select access remains governed by property scope.
DROP POLICY IF EXISTS water_service_accounts_all ON public.water_service_accounts;
CREATE POLICY water_service_accounts_read ON public.water_service_accounts
FOR SELECT TO authenticated
USING (public.water_intel_property_ok(property_id) OR public.is_super_admin());
CREATE POLICY water_service_accounts_admin_insert ON public.water_service_accounts
FOR INSERT TO authenticated
WITH CHECK ((public.is_workspace_admin(auth.uid()) AND public.water_intel_property_ok(property_id)) OR public.is_super_admin());
CREATE POLICY water_service_accounts_admin_update ON public.water_service_accounts
FOR UPDATE TO authenticated
USING ((public.is_workspace_admin(auth.uid()) AND public.water_intel_property_ok(property_id)) OR public.is_super_admin())
WITH CHECK ((public.is_workspace_admin(auth.uid()) AND public.water_intel_property_ok(property_id)) OR public.is_super_admin());
CREATE POLICY water_service_accounts_admin_delete ON public.water_service_accounts
FOR DELETE TO authenticated
USING ((public.is_workspace_admin(auth.uid()) AND public.water_intel_property_ok(property_id)) OR public.is_super_admin());

DROP POLICY IF EXISTS water_bills_all ON public.water_bills;
CREATE POLICY water_bills_read ON public.water_bills
FOR SELECT TO authenticated
USING (public.water_intel_property_ok(property_id) OR public.is_super_admin());
CREATE POLICY water_bills_source_upload ON public.water_bills
FOR INSERT TO authenticated
WITH CHECK (
  (public.water_intel_property_ok(property_id) OR public.is_super_admin())
  AND created_by = auth.uid()
  AND source IN ('upload', 'ocr')
  AND document_url IS NOT NULL
);
CREATE POLICY water_bills_admin_update ON public.water_bills
FOR UPDATE TO authenticated
USING ((public.is_workspace_admin(auth.uid()) AND public.water_intel_property_ok(property_id)) OR public.is_super_admin())
WITH CHECK ((public.is_workspace_admin(auth.uid()) AND public.water_intel_property_ok(property_id)) OR public.is_super_admin());
CREATE POLICY water_bills_admin_delete ON public.water_bills
FOR DELETE TO authenticated
USING ((public.is_workspace_admin(auth.uid()) AND public.water_intel_property_ok(property_id)) OR public.is_super_admin());

-- AI drafts and human review live on the accountability link. The original
-- image and uploader-owned caption remain separate evidence.
ALTER TABLE public.field_accountability_photos
  ADD COLUMN IF NOT EXISTS ai_status text NOT NULL DEFAULT 'not_analyzed'
    CHECK (ai_status IN ('not_analyzed','queued','analyzing','drafted','failed')),
  ADD COLUMN IF NOT EXISTS ai_error text,
  ADD COLUMN IF NOT EXISTS analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS analysis_model text,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'unreviewed'
    CHECK (review_status IN ('unreviewed','ai_drafted','needs_clarification','confirmed')),
  ADD COLUMN IF NOT EXISTS reviewed_category text,
  ADD COLUMN IF NOT EXISTS reviewed_severity text
    CHECK (reviewed_severity IS NULL OR reviewed_severity IN ('low','medium','high','critical')),
  ADD COLUMN IF NOT EXISTS reviewed_narrative text,
  ADD COLUMN IF NOT EXISTS recommended_action text,
  ADD COLUMN IF NOT EXISTS reviewed_location text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

UPDATE public.field_accountability_photos
SET ai_status = CASE WHEN ai_suggestion <> '{}'::jsonb THEN 'drafted' ELSE 'not_analyzed' END,
    review_status = CASE WHEN ai_suggestion <> '{}'::jsonb THEN 'ai_drafted' ELSE 'unreviewed' END,
    analyzed_at = CASE WHEN ai_suggestion <> '{}'::jsonb THEN COALESCE(ai_approved_at, created_at) ELSE analyzed_at END,
    analysis_model = CASE WHEN ai_suggestion <> '{}'::jsonb THEN COALESCE(ai_suggestion #>> '{_analysis,model}', 'documented-batch-assessment') ELSE analysis_model END
WHERE (ai_suggestion <> '{}'::jsonb AND ai_status = 'not_analyzed')
   OR (ai_suggestion <> '{}'::jsonb AND review_status = 'unreviewed');

CREATE TABLE IF NOT EXISTS public.field_photo_review_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  photo_link_id uuid NOT NULL REFERENCES public.field_accountability_photos(id) ON DELETE CASCADE,
  prior_review jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_review jsonb NOT NULL DEFAULT '{}'::jsonb,
  edited_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  edited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS field_photo_review_project_status_idx
  ON public.field_accountability_photos(project_id, review_status, reviewed_severity);
CREATE INDEX IF NOT EXISTS field_photo_review_revisions_link_idx
  ON public.field_photo_review_revisions(photo_link_id, edited_at DESC);

ALTER TABLE public.field_photo_review_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY field_photo_review_revisions_admin_read
  ON public.field_photo_review_revisions FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.current_portal_kind() = 'main'
      AND tenant_id = public.current_tenant_id()
      AND public.field_project_belongs_to_tenant(project_id, tenant_id)
      AND public.is_workspace_admin(auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.update_field_photo_review(
  p_photo_link_id uuid,
  p_review_status text,
  p_category text,
  p_severity text,
  p_narrative text,
  p_action text,
  p_location text
)
RETURNS public.field_accountability_photos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.field_accountability_photos;
  v_prior jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_review_status NOT IN ('unreviewed','ai_drafted','needs_clarification','confirmed') THEN RAISE EXCEPTION 'Invalid review status'; END IF;
  IF p_severity IS NOT NULL AND p_severity NOT IN ('low','medium','high','critical') THEN RAISE EXCEPTION 'Invalid severity'; END IF;
  IF length(COALESCE(p_narrative, '')) > 5000 OR length(COALESCE(p_action, '')) > 5000 OR length(COALESCE(p_location, '')) > 1000 THEN
    RAISE EXCEPTION 'Review text is too long';
  END IF;

  SELECT * INTO v_link FROM public.field_accountability_photos WHERE id = p_photo_link_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Field photograph not found'; END IF;
  IF NOT (
    public.is_super_admin()
    OR (
      public.current_portal_kind() = 'main'
      AND v_link.tenant_id = public.current_tenant_id()
      AND public.field_project_belongs_to_tenant(v_link.project_id, v_link.tenant_id)
      AND public.is_workspace_admin(auth.uid())
    )
  ) THEN RAISE EXCEPTION 'Only a workspace administrator may review project findings'; END IF;

  v_prior := jsonb_build_object(
    'review_status', v_link.review_status, 'category', v_link.reviewed_category,
    'severity', v_link.reviewed_severity, 'narrative', v_link.reviewed_narrative,
    'action', v_link.recommended_action, 'location', v_link.reviewed_location
  );

  UPDATE public.field_accountability_photos SET
    review_status = p_review_status,
    reviewed_category = NULLIF(trim(COALESCE(p_category, '')), ''),
    reviewed_severity = NULLIF(trim(COALESCE(p_severity, '')), ''),
    reviewed_narrative = NULLIF(trim(COALESCE(p_narrative, '')), ''),
    recommended_action = NULLIF(trim(COALESCE(p_action, '')), ''),
    reviewed_location = NULLIF(trim(COALESCE(p_location, '')), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_photo_link_id RETURNING * INTO v_link;

  INSERT INTO public.field_photo_review_revisions(tenant_id, project_id, photo_link_id, prior_review, new_review, edited_by)
  VALUES (
    v_link.tenant_id, v_link.project_id, v_link.id, v_prior,
    jsonb_build_object(
      'review_status', v_link.review_status, 'category', v_link.reviewed_category,
      'severity', v_link.reviewed_severity, 'narrative', v_link.reviewed_narrative,
      'action', v_link.recommended_action, 'location', v_link.reviewed_location
    ), auth.uid()
  );
  RETURN v_link;
END;
$$;

REVOKE ALL ON FUNCTION public.update_field_photo_review(uuid,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_field_photo_review(uuid,text,text,text,text,text,text) TO authenticated;
GRANT SELECT ON public.field_photo_review_revisions TO authenticated;

-- Enrich the existing AI-save RPC with status/model provenance while retaining
-- the same function signature used by the edge function.
CREATE OR REPLACE FUNCTION public.save_field_photo_ai_suggestion(
  p_photo_link_id uuid,
  p_suggestion jsonb
)
RETURNS public.field_accountability_photos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.field_accountability_photos;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_suggestion IS NULL OR jsonb_typeof(p_suggestion) <> 'object' THEN RAISE EXCEPTION 'AI suggestion must be a JSON object'; END IF;
  SELECT * INTO v_link FROM public.field_accountability_photos WHERE id = p_photo_link_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Field photograph not found'; END IF;
  IF NOT (
    public.is_super_admin()
    OR (
      public.current_portal_kind() = 'main'
      AND v_link.tenant_id = public.current_tenant_id()
      AND public.field_project_belongs_to_tenant(v_link.project_id, v_link.tenant_id)
    )
    OR (
      public.current_portal_kind() = 'owner'
      AND v_link.tenant_id = public.current_portal_tenant_id()
      AND public.owner_can_access_project(v_link.project_id)
      AND EXISTS (SELECT 1 FROM public.photos ph WHERE ph.id = v_link.photo_id AND ph.uploader_id = auth.uid())
    )
  ) THEN RAISE EXCEPTION 'Not authorized for this photograph'; END IF;

  UPDATE public.field_accountability_photos SET
    ai_suggestion = p_suggestion,
    ai_status = 'drafted',
    ai_error = NULL,
    analyzed_at = now(),
    analysis_model = COALESCE(p_suggestion #>> '{_analysis,model}', 'unknown'),
    review_status = CASE WHEN review_status = 'confirmed' THEN review_status ELSE 'ai_drafted' END
  WHERE id = p_photo_link_id RETURNING * INTO v_link;
  RETURN v_link;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
