-- ─────────────────────────────────────────────────────────────────────────────
-- Amendment audit trail for change orders.
--
-- When a client asks to change the CONTENT of a signed/executed CO, the clean
-- process is to reopen it for editing (clear signatures → back to Draft), edit
-- the content inline, then re-sign and re-send with a new date — rather than
-- silently editing locked content. Each reopen is recorded here so the history
-- of "this signed document was reopened and amended" is permanently auditable.
--
-- Each entry: { "by": <uuid>, "reason": <text>, "at": <iso>,
--               "from_status": <text>, "was_executed": <date|null> }
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS amendment_history jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.change_orders.amendment_history IS
  'Audit trail of admin reopen-for-amendment actions: [{by,reason,at,from_status,was_executed}]';
