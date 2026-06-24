-- Photos attached by the subcontractor when responding to a punch item. Stored as
-- public storage URLs on each response row; they accumulate across responses so a
-- sub can add pictures incrementally over multiple visits.
ALTER TABLE public.punch_item_responses
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';
