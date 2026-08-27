ALTER TABLE public.sms_connections
  ADD COLUMN IF NOT EXISTS inbound_configured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inbound_error text;

COMMENT ON COLUMN public.sms_connections.inbound_configured IS
  'True when projOS configured the Twilio number to route incoming messages to the project webhook.';
