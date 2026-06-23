-- ─────────────────────────────────────────────────────────────────────────────
-- Per-line retainage override on the Schedule of Values.
--
-- Some lines carry no retainage (e.g. project-management fees, owner's-rep). Add
-- an optional per-line retainage percentage:
--   NULL  → use the prime contract's retainage_pct (default behaviour)
--   0     → no retainage held on this line
--   n     → hold n% on this line
-- The pay-app G702 retainage is the SUM of each line's retainage, so exempting a
-- line simply drops it from the held total (and raises the amount currently due
-- for that work). Prior, already-certified pay apps are not changed.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.sov_line_items
  ADD COLUMN IF NOT EXISTS retainage_pct numeric;

COMMENT ON COLUMN public.sov_line_items.retainage_pct IS
  'Per-line retainage % override. NULL = use prime_contracts.retainage_pct; 0 = no retainage (e.g. PM fees).';
