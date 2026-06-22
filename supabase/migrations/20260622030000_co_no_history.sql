-- ─────────────────────────────────────────────────────────────────────────────
-- Admin renumbering audit trail for change orders.
--
-- A client sometimes asks to change a change-order number after it's been
-- executed/locked. co_no is a reference label (not money) and the lock guard
-- (20260620_change_order_signing_workflow.sql) already PERMITS updating co_no on
-- a locked CO — it only freezes signed content (spec/amount/title/pdf/docx/
-- signature). This column records every admin renumber so the change to a signed
-- document is permanently auditable.
--
-- Each entry: { "from": <int>, "to": <int>, "by": <uuid>, "reason": <text>,
--               "at": <iso timestamp> }
-- Updating co_no_history (like co_no) is allowed while locked — neither is in
-- the lock guard's protected set.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS co_no_history jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.change_orders.co_no_history IS
  'Audit trail of admin co_no renumbering: [{from,to,by,reason,at}]';
