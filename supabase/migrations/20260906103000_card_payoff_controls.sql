-- Company-level credit-card payoff controls.
--
-- This migration intentionally does NOT store online-banking credentials, full
-- account numbers, CVVs, or OAuth access tokens. Provider secrets belong in the
-- edge-function secret store after a bank has approved payment-origination API
-- access. Until then, ProjOS provides an audited issuer handoff and reconciliation
-- flow without representing a draft as a completed payment.

CREATE TABLE IF NOT EXISTS public.treasury_provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_name text NOT NULL CHECK (provider_name IN ('wells_fargo_gateway', 'amex_online')),
  connection_status text NOT NULL DEFAULT 'needs_connection'
    CHECK (connection_status IN ('needs_connection', 'pending', 'connected', 'error', 'revoked')),
  capabilities text[] NOT NULL DEFAULT '{}',
  provider_connection_ref text,
  last_health_checked_at timestamptz,
  last_error_code text,
  connected_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider_name)
);

CREATE TABLE IF NOT EXISTS public.treasury_payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_kind text NOT NULL CHECK (account_kind IN ('funding_bank', 'credit_card')),
  institution text NOT NULL CHECK (institution IN ('wells_fargo_business', 'american_express')),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 80),
  account_last4 text NOT NULL CHECK (account_last4 ~ '^[0-9]{4}$'),
  provider_name text NOT NULL DEFAULT 'manual_handoff'
    CHECK (provider_name IN ('manual_handoff', 'wells_fargo_gateway', 'amex_online')),
  provider_account_ref text,
  connection_status text NOT NULL DEFAULT 'needs_connection'
    CHECK (connection_status IN ('needs_connection', 'pending', 'connected', 'error', 'revoked')),
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'failed', 'revoked')),
  reported_balance numeric(14,2) CHECK (reported_balance IS NULL OR reported_balance >= 0),
  balance_as_of timestamptz,
  balance_source text NOT NULL DEFAULT 'user_entered'
    CHECK (balance_source IN ('user_entered', 'provider')),
  payment_due_date date,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, account_kind, institution, account_last4)
);

