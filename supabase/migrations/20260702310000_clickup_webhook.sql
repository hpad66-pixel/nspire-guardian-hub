-- Two-way sync: store the ClickUp webhook id + signing secret so changes made
-- in ClickUp flow back into Build OS. Secret is server-only (this table already
-- denies all browser access).

ALTER TABLE public.clickup_connections
  ADD COLUMN IF NOT EXISTS webhook_id text,
  ADD COLUMN IF NOT EXISTS webhook_secret text;

NOTIFY pgrst, 'reload schema';
