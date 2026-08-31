-- Larkin Hospital / MRI Building: the $14,500 engagement fee was stored only
-- on projects.budget. It never became a financial proposal, so invoice
-- generation could only see PROP-001 (~$3,369 geotech). Backfill PROP-002 as
-- an approved lump-sum proposal so both approved fees appear in Client Invoices.
--
-- IMPORTANT: proposal_lines are guarded by trg_financial_proposal_lines_guard —
-- you cannot INSERT/UPDATE/DELETE lines while proposals.locked = true.
-- Write the header unlocked, seed the lump-sum line, THEN lock/sign.
-- (This file replaces the failed first push of the same version; it never
-- applied on remote, so editing in place unblocks supabase db push.)

DO $$
DECLARE
  v_project uuid := '332ee1d6-b165-4893-bd25-c31a212e206e';
  v_tenant uuid;
  v_proposal uuid := 'a1450000-b165-4893-bd25-c31a212e206e';
  v_exists boolean := false;
  v_has_14500 boolean := false;
BEGIN
  -- projects has no tenant_id — resolve workspace via client / property / creator
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_project) THEN
    RAISE NOTICE 'Larkin MRI project not found — skipping $14,500 proposal backfill';
    RETURN;
  END IF;

  SELECT COALESCE(
    (SELECT c.workspace_id
       FROM public.clients c
       JOIN public.projects p ON p.client_id = c.id
      WHERE p.id = v_project),
    (SELECT pr.workspace_id
       FROM public.properties pr
       JOIN public.projects p ON p.property_id = pr.id
      WHERE p.id = v_project),
    (SELECT pf.workspace_id
       FROM public.profiles pf
       JOIN public.projects p ON p.created_by = pf.user_id
      WHERE p.id = v_project)
  ) INTO v_tenant;

  IF v_tenant IS NULL THEN
    RAISE NOTICE 'Larkin MRI workspace not resolvable — skipping $14,500 proposal backfill';
    RETURN;
  END IF;

  -- Already have a proposal whose line total (incl. OH/profit) is ~14500?
  SELECT EXISTS (
    SELECT 1
    FROM public.proposals p
    JOIN public.proposal_lines pl ON pl.proposal_id = p.id
    WHERE p.project_id = v_project
      AND p.status = 'approved'
    GROUP BY p.id, p.overhead_pct, p.profit_pct
    HAVING abs(
      sum(pl.quantity * pl.unit_cost)
        * (1 + coalesce(p.overhead_pct, 0) / 100.0 + coalesce(p.profit_pct, 0) / 100.0)
      - 14500
    ) < 1
  ) INTO v_has_14500;

  IF v_has_14500 THEN
    RAISE NOTICE 'Larkin MRI already has an approved ~$14,500 proposal — skipping insert';
    RETURN;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.proposals WHERE id = v_proposal) INTO v_exists;

  IF NOT v_exists THEN
    -- Insert UNLOCKED so the lump-sum line can be written under the lines guard.
    INSERT INTO public.proposals (
      id, tenant_id, project_id, proposal_no, title,
      client_name, client_email, status,
      notes, terms, scope_bullets, deliverables,
      markup_pct, overhead_pct, profit_pct,
      locked, accepted_signed_at, accepted_signed_name, acceptance_method,
      revision_no, created_at, updated_at
    ) VALUES (
      v_proposal,
      v_tenant,
      v_project,
      'PROP-002',
      'Contamination Assessment & Class VI Stormwater Compliance — MRI Building',
      'Larkin Hospital',
      'hardeep@apas.ai',
      'approved',
      'Lump-sum professional services for Miami-Dade PCD contamination assessment '
        || 'between the dispenser area and the MRI Building, plus Class VI stormwater '
        || 'management evaluation, groundwater calculations, and Class VI permit application '
        || 'preparation. Fee matches the project budget authorization of $14,500.',
      'Net 15. Fee is lump sum for the scope described. Agency permit fees excluded. '
        || 'Additional field mobilizations or expanded assessment beyond the described scope '
        || 'will be handled as additional services.',
      '["Address PCD contamination assessment requirements between the dispenser area and the MRI Building","Evaluate stormwater management conditions against Class VI requirements","Demonstrate via groundwater calculations whether proposed stormwater activities disturb the existing contaminant plume","Prepare and submit the Class VI permit application with supporting documentation"]'::jsonb,
      '["Contamination assessment data evaluation and reporting for PCD","Class VI stormwater compliance evaluation memorandum","Groundwater / plume disturbance calculations","Class VI permit application package"]'::jsonb,
      0, 0, 0,
      false,
      NULL,
      NULL,
      NULL,
      1,
      now(),
      now()
    );
  ELSE
    -- Unlock briefly so line rewrite is allowed by the guard trigger.
    UPDATE public.proposals
    SET locked = false,
        status = 'approved',
        title = 'Contamination Assessment & Class VI Stormwater Compliance — MRI Building',
        client_name = coalesce(nullif(client_name, ''), 'Larkin Hospital'),
        overhead_pct = 0,
        profit_pct = 0,
        updated_at = now()
    WHERE id = v_proposal;
  END IF;

  -- Ensure a single lump-sum line of $14,500 (proposal is unlocked here).
  DELETE FROM public.proposal_lines WHERE proposal_id = v_proposal;

  INSERT INTO public.proposal_lines (
    tenant_id, proposal_id, line_no, category, description,
    quantity, unit, unit_cost, markup_pct
  ) VALUES (
    v_tenant,
    v_proposal,
    1,
    'other',
    'Contamination assessment & Class VI stormwater compliance (lump sum)',
    1,
    'ls',
    14500,
    0
  );

  -- Lock / sign only AFTER lines are in place.
  UPDATE public.proposals
  SET locked = true,
      status = 'approved',
      accepted_signed_at = coalesce(accepted_signed_at, now()),
      accepted_signed_name = coalesce(nullif(accepted_signed_name, ''), 'Larkin Hospital'),
      acceptance_method = coalesce(acceptance_method, 'offline'),
      updated_at = now()
  WHERE id = v_proposal;

  -- Keep project budget aligned with the engagement fee
  UPDATE public.projects
  SET budget = 14500,
      updated_at = now()
  WHERE id = v_project
    AND (budget IS NULL OR budget = 0 OR budget = 14500);

  RAISE NOTICE 'Larkin MRI: created/updated approved PROP-002 at $14,500';
END $$;
