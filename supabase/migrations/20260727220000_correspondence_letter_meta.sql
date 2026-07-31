-- Lets a composed-in-app letter (project_emails, channel='manual'/'resend') be
-- reopened and continued later with its structured fields intact — recipient
-- name/org, reference no., category, and the (now user-editable) salutation —
-- instead of only the flattened subject/body_text. Synced Gmail messages never
-- populate this; it's null for every row except letters authored in the composer.
ALTER TABLE public.project_emails ADD COLUMN IF NOT EXISTS letter_meta jsonb;
