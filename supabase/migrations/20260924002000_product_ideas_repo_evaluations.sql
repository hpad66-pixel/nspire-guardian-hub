-- Product Ideas: publish repo-grounded evaluation updates for the current board.
-- These updates make the board read like a product release tracker instead of
-- a static suggestion list.

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.publish_product_idea_repo_review(
  p_title text,
  p_status text,
  p_update_title text,
  p_body text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor uuid;
  v_idea record;
BEGIN
  SELECT ur.user_id
  INTO v_actor
  FROM public.user_roles ur
  WHERE ur.role::text IN ('admin', 'owner')
  ORDER BY CASE ur.role::text WHEN 'admin' THEN 0 ELSE 1 END, ur.user_id
  LIMIT 1;

  IF v_actor IS NULL THEN
    SELECT p.user_id
    INTO v_actor
    FROM public.profiles p
    ORDER BY p.created_at NULLS LAST
    LIMIT 1;
  END IF;

  IF v_actor IS NULL THEN
    RAISE NOTICE 'Skipping product idea review for %, no actor user found', p_title;
    RETURN;
  END IF;

  FOR v_idea IN
    SELECT id, status
    FROM public.product_ideas
    WHERE lower(btrim(title)) = lower(btrim(p_title))
  LOOP
    UPDATE public.product_ideas
    SET
      status = p_status,
      status_changed_at = CASE WHEN status <> p_status THEN now() ELSE status_changed_at END
    WHERE id = v_idea.id;

    IF NOT EXISTS (
      SELECT 1
      FROM public.product_idea_updates
      WHERE idea_id = v_idea.id
        AND title = p_update_title
    ) THEN
      INSERT INTO public.product_idea_updates (
        idea_id,
        created_by,
        author_name,
        update_type,
        from_status,
        to_status,
        title,
        body
      ) VALUES (
        v_idea.id,
        v_actor,
        'Proj OS Product Review',
        CASE WHEN v_idea.status <> p_status THEN 'status' ELSE 'note' END,
        v_idea.status,
        p_status,
        p_update_title,
        p_body
      );
    END IF;
  END LOOP;
END;
$$;

SELECT pg_temp.publish_product_idea_repo_review(
  'UI design for proposals versus Change Orders',
  'shipped',
  'Repository evaluation complete',
  'Executed and live. The repository already includes the proposal builder, proposal-linked invoice guard, invoice lifecycle controls, signatures, and change-order financial paths. Recommendation: keep this marked executed and track future polish as smaller follow-up ideas.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'ProjOS Agent Skills and Workflow Studio',
  'planned',
  'Repository evaluation complete',
  'Design approved with a target live date of October 30, 2026. The agent panel, launcher, runtime flags, and pilot admin controls exist, but the workflow-studio builder is not yet a full admin product. Next milestone: define the first three approved skills, permission boundaries, and approval steps.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'AI Action Approval and Audit Center',
  'planned',
  'Repository evaluation complete',
  'Design approved with a target live date of October 23, 2026. Approval patterns exist across financial and document workflows, but there is not yet one central AI action ledger. Next milestone: create a single approval center for proposed action, source evidence, approver, timestamp, and outcome.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'Automated Client Status Narratives',
  'in_progress',
  'Moved into production build',
  'In production with a target live date of October 9, 2026. Client update generation exists in consulting updates, digest sending, and project communication tools. Next milestone: standardize one composer with preview, approval, and send controls.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'Sewer, Stormwater and Water Asset History',
  'planned',
  'Repository evaluation complete',
  'Design approved with a target live date of November 6, 2026. Permit, water, map, and work-order surfaces exist, but the asset history ledger is not unified yet. Next milestone: create an asset profile that links permits, inspections, photos, reports, work orders, and billing evidence.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'Emergency Command Center and Escalation',
  'in_progress',
  'Moved into production build',
  'In production with a target live date of October 16, 2026. Voice complaint intake and emergency metrics exist, but the escalation tree and dispatch cockpit need completion. Next milestone: make every intake metric clickable and connect emergencies to assignments, work orders, and follow-up status.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'Subcontractor and Vendor Portal Assistant',
  'in_progress',
  'Moved into production build',
  'In production with a target live date of October 16, 2026. Subcontractor portal pages, contractor readiness, payment profile, and notice-to-proceed controls are already in the repository. Next milestone: add guided assistant prompts around missing requirements, waived requirements, payment profile, and readiness.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'Commission and Board Packet Generator',
  'planned',
  'Repository evaluation complete',
  'Design approved with a target live date of November 13, 2026. Report generation and PDF utilities exist, but board-packet assembly, agenda structure, and packet approvals are not complete. Next milestone: define packet sections, attachments, approval sequence, and export format.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'Inspection Closeout Evidence Pack',
  'in_progress',
  'Moved into production build',
  'In production with a target live date of October 23, 2026. Field walk capture, camera capture, site accountability, and inspection reporting foundations exist. Next milestone: bundle before-and-after photos, field notes, approvals, punch status, and final PDF export.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'Voice and Photo Field Capture Copilot',
  'in_progress',
  'Moved into production build',
  'In production with a target live date of October 9, 2026. Mobile capture components exist, and the remaining gap is turning captured voice and photo evidence into consistent work products. Next milestone: complete voice note, photo set, work order, and client-ready summary handoff.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'Change Order Evidence Package Builder',
  'in_progress',
  'Moved into production build',
  'In production with a target live date of October 30, 2026. Change-order financial logic exists, but the evidence package builder needs a guided checklist and export. Next milestone: attach scope, photos, cost basis, approval trail, and owner-facing explanation to each change order.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'Invoice–Contract–Payment Matching Control',
  'in_progress',
  'Moved into production build',
  'In production with a target live date of October 2, 2026. Proposal-linked invoice guards, invoice lifecycle controls, signatures, and contractor payment records are already wired. Next milestone: finish the matching dashboard across owner invoice, subcontractor bill, payment, retention, and remaining contract value.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'Permit and Compliance Deadline Autopilot',
  'planned',
  'Repository evaluation complete',
  'Design approved with a target live date of November 6, 2026. Permit and compliance records exist, but automated deadline monitoring and reminders are not finished. Next milestone: define alert rules, responsible person, due-date logic, and escalation policy.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'Convert Calls and Emails into Work Orders',
  'in_progress',
  'Moved into production build',
  'In production with a target live date of October 9, 2026. Capture and work-order concepts exist, but the automatic work-order creation path needs hardening. Next milestone: fix auto-create errors, make every dashboard number navigable, and add review before dispatch.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'Daily Portfolio Risk Briefing',
  'planned',
  'Repository evaluation complete',
  'Design approved with a target live date of November 13, 2026. Portfolio and cockpit views exist, but daily risk briefing is not yet a scheduled, sourced briefing product. Next milestone: define risk signals, summary sections, audience, and dashboard or email delivery rules.'
);

SELECT pg_temp.publish_product_idea_repo_review(
  'Ask ProjOS Across Every Project Record',
  'planned',
  'Repository evaluation complete',
  'Design approved with a target live date of November 20, 2026. Project records and assistant surfaces exist, but source-cited cross-project retrieval is a larger platform feature. Next milestone: define indexing boundaries, tenant isolation, citations, permissions, and searchable record types.'
);

COMMIT;
