-- Controlled client->contractor channel on the Project Log: the client can post
-- a COMMENT on a visible item (they still can't edit items or change status).
-- Client comments are tracker_updates flagged is_client = true.
ALTER TABLE public.tracker_updates
  ADD COLUMN IF NOT EXISTS is_client boolean NOT NULL DEFAULT false;
