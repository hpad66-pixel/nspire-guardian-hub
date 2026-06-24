-- Client feedback when counter-signing: comments on acceptance, or the reason
-- when rejecting. Status 'rejected' is already permitted by the status check.
ALTER TABLE public.change_orders ADD COLUMN IF NOT EXISTS client_comments text;
