-- Public bid-submission link: each bid package gets a shareable token. A sub opens
-- /bid/<token>, sees the scope, and submits their bid — handled by the bid-submit
-- edge function (service role, token-validated). RLS on the table is unchanged
-- (admin-only); the public never touches it directly.
ALTER TABLE public.bid_packages ADD COLUMN IF NOT EXISTS token text;

UPDATE public.bid_packages
  SET token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  WHERE token IS NULL;

ALTER TABLE public.bid_packages
  ALTER COLUMN token SET DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
ALTER TABLE public.bid_packages ALTER COLUMN token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bid_packages_token_idx ON public.bid_packages (token);
