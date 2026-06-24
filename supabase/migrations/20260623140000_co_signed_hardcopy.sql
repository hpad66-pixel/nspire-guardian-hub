-- ─────────────────────────────────────────────────────────────────────────────
-- Signed hard copy on a change order. Even after a CO is sent electronically, the
-- client may sign a PHYSICAL copy and hand it back. Let the GC upload that scan for
-- their records — either kept ALONGSIDE the unsigned/electronic copy, or set as the
-- primary document — always with a note explaining why.
--
-- These columns are intentionally NOT in the lock guard's protected set
-- (spec/amount/title/pdf_path/docx_path/signatures), so a signed hard copy can be
-- attached to an already-executed/locked CO. Replacing pdf_path itself still goes
-- through the unlock-in-same-statement path in the app.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS signed_hardcopy_path text,
  ADD COLUMN IF NOT EXISTS signed_hardcopy_note text,
  ADD COLUMN IF NOT EXISTS signed_hardcopy_at   timestamptz,
  ADD COLUMN IF NOT EXISTS signed_hardcopy_by   uuid;

COMMENT ON COLUMN public.change_orders.signed_hardcopy_path IS
  'Scan of the client-signed physical copy, uploaded for records (kept alongside or as the primary doc).';
COMMENT ON COLUMN public.change_orders.signed_hardcopy_note IS
  'Why the hard copy was uploaded (e.g. "client signed a physical copy"). Shown on the CO.';
