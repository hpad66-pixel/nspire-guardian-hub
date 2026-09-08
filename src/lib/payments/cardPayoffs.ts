export type TreasuryAccountKind = 'funding_bank' | 'credit_card';
export type ConnectionStatus = 'needs_connection' | 'pending' | 'connected' | 'error' | 'revoked';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'failed' | 'revoked';
export type CardPaymentStatus =
  | 'draft'
  | 'needs_connection'
  | 'ready_for_submission'
  | 'awaiting_external_confirmation'
  | 'submitted'
  | 'processing'
  | 'settled'
  | 'failed'
  | 'returned'
  | 'cancelled';

export interface TreasuryProviderConnection {
  id: string;
  provider_name: 'wells_fargo_gateway' | 'amex_online';
  connection_status: ConnectionStatus;
  capabilities: string[];
  last_health_checked_at: string | null;
  last_error_code: string | null;
}

export interface TreasuryPaymentAccount {
  id: string;
  account_kind: TreasuryAccountKind;
  institution: 'wells_fargo_business' | 'american_express';
  display_name: string;
  account_last4: string;
  provider_name: 'manual_handoff' | 'wells_fargo_gateway' | 'amex_online';
  connection_status: ConnectionStatus;
  verification_status: VerificationStatus;
  reported_balance: number | null;
  balance_as_of: string | null;
  balance_source: 'user_entered' | 'provider';
  payment_due_date: string | null;
  is_default: boolean;
  created_at: string;
}

export interface CardPaymentRequest {
  id: string;
  funding_account_id: string;
  card_account_id: string;
  idempotency_key: string;
  amount: number;
  fee_amount: number | null;
  fee_source: 'not_supplied' | 'provider' | 'user_entered';
  total_amount: number;
  payment_date: string;
  status: CardPaymentStatus;
  submission_mode: 'manual_handoff' | 'provider_api';
  balance_snapshot: number | null;
  balance_as_of: string | null;
  balance_source: 'user_entered' | 'provider' | 'not_supplied';
  due_date_snapshot: string | null;
  provider_payment_ref: string | null;
  external_confirmation: string | null;
  provider_status: string | null;
  failure_reason: string | null;
  note: string | null;
  submitted_at: string | null;
  settled_at: string | null;
  returned_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface CardPaymentEvent {
  id: string;
  card_payment_request_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  evidence_source: 'system' | 'user_recorded' | 'provider';
  detail: Record<string, unknown>;
  occurred_at: string;
}

export const AMEX_PAYMENT_URL = 'https://www.americanexpress.com/en-us/account/login/';
export const WELLS_FARGO_GATEWAY_URL = 'https://developer.wellsfargo.com/login';

export function maskAccount(last4: string | null | undefined): string {
  return last4 && /^\d{4}$/.test(last4) ? `•••• ${last4}` : 'Not configured';
}

export function money(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

export function isBalanceStale(balanceAsOf: string | null, now = new Date()): boolean {
  if (!balanceAsOf) return true;
  const timestamp = new Date(balanceAsOf).getTime();
  if (!Number.isFinite(timestamp)) return true;
  return now.getTime() - timestamp > 24 * 60 * 60 * 1000;
}

export function hasDirectPaymentCapability(
  connections: TreasuryProviderConnection[],
  funding: TreasuryPaymentAccount | undefined,
  card: TreasuryPaymentAccount | undefined,
): boolean {
  const providerReady = connections.some(
    (connection) =>
      connection.provider_name === 'wells_fargo_gateway'
      && connection.connection_status === 'connected'
      && connection.capabilities.includes('payment_origination'),
  );
  return Boolean(
    providerReady
      && funding?.connection_status === 'connected'
      && funding.verification_status === 'verified'
      && card?.connection_status === 'connected'
      && card.verification_status === 'verified',
  );
}

export const CARD_PAYMENT_STATUS: Record<CardPaymentStatus, {
  label: string;
  description: string;
  tone: 'neutral' | 'warning' | 'info' | 'success' | 'danger';
}> = {
  draft: {
    label: 'Draft',
    description: 'Prepared for review. No money has moved.',
    tone: 'neutral',
  },
  needs_connection: {
    label: 'Connection required',
    description: 'The bank-payment API is not authorized. No money has moved.',
    tone: 'warning',
  },
  ready_for_submission: {
    label: 'Ready for final approval',
    description: 'Provider-verified accounts are ready; final submission is still required.',
    tone: 'info',
  },
  awaiting_external_confirmation: {
    label: 'Awaiting Amex confirmation',
    description: 'The secure Amex page was opened, but submission is not yet confirmed.',
    tone: 'warning',
  },
  submitted: {
    label: 'Submitted',
    description: 'The provider accepted the instruction; settlement is pending.',
    tone: 'info',
  },
  processing: {
    label: 'Processing',
    description: 'A confirmation was recorded; settlement is not yet verified.',
    tone: 'info',
  },
  settled: {
    label: 'Settled',
    description: 'The payment was reconciled as posted to the card account.',
    tone: 'success',
  },
  failed: {
    label: 'Failed',
    description: 'The payment did not complete. Review the evidence before retrying.',
    tone: 'danger',
  },
  returned: {
    label: 'Returned',
    description: 'A previously submitted or settled payment was returned.',
    tone: 'danger',
  },
  cancelled: {
    label: 'Cancelled',
    description: 'The payment request was cancelled before completion.',
    tone: 'neutral',
  },
};

export function canCancelCardPayment(status: CardPaymentStatus): boolean {
  return ['draft', 'needs_connection', 'ready_for_submission', 'awaiting_external_confirmation'].includes(status);
}

export function canRecordExternalConfirmation(status: CardPaymentStatus): boolean {
  return status === 'awaiting_external_confirmation';
}

export function canReconcileCardPayment(status: CardPaymentStatus): boolean {
  return status === 'submitted' || status === 'processing' || status === 'settled';
}
