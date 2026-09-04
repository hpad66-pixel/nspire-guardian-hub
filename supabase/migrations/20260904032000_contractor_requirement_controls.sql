-- Contractor readiness portal controls
-- Gives administrators an explicit required/optional choice and a clear
-- contractor response method for every template and active qualification.

BEGIN;

ALTER TABLE public.contractor_requirement_items
  ADD COLUMN IF NOT EXISTS response_type text NOT NULL DEFAULT 'document'
    CHECK (response_type IN ('document','questionnaire','either','acknowledgement'));

ALTER TABLE public.contractor_case_requirements
  ADD COLUMN IF NOT EXISTS response_type text NOT NULL DEFAULT 'document'
    CHECK (response_type IN ('document','questionnaire','either','acknowledgement')),
  ADD COLUMN IF NOT EXISTS response_text text,
  ADD COLUMN IF NOT EXISTS response_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_submitted_by_name text,
  ADD COLUMN IF NOT EXISTS response_submitted_by_email text;

-- Experience can be supported by a written project history, a qualifications
-- package, or both. The remainder of the original baseline requests a file.
UPDATE public.contractor_requirement_items
SET response_type = CASE WHEN requirement_code = 'experience' THEN 'either' ELSE 'document' END
WHERE response_type = 'document';

UPDATE public.contractor_case_requirements
SET response_type = CASE WHEN requirement_code = 'experience' THEN 'either' ELSE 'document' END
WHERE response_type = 'document';

CREATE OR REPLACE FUNCTION public.tg_snapshot_contractor_response_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.source_item_id IS NOT NULL THEN
    SELECT response_type INTO NEW.response_type
    FROM public.contractor_requirement_items
    WHERE id = NEW.source_item_id;
  END IF;
  NEW.response_type := COALESCE(NEW.response_type, 'document');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contractor_requirement_response_snapshot ON public.contractor_case_requirements;
CREATE TRIGGER contractor_requirement_response_snapshot
  BEFORE INSERT ON public.contractor_case_requirements
  FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_contractor_response_type();

CREATE OR REPLACE FUNCTION public.configure_contractor_requirement_item(
  p_item_id uuid,
  p_required boolean,
  p_response_type text,
  p_verification_required boolean,
  p_expiration_required boolean,
  p_apply_to_open_cases boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_changed integer := 0;
  v_row_count integer := 0;
  v_case_id uuid;
  v_expiration_required boolean;
BEGIN
  IF p_response_type NOT IN ('document','questionnaire','either','acknowledgement') THEN
    RAISE EXCEPTION 'Unsupported contractor response type';
  END IF;

  SELECT tenant_id INTO v_tenant
  FROM public.contractor_requirement_items
  WHERE id = p_item_id;

  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Requirement was not found'; END IF;
  IF NOT public.can_manage_contractor_readiness(v_tenant) THEN
    RAISE EXCEPTION 'Workspace administrator access is required';
  END IF;

  v_expiration_required := p_expiration_required AND p_response_type IN ('document','either');

  UPDATE public.contractor_requirement_items
  SET required = p_required,
      response_type = p_response_type,
      verification_required = p_verification_required,
      expiration_required = v_expiration_required
  WHERE id = p_item_id;

  IF p_apply_to_open_cases THEN
    FOR v_case_id IN
      SELECT DISTINCT r.case_id
      FROM public.contractor_case_requirements r
      JOIN public.contractor_qualification_cases c ON c.id = r.case_id
      WHERE r.source_item_id = p_item_id
        AND c.status NOT IN ('qualified','suspended','rejected')
    LOOP
      UPDATE public.contractor_case_requirements
      SET required = p_required,
          response_type = p_response_type,
          verification_required = p_verification_required,
          expiration_required = v_expiration_required,
          status = CASE
            WHEN p_response_type IN ('questionnaire','acknowledgement')
              AND COALESCE(btrim(response_text), '') = '' THEN 'missing'
            WHEN p_response_type = 'document' AND current_document_id IS NULL THEN 'missing'
            ELSE status
          END,
          updated_at = now()
      WHERE case_id = v_case_id AND source_item_id = p_item_id;
      GET DIAGNOSTICS v_row_count = ROW_COUNT;
      v_changed := v_changed + v_row_count;
      PERFORM public.recompute_contractor_readiness(v_case_id);
    END LOOP;
  END IF;

  RETURN v_changed;
END;
$$;

CREATE OR REPLACE FUNCTION public.configure_contractor_case_requirement(
  p_requirement_id uuid,
  p_required boolean,
  p_response_type text,
  p_verification_required boolean,
  p_expiration_required boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_expiration_required boolean;
BEGIN
  IF p_response_type NOT IN ('document','questionnaire','either','acknowledgement') THEN
    RAISE EXCEPTION 'Unsupported contractor response type';
  END IF;

  SELECT case_id INTO v_case_id
  FROM public.contractor_case_requirements
  WHERE id = p_requirement_id;

  IF v_case_id IS NULL THEN RAISE EXCEPTION 'Checklist item was not found'; END IF;
  IF NOT public.can_manage_contractor_case(v_case_id) THEN
    RAISE EXCEPTION 'Project or workspace administrator access is required';
  END IF;

  v_expiration_required := p_expiration_required AND p_response_type IN ('document','either');

  UPDATE public.contractor_case_requirements
  SET required = p_required,
      response_type = p_response_type,
      verification_required = p_verification_required,
      expiration_required = v_expiration_required,
      status = CASE
        WHEN p_response_type IN ('questionnaire','acknowledgement')
          AND COALESCE(btrim(response_text), '') = '' THEN 'missing'
        WHEN p_response_type = 'document' AND current_document_id IS NULL THEN 'missing'
        ELSE status
      END,
      updated_at = now()
  WHERE id = p_requirement_id;

  PERFORM public.recompute_contractor_readiness(v_case_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.configure_contractor_requirement_item(uuid,boolean,text,boolean,boolean,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.configure_contractor_case_requirement(uuid,boolean,text,boolean,boolean) TO authenticated;

COMMIT;
