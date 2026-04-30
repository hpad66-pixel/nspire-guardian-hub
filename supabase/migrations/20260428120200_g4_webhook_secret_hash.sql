-- ============================================================
-- G4 · webhook_subscriptions.secret_hash column
-- ============================================================
-- Adds the hashed-secret column required by the new
-- webhook-secret-rotate edge function. The legacy `secret`
-- column (plaintext) is retained for backward compatibility
-- with webhook-dispatch and is set to '' on rotate so the
-- prior cleartext is destroyed; a follow-up migration can
-- drop `secret` after webhook-dispatch is updated to use
-- the hash for HMAC signing.
-- ============================================================

ALTER TABLE public.webhook_subscriptions
  ADD COLUMN IF NOT EXISTS secret_hash text;

COMMENT ON COLUMN public.webhook_subscriptions.secret_hash IS
  'PBKDF2 hash of the signing secret (pbkdf2$<iter>$<saltB64>$<dkB64>). '
  'Plaintext is revealed once at creation/rotate via the api-key-mint / '
  'webhook-secret-rotate edge functions, then never again.';
