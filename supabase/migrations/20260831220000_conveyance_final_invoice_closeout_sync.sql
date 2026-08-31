-- Conveyance / Sewer Extension — sync field completion to Final Invoice #5.
--
-- Pay App 5 says construction is done (FINAL): completed $921,212.36 of
-- $953,350.35 contract; leftover quantities/credits will not be billed.
-- This migration:
--   1) Sets project phase → closeout and program_meta status label
--   2) Closes field punch / project-log items that the final invoice covers
--   3) Leaves City permit-chase items open (D7 / J3 / J4)
--   4) Seeds + completes construction closeout checklist lines
--   5) Re-affirms Pay App 5 as approved FINAL invoice
--   6) Caps billed SOV lines at 100% where value_to_date ≈ scheduled
--   7) Completes construction milestones; keeps City acceptance open
--   8) Closes obsolete correspondence tasks that construction completion supersedes

DO $$
DECLARE
  v_pid      uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';
  v_pay_app  uuid := 'd1eb695d-0f4b-4414-a2a3-13f69d6ae8da';
  v_contract uuid := '1a826ac7-4f39-4644-b905-3c6633817876';
  v_tenant   uuid;
  v_creator  uuid;
  v_ts       timestamptz := now();
  v_closed   integer := 0;
  v_meta     jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_pid) THEN
    RAISE NOTICE 'Conveyance project not found — skipping closeout sync';
    RETURN;
  END IF;

  SELECT COALESCE(
    (SELECT c.workspace_id FROM public.clients c JOIN public.projects p ON p.client_id = c.id WHERE p.id = v_pid),
    (SELECT pr.workspace_id FROM public.properties pr JOIN public.projects p ON p.property_id = pr.id WHERE p.id = v_pid),
    (SELECT pf.workspace_id FROM public.profiles pf JOIN public.projects p ON p.created_by = pf.user_id WHERE p.id = v_pid)
  ) INTO v_tenant;

  SELECT created_by, COALESCE(program_meta, '{}'::jsonb)
    INTO v_creator, v_meta
  FROM public.projects WHERE id = v_pid;

  -- ── 1. Project phase + status label ───────────────────────────────────────
  UPDATE public.projects
  SET
    phase = 'closeout',
    status = 'active', -- City conveyance still open; construction is complete
    spent = GREATEST(COALESCE(spent, 0), 921212.36),
    program_meta = v_meta || jsonb_build_object(
      'status_label', 'Construction complete — FINAL invoice issued; City conveyance in progress',
      'construction_complete', true,
      'final_invoice_pay_app_no', 5,
      'final_invoice_current_due', 144332.82,
      'final_invoice_completed_to_date', 921212.36,
      'final_invoice_contract_sum', 953350.35,
      'closeout_synced_at', v_ts
    ),
    updated_at = v_ts
  WHERE id = v_pid;

  -- ── 2. Project Log — close field punch items ──────────────────────────────
  -- City / permit chase stays open: D7, J3, J4, AL1 (permit 7 future-work letter)
  UPDATE public.tracker_items
  SET
    status = 'done',
    closed_at = COALESCE(closed_at, v_ts),
    updated_at = v_ts
  WHERE project_id = v_pid
    AND status IS DISTINCT FROM 'done'
    AND COALESCE(code, '') NOT IN ('D7', 'J3', 'J4', 'AL1');

  GET DIAGNOSTICS v_closed = ROW_COUNT;

  -- Stamp updates on newly closed items (idempotent: skip if same body already exists today)
  INSERT INTO public.tracker_updates (tenant_id, project_id, item_id, author, body, status_to, created_at)
  SELECT
    COALESCE(ti.tenant_id, v_tenant),
    v_pid,
    ti.id,
    'APAS / Proj OS',
    'Closed against Final Pay App #5 — construction quantities 100% billed for work performed; leftover contract balance will not be billed. City conveyance items remain open.',
    'done',
    v_ts
  FROM public.tracker_items ti
  WHERE ti.project_id = v_pid
    AND ti.status = 'done'
    AND COALESCE(ti.code, '') NOT IN ('D7', 'J3', 'J4', 'AL1')
    AND NOT EXISTS (
      SELECT 1 FROM public.tracker_updates u
      WHERE u.item_id = ti.id
        AND u.body LIKE 'Closed against Final Pay App #5%'
    );

  -- City chase items → progress with a clarifying note
  UPDATE public.tracker_items
  SET
    status = 'progress',
    closed_at = NULL,
    updated_at = v_ts
  WHERE project_id = v_pid
    AND COALESCE(code, '') IN ('D7', 'J3', 'J4', 'AL1');

  INSERT INTO public.tracker_updates (tenant_id, project_id, item_id, author, body, status_to, created_at)
  SELECT
    COALESCE(ti.tenant_id, v_tenant),
    v_pid,
    ti.id,
    'APAS / Proj OS',
    'Construction complete per Final Invoice #5. This item remains open for City of Opa-Locka permit / conveyance closeout.',
    'progress',
    v_ts
  FROM public.tracker_items ti
  WHERE ti.project_id = v_pid
    AND COALESCE(ti.code, '') IN ('D7', 'J3', 'J4', 'AL1')
    AND NOT EXISTS (
      SELECT 1 FROM public.tracker_updates u
      WHERE u.item_id = ti.id
        AND u.body LIKE 'Construction complete per Final Invoice #5%'
    );

  RAISE NOTICE 'Conveyance project log: closed % field items; kept D7/J3/J4/AL1 open for City', v_closed;

  -- ── 3. Formal C3 punch_items (if any) → completed/verified ────────────────
  -- Skip evidence_required open items (close trigger would reject them).
  UPDATE public.punch_items
  SET
    status = CASE WHEN COALESCE(evidence_required, false) THEN status ELSE 'verified' END,
    completed_at = COALESCE(completed_at, v_ts),
    verified_at = CASE WHEN COALESCE(evidence_required, false) THEN verified_at ELSE COALESCE(verified_at, v_ts) END,
    updated_at = v_ts
  WHERE project_id = v_pid
    AND status IN ('open', 'in_progress', 'completed')
    AND COALESCE(evidence_required, false) = false;

  UPDATE public.punch_items
  SET
    status = 'completed',
    completed_at = COALESCE(completed_at, v_ts),
    updated_at = v_ts
  WHERE project_id = v_pid
    AND status IN ('open', 'in_progress')
    AND COALESCE(evidence_required, false) = true;

  -- ── 4. Closeout checklist ─────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM public.project_closeout_items WHERE project_id = v_pid
  ) THEN
    INSERT INTO public.project_closeout_items
      (project_id, category, title, description, is_completed, completed_at, completed_by, sort_order)
    VALUES
      (v_pid, 'financial', 'Final Application for Payment issued (Pay App #5)',
       'FINAL invoice — Amount Certified $144,332.82 remaining after $742,871.38 paid to date.',
       true, v_ts, 'APAS / Proj OS', 10),
      (v_pid, 'financial', 'Schedule of Values / quantities reconciled to final invoice',
       'Completed & stored to date $921,212.36; unbuilt leftover $32,137.99 will not be billed.',
       true, v_ts, 'APAS / Proj OS', 20),
      (v_pid, 'documentation', 'As-built surveys uploaded (Buildings 3 / 5 / 6)',
       '3TCI as-built sanitary surveys seeded into Site Asset Map (S-1…S-8, CO-01…CO-24, POND-1).',
       true, v_ts, 'APAS / Proj OS', 30),
      (v_pid, 'documentation', 'Field punch list closed against final quantities',
       'Project Log field items closed; City permit chase (D7/J3/J4/AL1) remains open.',
       true, v_ts, 'APAS / Proj OS', 40),
      (v_pid, 'inspections', 'Contractor field work complete',
       'Construction scope complete per final G702/G703. Remaining work is City conveyance.',
       true, v_ts, 'APAS / Proj OS', 50),
      (v_pid, 'warranty', 'Execute three 12-month warranties by building group',
       'Bldg 3S+4 · Bldg 5+6 · Bldg 3N — owner counsel / City package.',
       false, NULL, NULL, 60),
      (v_pid, 'inspections', 'City of Opa-Locka permit closeouts (open / pending city)',
       'Tracked in Field → Permits. Do not mark complete until City confirmation letters are filed.',
       false, NULL, NULL, 70),
      (v_pid, 'documentation', 'Assemble & transmit Utilities Conveyance package to City',
       'Record drawings, CCTV, affidavits, Bill of Sale, acceptance letter.',
       false, NULL, NULL, 80),
      (v_pid, 'general', 'Written City acceptance / asset transfer confirmation',
       'Project closes administratively when City acceptance is on file.',
       false, NULL, NULL, 90);
  ELSE
    -- Ensure the construction-side lines exist and are complete
    UPDATE public.project_closeout_items
    SET is_completed = true,
        completed_at = COALESCE(completed_at, v_ts),
        completed_by = COALESCE(completed_by, 'APAS / Proj OS'),
        updated_at = v_ts
    WHERE project_id = v_pid
      AND is_completed IS DISTINCT FROM true
      AND (
        title ILIKE '%Final Application%'
        OR title ILIKE '%Schedule of Values%'
        OR title ILIKE '%As-built%'
        OR title ILIKE '%Field punch%'
        OR title ILIKE '%field work complete%'
      );
  END IF;

  -- ── 5. Pay App 5 — approved FINAL ─────────────────────────────────────────
  UPDATE public.prime_contract_pay_apps
  SET
    status = 'approved',
    is_final_invoice = true,
    submitted_amount = 144332.82,
    approved_amount = 144332.82,
    pay_app_data = COALESCE(pay_app_data, '{}'::jsonb) || jsonb_build_object(
      'is_final_invoice', true,
      'use_reconciled_snapshot', true,
      'amount_certified', 144332.82,
      'current_payment_due', 144332.82,
      'completed_stored_to_date', 921212.36,
      'contract_sum_to_date', 953350.35,
      'less_previous_certificates', 742871.38,
      'cash_received_to_date', 742871.38,
      'balance_to_finish', 32137.99,
      'retainage_total', 34008.16,
      'total_earned_less_retainage', 887204.2,
      'closeout_synced_at', v_ts
    ),
    updated_at = v_ts
  WHERE id = v_pay_app
    AND prime_contract_id = v_contract;

  -- ── 6. SOV progress — lines fully billed → 100% ───────────────────────────
  UPDATE public.pay_app_line_progress p
  SET
    pct_complete = 100,
    qty_to_date = CASE
      WHEN COALESCE(li.scheduled_qty, 0) > 0 THEN li.scheduled_qty
      ELSE GREATEST(COALESCE(p.qty_to_date, 0), 1)
    END,
    updated_at = v_ts
  FROM public.sov_line_items li
  WHERE p.pay_app_id = v_pay_app
    AND p.sov_line_item_id = li.id
    AND COALESCE(li.scheduled_value, 0) > 0
    AND COALESCE(p.value_to_date, 0) >= (li.scheduled_value - 0.01);

  -- ── 7. Milestones ─────────────────────────────────────────────────────────
  -- Complete any existing construction / quantity milestones
  UPDATE public.project_milestones
  SET
    status = 'completed',
    completed_at = COALESCE(completed_at, v_ts),
    updated_at = v_ts
  WHERE project_id = v_pid
    AND status IS DISTINCT FROM 'completed'
    AND (
      name ILIKE '%construction%'
      OR name ILIKE '%quantity%'
      OR name ILIKE '%as-built%'
      OR name ILIKE '%punch%'
      OR name ILIKE '%pay app%'
      OR name ILIKE '%final invoice%'
    );

  -- Ensure key closeout milestones exist
  IF NOT EXISTS (
    SELECT 1 FROM public.project_milestones
    WHERE project_id = v_pid AND name = 'Construction complete — Final Invoice #5'
  ) THEN
    INSERT INTO public.project_milestones
      (project_id, name, status, due_date, completed_at, notes, progress_percent)
    VALUES
      (v_pid, 'Construction complete — Final Invoice #5', 'completed', '2026-07-22', v_ts,
       'G702 completed $921,212.36 · Current due $144,332.82 · Line 9 unbuilt $32,137.99 not billed.',
       100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.project_milestones
    WHERE project_id = v_pid AND name = 'City of Opa-Locka written acceptance'
  ) THEN
    INSERT INTO public.project_milestones
      (project_id, name, status, due_date, notes, progress_percent)
    VALUES
      (v_pid, 'City of Opa-Locka written acceptance', 'pending', '2026-09-30',
       'Administrative conveyance closeout — permits + package still open.',
       0);
  END IF;

  -- ── 8. Action items — close construction-superseded correspondence tasks ──
  UPDATE public.project_action_items
  SET
    status = 'done',
    completed_at = COALESCE(completed_at, v_ts),
    updated_at = v_ts
  WHERE project_id = v_pid
    AND status IN ('todo', 'in_progress', 'in_review')
    AND (
      title ILIKE '%D-Shin%'
      OR title ILIKE '%D''Shin%'
      OR title ILIKE '%quote attachment%'
    );

  -- Leave City / DERM / WASD / E-Builder portal tasks open (still needed)

  RAISE NOTICE 'Conveyance closeout sync complete for %', v_pid;
END $$;
