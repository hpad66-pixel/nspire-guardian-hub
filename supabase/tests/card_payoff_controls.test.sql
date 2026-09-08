BEGIN;
SELECT plan(33);

SELECT has_table('public', 'treasury_provider_connections', 'provider readiness is persisted');
SELECT has_table('public', 'treasury_payment_accounts', 'masked payment accounts are persisted');
SELECT has_table('public', 'card_payment_requests', 'one-time card payments are persisted');
SELECT has_table('public', 'card_payment_events', 'card payment state changes are audited');
SELECT has_function('public', 'register_treasury_payment_account', ARRAY['text','text','text','numeric','date'], 'guarded account registration exists');
SELECT has_function('public', 'create_card_payment_request', ARRAY['uuid','uuid','numeric','uuid','text'], 'idempotent payment preparation exists');
SELECT has_function('public', 'begin_card_payment_handoff', ARRAY['uuid'], 'secure issuer handoff exists');
SELECT has_function('public', 'record_card_payment_confirmation', ARRAY['uuid','text'], 'confirmation recording exists');
SELECT has_function('public', 'reconcile_card_payment_request', ARRAY['uuid','text','text'], 'settlement reconciliation exists');
SELECT has_function('public', 'cancel_card_payment_request', ARRAY['uuid','text'], 'pre-submission cancellation exists');

INSERT INTO public.workspaces (id, name)
VALUES ('97000000-0000-4000-8000-000000000001', 'Card Payoff Test');

INSERT INTO auth.users (id, email, raw_app_meta_data)
VALUES (
  '97000000-0000-4000-8000-000000000009',
  'treasury-admin@example.com',
  '{"role":"super_admin"}'::jsonb
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000009","tenant_id":"97000000-0000-4000-8000-000000000001","app_metadata":{"role":"super_admin"}}',
  true
);

SELECT lives_ok(
  $$ SELECT public.register_treasury_payment_account(
       'funding_bank', 'Wells Fargo Operating', '4321', NULL, NULL
     ) $$,
  'administrator can save a masked Wells Fargo funding reference'
);
SELECT lives_ok(
  $$ SELECT public.register_treasury_payment_account(
       'credit_card', 'American Express Business', '1005', 2500, current_date + 10
     ) $$,
  'administrator can save a masked Amex destination reference'
);
SELECT is(
  (SELECT account_last4 FROM public.treasury_payment_accounts
   WHERE account_kind = 'credit_card' AND tenant_id = '97000000-0000-4000-8000-000000000001'),
  '1005', 'only the four-digit display identifier is stored'
);
SELECT is(
  (SELECT verification_status FROM public.treasury_payment_accounts
   WHERE account_kind = 'credit_card' AND tenant_id = '97000000-0000-4000-8000-000000000001'),
  'unverified', 'manual reference is not misrepresented as provider verified'
);

SELECT lives_ok(
  $$ SELECT public.create_card_payment_request(
       (SELECT id FROM public.treasury_payment_accounts WHERE account_kind = 'funding_bank' AND tenant_id = '97000000-0000-4000-8000-000000000001'),
       (SELECT id FROM public.treasury_payment_accounts WHERE account_kind = 'credit_card' AND tenant_id = '97000000-0000-4000-8000-000000000001'),
       350, '97000000-0000-4000-8000-000000000010', 'One-time test payment'
     ) $$,
  'payment request can be prepared without claiming money moved'
);
SELECT is(
  (SELECT status FROM public.card_payment_requests WHERE idempotency_key = '97000000-0000-4000-8000-000000000010'),
  'needs_connection', 'unverified endpoints keep direct submission locked'
);
SELECT lives_ok(
  $$ SELECT public.create_card_payment_request(
       (SELECT id FROM public.treasury_payment_accounts WHERE account_kind = 'funding_bank' AND tenant_id = '97000000-0000-4000-8000-000000000001'),
       (SELECT id FROM public.treasury_payment_accounts WHERE account_kind = 'credit_card' AND tenant_id = '97000000-0000-4000-8000-000000000001'),
       350, '97000000-0000-4000-8000-000000000010', 'Retry'
     ) $$,
  'an identical client retry is idempotent'
);
SELECT is(
  (SELECT count(*)::integer FROM public.card_payment_requests
   WHERE idempotency_key = '97000000-0000-4000-8000-000000000010'),
  1, 'idempotent retry creates one payment request'
);
SELECT throws_ok(
  $$ SELECT public.create_card_payment_request(
       (SELECT id FROM public.treasury_payment_accounts WHERE account_kind = 'funding_bank' AND tenant_id = '97000000-0000-4000-8000-000000000001'),
       (SELECT id FROM public.treasury_payment_accounts WHERE account_kind = 'credit_card' AND tenant_id = '97000000-0000-4000-8000-000000000001'),
       351, '97000000-0000-4000-8000-000000000010', 'Altered retry'
     ) $$,
  'P0001', 'IDEMPOTENCY_CONFLICT: this request key was already used for different payment data',
  'idempotency key cannot be reused with altered payment data'
);
SELECT throws_ok(
  $$ SELECT public.create_card_payment_request(
       (SELECT id FROM public.treasury_payment_accounts WHERE account_kind = 'funding_bank' AND tenant_id = '97000000-0000-4000-8000-000000000001'),
       (SELECT id FROM public.treasury_payment_accounts WHERE account_kind = 'credit_card' AND tenant_id = '97000000-0000-4000-8000-000000000001'),
       350, '97000000-0000-4000-8000-000000000011', 'Accidental duplicate'
     ) $$,
  'P0001', 'DUPLICATE_PAYMENT: an active payment for this card, amount, and date already exists',
  'same-day live duplicate is blocked even with a new request key'
);

