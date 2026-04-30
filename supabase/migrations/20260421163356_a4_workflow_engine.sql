-- ============================================================
-- A4 · Ball-in-Court Workflow Engine
-- Generic state machine shared by RFIs, Submittals, Punch, COs, Pay Apps, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module text NOT NULL,
  name text NOT NULL,
  version int NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module, version)
);

CREATE INDEX IF NOT EXISTS idx_wfd_tenant_module
  ON public.workflow_definitions(tenant_id, module);

CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  sequence int NOT NULL,
  state_name text NOT NULL,
  assignee_rule text NOT NULL,           -- 'role:PM' | 'field:responsible_contractor_id' | 'explicit'
  due_offset_days int,
  auto_actions jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(definition_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_wfs_definition
  ON public.workflow_steps(definition_id, sequence);

CREATE TABLE IF NOT EXISTS public.workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  definition_id uuid NOT NULL REFERENCES public.workflow_definitions(id),
  record_id uuid NOT NULL,
  record_type text NOT NULL,
  project_id uuid REFERENCES public.projects(id),
  current_step int NOT NULL,
  current_assignee_id uuid REFERENCES auth.users(id),
  due_at timestamptz,
  state text NOT NULL CHECK (state IN ('open','approved','closed','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  UNIQUE(record_type, record_id)
);

CREATE INDEX IF NOT EXISTS idx_wi_my_court
  ON public.workflow_instances(current_assignee_id, state) WHERE state = 'open';
CREATE INDEX IF NOT EXISTS idx_wi_tenant ON public.workflow_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wi_project ON public.workflow_instances(project_id);
CREATE INDEX IF NOT EXISTS idx_wi_record ON public.workflow_instances(record_type, record_id);

CREATE TABLE IF NOT EXISTS public.workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  from_step int,
  to_step int,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('submit','approve','reject','return','close','reassign','create')),
  comment text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wfe_instance
  ON public.workflow_events(instance_id, occurred_at);

-- RLS --------------------------------------------------------
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY wfd_tenant ON public.workflow_definitions FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY wfs_via_def ON public.workflow_steps FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflow_definitions d
                 WHERE d.id = workflow_steps.definition_id
                 AND (d.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_definitions d
                      WHERE d.id = workflow_steps.definition_id
                      AND (d.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

CREATE POLICY wi_tenant ON public.workflow_instances FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY wfe_via_instance ON public.workflow_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflow_instances wi
                 WHERE wi.id = workflow_events.instance_id
                 AND (wi.tenant_id = public.current_tenant_id() OR public.is_super_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_instances wi
                      WHERE wi.id = workflow_events.instance_id
                      AND (wi.tenant_id = public.current_tenant_id() OR public.is_super_admin())));

-- Engine functions -------------------------------------------

CREATE OR REPLACE FUNCTION public.create_workflow_instance(
  p_record_id uuid,
  p_record_type text,
  p_module text,
  p_project_id uuid DEFAULT NULL,
  p_explicit_assignee uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_def   workflow_definitions;
  v_step  workflow_steps;
  v_inst_id uuid;
BEGIN
  SELECT * INTO v_def FROM public.workflow_definitions
   WHERE tenant_id = v_tenant AND module = p_module AND is_default = true
   ORDER BY version DESC LIMIT 1;
  IF v_def.id IS NULL THEN
    RAISE EXCEPTION 'No default workflow definition for tenant=% module=%', v_tenant, p_module;
  END IF;

  SELECT * INTO v_step FROM public.workflow_steps
   WHERE definition_id = v_def.id AND sequence = 1;
  IF v_step.id IS NULL THEN
    RAISE EXCEPTION 'Definition % has no step 1', v_def.id;
  END IF;

  INSERT INTO public.workflow_instances (
    tenant_id, definition_id, record_id, record_type, project_id,
    current_step, current_assignee_id, due_at, state
  ) VALUES (
    v_tenant, v_def.id, p_record_id, p_record_type, p_project_id,
    1, COALESCE(p_explicit_assignee, auth.uid()),
    CASE WHEN v_step.due_offset_days IS NOT NULL
         THEN now() + (v_step.due_offset_days || ' days')::interval
         ELSE NULL END,
    'open'
  )
  RETURNING id INTO v_inst_id;

  INSERT INTO public.workflow_events (instance_id, from_step, to_step, actor_id, action)
    VALUES (v_inst_id, NULL, 1, auth.uid(), 'create');

  RETURN v_inst_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_workflow(
  p_instance_id uuid,
  p_action text,
  p_comment text DEFAULT NULL,
  p_explicit_next_assignee uuid DEFAULT NULL
)
RETURNS workflow_instances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst   workflow_instances;
  v_next   workflow_steps;
  v_last_seq int;
  v_new_state text;
  v_new_step  int;
BEGIN
  SELECT * INTO v_inst FROM public.workflow_instances WHERE id = p_instance_id FOR UPDATE;
  IF v_inst.id IS NULL THEN
    RAISE EXCEPTION 'Workflow instance not found';
  END IF;
  IF v_inst.state <> 'open' THEN
    RAISE EXCEPTION 'Workflow is % and cannot advance', v_inst.state;
  END IF;

  SELECT MAX(sequence) INTO v_last_seq FROM public.workflow_steps
    WHERE definition_id = v_inst.definition_id;

  IF p_action IN ('submit','approve') THEN
    v_new_step := v_inst.current_step + 1;
    IF v_new_step > v_last_seq THEN
      v_new_state := CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'closed' END;
    ELSE
      v_new_state := 'open';
    END IF;
  ELSIF p_action = 'reject' THEN
    v_new_step := GREATEST(1, v_inst.current_step - 1);
    v_new_state := 'open';
  ELSIF p_action = 'return' THEN
    v_new_step := 1;
    v_new_state := 'open';
  ELSIF p_action = 'close' THEN
    v_new_step := v_inst.current_step;
    v_new_state := 'closed';
  ELSIF p_action = 'reassign' THEN
    v_new_step := v_inst.current_step;
    v_new_state := 'open';
  ELSE
    RAISE EXCEPTION 'Unknown action: %', p_action;
  END IF;

  -- Find the next step's config (for due_at + assignee resolution)
  SELECT * INTO v_next FROM public.workflow_steps
    WHERE definition_id = v_inst.definition_id AND sequence = v_new_step;

  UPDATE public.workflow_instances
    SET current_step = v_new_step,
        current_assignee_id = COALESCE(
          p_explicit_next_assignee,
          CASE WHEN v_new_state <> 'open' THEN NULL ELSE v_inst.current_assignee_id END
        ),
        due_at = CASE
          WHEN v_new_state <> 'open' THEN NULL
          WHEN v_next.due_offset_days IS NOT NULL THEN now() + (v_next.due_offset_days || ' days')::interval
          ELSE v_inst.due_at
        END,
        state = v_new_state,
        updated_at = now(),
        closed_at = CASE WHEN v_new_state IN ('closed','approved','rejected') THEN now() ELSE NULL END
   WHERE id = p_instance_id
   RETURNING * INTO v_inst;

  INSERT INTO public.workflow_events (instance_id, from_step, to_step, actor_id, action, comment)
    VALUES (p_instance_id, v_inst.current_step, v_new_step, auth.uid(), p_action, p_comment);

  RETURN v_inst;
END;
$$;

DROP TRIGGER IF EXISTS trg_wi_updated_at ON public.workflow_instances;
CREATE TRIGGER trg_wi_updated_at
  BEFORE UPDATE ON public.workflow_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- "My Court" view: all open instances assigned to the current user
CREATE OR REPLACE VIEW public.my_court AS
SELECT
  wi.id,
  wi.tenant_id,
  wi.record_id,
  wi.record_type,
  wi.project_id,
  wi.current_step,
  wi.due_at,
  wi.state,
  wi.created_at,
  wd.module,
  wd.name AS workflow_name,
  ws.state_name AS current_state_name
FROM public.workflow_instances wi
JOIN public.workflow_definitions wd ON wd.id = wi.definition_id
LEFT JOIN public.workflow_steps ws
       ON ws.definition_id = wi.definition_id AND ws.sequence = wi.current_step
WHERE wi.state = 'open'
  AND wi.current_assignee_id = auth.uid();

GRANT SELECT ON public.my_court TO authenticated;
