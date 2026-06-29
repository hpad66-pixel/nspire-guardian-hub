-- Rework prime↔sub margin into a per-prime-CO classification so every owner
-- change order can be: markup (pay a sub X, keep the delta), pass_through
-- (sub = prime, no margin), or apas_100 (no sub — 100% APAS). The sub cost is a
-- plain amount (optionally tied to a real sub CO), so a flat vendor cost like
-- "Ecotech $1,500" works without needing a formal sub change order.
ALTER TABLE public.co_margin_links
  ALTER COLUMN sub_co_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS treatment text NOT NULL DEFAULT 'markup'
    CHECK (treatment IN ('markup', 'pass_through', 'apas_100')),
  ADD COLUMN IF NOT EXISTS sub_cost  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sub_label text;

-- carry the old boolean into the new model
UPDATE public.co_margin_links SET treatment = 'pass_through' WHERE is_pass_through = true;

-- one classification per prime CO (replaces the old prime+sub uniqueness)
ALTER TABLE public.co_margin_links DROP CONSTRAINT IF EXISTS co_margin_links_prime_co_id_sub_co_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS co_margin_links_prime_uniq ON public.co_margin_links (prime_co_id);