CREATE TABLE IF NOT EXISTS public.card_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  funding_account_id uuid NOT NULL REFERENCES public.treasury_payment_accounts(id) ON DELETE RESTRICT,
  card_account_id uuid NOT NULL REFERENCES public.treasury_payment_accounts(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL DEFAULT gen_random_uuid(),
  amount numeric(14,2) NOT NULL CHECK (amount > 0 AND amount <= 9999999.99),
  fee_amount numeric(14,2) CHECK (fee_amount IS NULL OR fee_amount >= 0),
  fee_source text NOT NULL DEFAULT 'not_supplied'
    CHECK (fee_source IN ('not_supplied', 'provider', 'user_entered')),
  total_amount numeric(14,2) GENERATED ALWAYS AS (amount + COALESCE(fee_amount, 0)) STORED,
  payment_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'needs_connection'
    CHECK (status IN (
      'draft', 'needs_connection', 'ready_for_submission',
      'awaiting_external_confirmation', 'submitted', 'processing',
      'settled', 'failed', 'returned', 'cancelled'
    )),
  submission_mode text NOT NULL DEFAULT 'manual_handoff'
    CHECK (submission_mode IN ('manual_handoff', 'provider_api')),
  balance_snapshot numeric(14,2) CHECK (balance_snapshot IS NULL OR balance_snapshot >= 0),
  balance_as_of timestamptz,
  balance_source text NOT NULL DEFAULT 'user_entered'
    CHECK (balance_source IN ('user_entered', 'provider', 'not_supplied')),
  due_date_snapshot date,
  provider_payment_ref text,
  external_confirmation text,
  provider_status text,
  provider_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_code text,
  failure_reason text,
  note text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  submitted_by uuid REFERENCES auth.users(id),
  reconciled_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  submitted_at timestamptz,
  settled_at timestamptz,
  returned_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.card_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  card_payment_request_id uuid NOT NULL REFERENCES public.card_payment_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  evidence_source text NOT NULL DEFAULT 'system'
    CHECK (evidence_source IN ('system', 'user_recorded', 'provider')),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES auth.users(id),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS treasury_payment_accounts_tenant_idx
  ON public.treasury_payment_accounts(tenant_id, account_kind);
CREATE INDEX IF NOT EXISTS card_payment_requests_tenant_created_idx
  ON public.card_payment_requests(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS card_payment_events_request_idx
  ON public.card_payment_events(card_payment_request_id, occurred_at);

-- Prevent an accidental second live payment for the same card, amount, and day.
CREATE UNIQUE INDEX IF NOT EXISTS card_payment_requests_live_duplicate_guard
  ON public.card_payment_requests(tenant_id, card_account_id, amount, payment_date)
  WHERE status NOT IN ('failed', 'returned', 'cancelled');

DROP TRIGGER IF EXISTS treasury_provider_connections_updated_at ON public.treasury_provider_connections;
CREATE TRIGGER treasury_provider_connections_updated_at
  BEFORE UPDATE ON public.treasury_provider_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS treasury_payment_accounts_updated_at ON public.treasury_payment_accounts;
CREATE TRIGGER treasury_payment_accounts_updated_at
  BEFORE UPDATE ON public.treasury_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS card_payment_requests_updated_at ON public.card_payment_requests;
CREATE TRIGGER card_payment_requests_updated_at
  BEFORE UPDATE ON public.card_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_manage_card_payments(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_tenant_id IS NOT NULL
    AND (p_tenant_id = public.current_tenant_id() OR public.is_super_admin())
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role::text IN ('admin', 'owner', 'administrator')
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.enforce_treasury_account_shape()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_kind = 'funding_bank' AND NEW.institution <> 'wells_fargo_business' THEN
    RAISE EXCEPTION 'Funding account must be Wells Fargo Business for this payment flow';
  END IF;
  IF NEW.account_kind = 'credit_card' AND NEW.institution <> 'american_express' THEN
    RAISE EXCEPTION 'Card destination must be American Express for this payment flow';
  END IF;
  IF NEW.balance_source = 'provider' AND NEW.provider_account_ref IS NULL THEN
    RAISE EXCEPTION 'Provider balance requires a verified provider account reference';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_treasury_account_shape ON public.treasury_payment_accounts;
CREATE TRIGGER enforce_treasury_account_shape
  BEFORE INSERT OR UPDATE ON public.treasury_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_treasury_account_shape();

CREATE OR REPLACE FUNCTION public.enforce_card_payment_account_boundary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_funding public.treasury_payment_accounts;
  v_card public.treasury_payment_accounts;
BEGIN
  SELECT * INTO v_funding FROM public.treasury_payment_accounts WHERE id = NEW.funding_account_id;
  SELECT * INTO v_card FROM public.treasury_payment_accounts WHERE id = NEW.card_account_id;

  IF v_funding.id IS NULL OR v_card.id IS NULL
    OR v_funding.tenant_id <> NEW.tenant_id OR v_card.tenant_id <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Payment accounts must belong to the same workspace as the payment request';
  END IF;
  IF v_funding.account_kind <> 'funding_bank' OR v_card.account_kind <> 'credit_card' THEN
    RAISE EXCEPTION 'Payment requires a funding bank account and a credit-card destination';
  END IF;
  IF NEW.submission_mode = 'provider_api' AND (
    v_funding.verification_status <> 'verified'
    OR v_card.verification_status <> 'verified'
    OR v_funding.connection_status <> 'connected'
    OR v_card.connection_status <> 'connected'
  ) THEN
    RAISE EXCEPTION 'DIRECT_CONNECTION_REQUIRED: both accounts must be provider-verified';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_card_payment_account_boundary ON public.card_payment_requests;
CREATE TRIGGER enforce_card_payment_account_boundary
  BEFORE INSERT OR UPDATE ON public.card_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_card_payment_account_boundary();

ALTER TABLE public.treasury_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY treasury_provider_connections_admin_select ON public.treasury_provider_connections
  FOR SELECT TO authenticated
  USING (public.can_manage_card_payments(tenant_id));
CREATE POLICY treasury_payment_accounts_admin_select ON public.treasury_payment_accounts
  FOR SELECT TO authenticated
  USING (public.can_manage_card_payments(tenant_id));
CREATE POLICY card_payment_requests_admin_select ON public.card_payment_requests
  FOR SELECT TO authenticated
  USING (public.can_manage_card_payments(tenant_id));
CREATE POLICY card_payment_events_admin_select ON public.card_payment_events
  FOR SELECT TO authenticated
  USING (public.can_manage_card_payments(tenant_id));

-- Mutations are RPC-only so every state change is validated and audited.
REVOKE INSERT, UPDATE, DELETE ON public.treasury_provider_connections FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.treasury_payment_accounts FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.card_payment_requests FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.card_payment_events FROM authenticated, anon;
GRANT SELECT ON public.treasury_provider_connections TO authenticated;
GRANT SELECT ON public.treasury_payment_accounts TO authenticated;
GRANT SELECT ON public.card_payment_requests TO authenticated;
GRANT SELECT ON public.card_payment_events TO authenticated;

CREATE OR REPLACE FUNCTION public.log_card_payment_event(
  p_tenant_id uuid,
  p_request_id uuid,
  p_event_type text,
  p_from_status text,
  p_to_status text,
  p_evidence_source text DEFAULT 'system',
  p_detail jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.card_payment_events (
    tenant_id, card_payment_request_id, event_type, from_status, to_status,
    evidence_source, detail, actor_user_id
  ) VALUES (
    p_tenant_id, p_request_id, p_event_type, p_from_status, p_to_status,
    p_evidence_source, COALESCE(p_detail, '{}'::jsonb), auth.uid()
  );
END;
$$;
REVOKE ALL ON FUNCTION public.log_card_payment_event(uuid, uuid, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_treasury_payment_account(
  p_account_kind text,
  p_display_name text,
  p_account_last4 text,
  p_reported_balance numeric DEFAULT NULL,
  p_payment_due_date date DEFAULT NULL
)
RETURNS public.treasury_payment_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_row public.treasury_payment_accounts;
  v_institution text;
BEGIN
  IF NOT public.can_manage_card_payments(v_tenant) THEN
    RAISE EXCEPTION 'FORBIDDEN: administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_account_kind NOT IN ('funding_bank', 'credit_card') THEN
    RAISE EXCEPTION 'Account kind must be funding_bank or credit_card';
  END IF;
  IF btrim(COALESCE(p_display_name, '')) = '' OR char_length(btrim(p_display_name)) > 80 THEN
    RAISE EXCEPTION 'Display name is required and must be 80 characters or fewer';
  END IF;
  IF p_account_last4 IS NULL OR p_account_last4 !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'Only the last four digits are allowed';
  END IF;
  IF p_reported_balance IS NOT NULL AND p_reported_balance < 0 THEN
    RAISE EXCEPTION 'Balance cannot be negative';
  END IF;

  v_institution := CASE WHEN p_account_kind = 'funding_bank'
    THEN 'wells_fargo_business' ELSE 'american_express' END;

  INSERT INTO public.treasury_payment_accounts (
    tenant_id, account_kind, institution, display_name, account_last4,
    reported_balance, balance_as_of, balance_source, payment_due_date, created_by
  ) VALUES (
    v_tenant, p_account_kind, v_institution, btrim(p_display_name), p_account_last4,
    p_reported_balance, CASE WHEN p_reported_balance IS NULL THEN NULL ELSE now() END,
    'user_entered', p_payment_due_date, auth.uid()
  )
  ON CONFLICT (tenant_id, account_kind, institution, account_last4)
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    reported_balance = EXCLUDED.reported_balance,
    balance_as_of = CASE WHEN EXCLUDED.reported_balance IS NULL
      THEN public.treasury_payment_accounts.balance_as_of ELSE now() END,
    balance_source = 'user_entered',
    payment_due_date = EXCLUDED.payment_due_date,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_card_payment_request(
  p_funding_account_id uuid,
  p_card_account_id uuid,
  p_amount numeric,
  p_idempotency_key uuid,
  p_note text DEFAULT NULL
)
RETURNS public.card_payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_funding public.treasury_payment_accounts;
  v_card public.treasury_payment_accounts;
  v_row public.card_payment_requests;
  v_status text;
  v_mode text;
  v_direct_ready boolean := false;
BEGIN
  IF NOT public.can_manage_card_payments(v_tenant) THEN
    RAISE EXCEPTION 'FORBIDDEN: administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 9999999.99 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Idempotency key is required';
  END IF;

  SELECT * INTO v_funding FROM public.treasury_payment_accounts
    WHERE id = p_funding_account_id AND tenant_id = v_tenant;
  SELECT * INTO v_card FROM public.treasury_payment_accounts
    WHERE id = p_card_account_id AND tenant_id = v_tenant;
  IF v_funding.id IS NULL OR v_funding.account_kind <> 'funding_bank' THEN
    RAISE EXCEPTION 'A valid Wells Fargo Business funding account is required';
  END IF;
  IF v_card.id IS NULL OR v_card.account_kind <> 'credit_card' THEN
    RAISE EXCEPTION 'A valid American Express card destination is required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.treasury_provider_connections c
    WHERE c.tenant_id = v_tenant
      AND c.provider_name = 'wells_fargo_gateway'
      AND c.connection_status = 'connected'
      AND 'payment_origination' = ANY(c.capabilities)
      AND v_funding.connection_status = 'connected'
      AND v_funding.verification_status = 'verified'
      AND v_card.connection_status = 'connected'
      AND v_card.verification_status = 'verified'
  ) INTO v_direct_ready;

  v_status := CASE WHEN v_direct_ready THEN 'draft' ELSE 'needs_connection' END;
  v_mode := CASE WHEN v_direct_ready THEN 'provider_api' ELSE 'manual_handoff' END;

  INSERT INTO public.card_payment_requests (
    tenant_id, funding_account_id, card_account_id, idempotency_key, amount,
    payment_date, status, submission_mode, balance_snapshot, balance_as_of,
    balance_source, due_date_snapshot, note, created_by
  ) VALUES (
    v_tenant, v_funding.id, v_card.id, p_idempotency_key, p_amount,
    current_date, v_status, v_mode, v_card.reported_balance, v_card.balance_as_of,
    CASE WHEN v_card.reported_balance IS NULL THEN 'not_supplied' ELSE v_card.balance_source END,
    v_card.payment_due_date, NULLIF(btrim(COALESCE(p_note, '')), ''), auth.uid()
  )
  ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_row
    FROM public.card_payment_requests
    WHERE tenant_id = v_tenant AND idempotency_key = p_idempotency_key;
    IF v_row.funding_account_id <> p_funding_account_id
      OR v_row.card_account_id <> p_card_account_id
      OR v_row.amount <> p_amount THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT: this request key was already used for different payment data';
    END IF;
    RETURN v_row;
  END IF;

  PERFORM public.log_card_payment_event(
    v_tenant, v_row.id, 'payment_prepared', NULL, v_row.status, 'system',
    jsonb_build_object('submission_mode', v_row.submission_mode, 'amount', v_row.amount)
  );
  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'DUPLICATE_PAYMENT: an active payment for this card, amount, and date already exists';
END;
$$;

CREATE OR REPLACE FUNCTION public.begin_card_payment_handoff(p_request_id uuid)
RETURNS public.card_payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_row public.card_payment_requests;
  v_from text;
BEGIN
  IF NOT public.can_manage_card_payments(v_tenant) THEN
    RAISE EXCEPTION 'FORBIDDEN: administrator access required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.card_payment_requests
    WHERE id = p_request_id AND tenant_id = v_tenant FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Payment request not found'; END IF;
  IF v_row.status NOT IN ('draft', 'needs_connection', 'awaiting_external_confirmation') THEN
    RAISE EXCEPTION 'Payment cannot be handed off from status %', v_row.status;
  END IF;
  v_from := v_row.status;
  UPDATE public.card_payment_requests
    SET status = 'awaiting_external_confirmation', submission_mode = 'manual_handoff'
    WHERE id = v_row.id RETURNING * INTO v_row;
  PERFORM public.log_card_payment_event(
    v_tenant, v_row.id, 'issuer_handoff_opened', v_from, v_row.status, 'user_recorded',
    jsonb_build_object('notice', 'Opening the issuer flow does not prove submission')
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_card_payment_confirmation(
  p_request_id uuid,
  p_external_confirmation text
)
RETURNS public.card_payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_row public.card_payment_requests;
  v_confirmation text := btrim(COALESCE(p_external_confirmation, ''));
BEGIN
  IF NOT public.can_manage_card_payments(v_tenant) THEN
    RAISE EXCEPTION 'FORBIDDEN: administrator access required' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_confirmation) < 4 OR char_length(v_confirmation) > 80
    OR v_confirmation ~ '[0-9]{12,}' THEN
    RAISE EXCEPTION 'Enter the bank or issuer confirmation only; do not enter a full account or card number';
  END IF;
  SELECT * INTO v_row FROM public.card_payment_requests
    WHERE id = p_request_id AND tenant_id = v_tenant FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Payment request not found'; END IF;
  IF v_row.status <> 'awaiting_external_confirmation' THEN
    RAISE EXCEPTION 'Open the secure issuer payment flow before recording confirmation';
  END IF;

  UPDATE public.card_payment_requests SET
    status = 'processing',
    external_confirmation = v_confirmation,
    provider_status = 'user_reported_processing',
    provider_evidence = jsonb_build_object(
      'source', 'user_recorded',
      'recorded_at', now(),
      'settlement_unverified', true
    ),
    submitted_by = auth.uid(),
    submitted_at = now()
  WHERE id = v_row.id RETURNING * INTO v_row;

  PERFORM public.log_card_payment_event(
    v_tenant, v_row.id, 'external_confirmation_recorded',
    'awaiting_external_confirmation', 'processing', 'user_recorded',
    jsonb_build_object('confirmation', v_confirmation, 'settlement_unverified', true)
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_card_payment_request(
  p_request_id uuid,
  p_status text,
  p_note text
)
RETURNS public.card_payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_row public.card_payment_requests;
  v_from text;
  v_note text := btrim(COALESCE(p_note, ''));
BEGIN
  IF NOT public.can_manage_card_payments(v_tenant) THEN
    RAISE EXCEPTION 'FORBIDDEN: administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('settled', 'failed', 'returned') THEN
    RAISE EXCEPTION 'Reconciliation status must be settled, failed, or returned';
  END IF;
  IF char_length(v_note) < 4 THEN
    RAISE EXCEPTION 'A reconciliation note or evidence reference is required';
  END IF;
  SELECT * INTO v_row FROM public.card_payment_requests
    WHERE id = p_request_id AND tenant_id = v_tenant FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Payment request not found'; END IF;
  IF v_row.status NOT IN ('submitted', 'processing', 'settled') THEN
    RAISE EXCEPTION 'Payment cannot be reconciled from status %', v_row.status;
  END IF;
  IF v_row.status = 'settled' AND p_status <> 'returned' THEN
    RAISE EXCEPTION 'A settled payment can only transition to returned';
  END IF;
  v_from := v_row.status;

  UPDATE public.card_payment_requests SET
    status = p_status,
    provider_status = CASE WHEN submission_mode = 'provider_api' THEN provider_status ELSE 'user_reported_' || p_status END,
    failure_reason = CASE WHEN p_status IN ('failed', 'returned') THEN v_note ELSE NULL END,
    reconciled_by = auth.uid(),
    settled_at = CASE WHEN p_status = 'settled' THEN now() ELSE settled_at END,
    returned_at = CASE WHEN p_status = 'returned' THEN now() ELSE returned_at END,
    note = concat_ws(E'\n', note, 'Reconciliation: ' || v_note)
  WHERE id = v_row.id RETURNING * INTO v_row;

  PERFORM public.log_card_payment_event(
    v_tenant, v_row.id, 'payment_reconciled', v_from, p_status,
    'user_recorded',
    jsonb_build_object('note', v_note)
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_card_payment_request(
  p_request_id uuid,
  p_reason text DEFAULT 'Cancelled by administrator'
)
RETURNS public.card_payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_row public.card_payment_requests;
  v_from text;
BEGIN
  IF NOT public.can_manage_card_payments(v_tenant) THEN
    RAISE EXCEPTION 'FORBIDDEN: administrator access required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.card_payment_requests
    WHERE id = p_request_id AND tenant_id = v_tenant FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Payment request not found'; END IF;
  IF v_row.status NOT IN ('draft', 'needs_connection', 'ready_for_submission', 'awaiting_external_confirmation') THEN
    RAISE EXCEPTION 'Submitted or completed payments cannot be cancelled here';
  END IF;
  v_from := v_row.status;
  UPDATE public.card_payment_requests SET
    status = 'cancelled', cancelled_at = now(), failure_reason = NULLIF(btrim(p_reason), '')
    WHERE id = v_row.id RETURNING * INTO v_row;
  PERFORM public.log_card_payment_event(
    v_tenant, v_row.id, 'payment_cancelled', v_from, 'cancelled', 'user_recorded',
    jsonb_build_object('reason', COALESCE(NULLIF(btrim(p_reason), ''), 'Cancelled by administrator'))
  );
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_card_payments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_treasury_payment_account(text, text, text, numeric, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_card_payment_request(uuid, uuid, numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.begin_card_payment_handoff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_card_payment_confirmation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_card_payment_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_card_payment_request(uuid, text) TO authenticated;

COMMENT ON TABLE public.card_payment_requests IS
  'One-time workspace card payoff requests. No row is proof of money movement unless provider or user-recorded settlement evidence says so.';
COMMENT ON COLUMN public.treasury_payment_accounts.account_last4 IS
  'Masked display identifier only. Full bank/card numbers are prohibited.';
COMMENT ON COLUMN public.card_payment_requests.provider_evidence IS
  'Non-secret status evidence. Never store credentials, access tokens, full account numbers, or CVVs.';
