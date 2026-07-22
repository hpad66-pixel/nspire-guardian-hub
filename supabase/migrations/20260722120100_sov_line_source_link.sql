-- ─────────────────────────────────────────────────────────────────────────────
-- Wire a change-order SOV line back to the base line it adjusts.
--
-- When an approved change order adds to (or deducts from) an existing base line
-- — e.g. "6 more 8-inch pipes at the same unit price" — the resulting
-- change_order SOV line should point at the base line it modifies, carry that
-- base line's unit price, and hold the signed delta quantity (+ additive /
-- − deductive). This column captures that link. NULL for base lines and for
-- legacy lump-sum CO lines (which are not tied to a single base line).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.sov_line_items
  ADD COLUMN IF NOT EXISTS source_sov_line_item_id uuid
    REFERENCES public.sov_line_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sov_li_source
  ON public.sov_line_items(source_sov_line_item_id);

COMMENT ON COLUMN public.sov_line_items.source_sov_line_item_id IS
  'For a kind=change_order line, the base line it adjusts (same unit price, signed delta qty). NULL for base and lump-sum CO lines.';