SELECT lives_ok(
  $$ SELECT public.begin_card_payment_handoff(
       (SELECT id FROM public.card_payment_requests WHERE idempotency_key = '97000000-0000-4000-8000-000000000010')
     ) $$,
  'administrator can open the issuer handoff'
);
SELECT is(
  (SELECT status FROM public.card_payment_requests WHERE idempotency_key = '97000000-0000-4000-8000-000000000010'),
  'awaiting_external_confirmation', 'opening Amex does not claim submission'
);
SELECT throws_ok(
  $$ SELECT public.record_card_payment_confirmation(
       (SELECT id FROM public.card_payment_requests WHERE idempotency_key = '97000000-0000-4000-8000-000000000010'),
       '371449635398431'
     ) $$,
  'P0001', 'Enter the bank or issuer confirmation only; do not enter a full account or card number',
  'full card-like numbers are rejected from confirmation evidence'
);
SELECT lives_ok(
  $$ SELECT public.record_card_payment_confirmation(
       (SELECT id FROM public.card_payment_requests WHERE idempotency_key = '97000000-0000-4000-8000-000000000010'),
       'AMEX-CONF-1005'
     ) $$,
  'external issuer confirmation can be recorded'
);
SELECT is(
  (SELECT status FROM public.card_payment_requests WHERE idempotency_key = '97000000-0000-4000-8000-000000000010'),
  'processing', 'confirmation means processing, not settled'
);
SELECT throws_ok(
  $$ SELECT public.reconcile_card_payment_request(
       (SELECT id FROM public.card_payment_requests WHERE idempotency_key = '97000000-0000-4000-8000-000000000010'),
       'settled', ''
     ) $$,
  'P0001', 'A reconciliation note or evidence reference is required',
  'settlement requires a reconciliation evidence note'
);
SELECT lives_ok(
  $$ SELECT public.reconcile_card_payment_request(
       (SELECT id FROM public.card_payment_requests WHERE idempotency_key = '97000000-0000-4000-8000-000000000010'),
       'settled', 'Posted in Amex activity and cleared Wells Fargo'
     ) $$,
  'processing payment can be reconciled as settled'
);
SELECT is(
  (SELECT status FROM public.card_payment_requests WHERE idempotency_key = '97000000-0000-4000-8000-000000000010'),
  'settled', 'settled status is stored separately from processing'
);
SELECT throws_ok(
  $$ SELECT public.reconcile_card_payment_request(
       (SELECT id FROM public.card_payment_requests WHERE idempotency_key = '97000000-0000-4000-8000-000000000010'),
       'failed', 'Cannot rewrite settled as failed'
     ) $$,
  'P0001', 'A settled payment can only transition to returned',
  'settled payment cannot be silently rewritten as failed'
);
SELECT lives_ok(
  $$ SELECT public.reconcile_card_payment_request(
       (SELECT id FROM public.card_payment_requests WHERE idempotency_key = '97000000-0000-4000-8000-000000000010'),
       'returned', 'Bank returned the previously settled ACH debit'
     ) $$,
  'settled payment can be recorded as returned'
);
SELECT is(
  (SELECT status FROM public.card_payment_requests WHERE idempotency_key = '97000000-0000-4000-8000-000000000010'),
  'returned', 'returned state remains visible for follow-up'
);
SELECT cmp_ok(
  (SELECT count(*) FROM public.card_payment_events
   WHERE card_payment_request_id = (
     SELECT id FROM public.card_payment_requests WHERE idempotency_key = '97000000-0000-4000-8000-000000000010'
   )),
  '>=', 5::bigint, 'prepare, handoff, confirmation, settlement, and return are audited'
);

INSERT INTO auth.users (id, email, raw_app_meta_data)
VALUES ('97000000-0000-4000-8000-000000000019', 'treasury-viewer@example.com', '{}'::jsonb);
DELETE FROM public.user_roles WHERE user_id = '97000000-0000-4000-8000-000000000019';
INSERT INTO public.user_roles (user_id, role)
VALUES ('97000000-0000-4000-8000-000000000019', 'user')
ON CONFLICT (user_id, role) DO NOTHING;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000019","tenant_id":"97000000-0000-4000-8000-000000000001"}',
  true
);
SELECT throws_ok(
  $$ SELECT public.register_treasury_payment_account(
       'funding_bank', 'Unauthorized Account', '9999', NULL, NULL
     ) $$,
  '42501', 'FORBIDDEN: administrator access required',
  'non-administrator cannot register treasury endpoints'
);

SELECT * FROM finish();
ROLLBACK;
