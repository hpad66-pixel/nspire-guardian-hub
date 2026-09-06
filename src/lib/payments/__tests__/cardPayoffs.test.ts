import { describe, expect, it } from 'vitest';
import {
  CARD_PAYMENT_STATUS,
  canCancelCardPayment,
  canReconcileCardPayment,
  canRecordExternalConfirmation,
  hasDirectPaymentCapability,
  isBalanceStale,
  maskAccount,
  type TreasuryPaymentAccount,
  type TreasuryProviderConnection,
} from '../cardPayoffs';

const funding = {
  id: 'funding',
  account_kind: 'funding_bank',
  institution: 'wells_fargo_business',
  display_name: 'Operating',
  account_last4: '4321',
  provider_name: 'wells_fargo_gateway',
  connection_status: 'connected',
  verification_status: 'verified',
  reported_balance: null,
  balance_as_of: null,
  balance_source: 'user_entered',
  payment_due_date: null,
  is_default: true,
  created_at: '2026-09-06T00:00:00Z',
} satisfies TreasuryPaymentAccount;

const card = {
  ...funding,
  id: 'card',
  account_kind: 'credit_card',
  institution: 'american_express',
  provider_name: 'amex_online',
} satisfies TreasuryPaymentAccount;

const provider = {
  id: 'provider',
  provider_name: 'wells_fargo_gateway',
  connection_status: 'connected',
  capabilities: ['account_data', 'payment_origination'],
  last_health_checked_at: '2026-09-06T00:00:00Z',
  last_error_code: null,
} satisfies TreasuryProviderConnection;

describe('card payoff presentation and controls', () => {
  it('reveals only the last four digits', () => {
    expect(maskAccount('4321')).toBe('•••• 4321');
    expect(maskAccount('123456789012345')).toBe('Not configured');
    expect(maskAccount(null)).toBe('Not configured');
  });

  it('labels balances stale after 24 hours or when no provider timestamp exists', () => {
    const now = new Date('2026-09-06T12:00:00Z');
    expect(isBalanceStale('2026-09-06T00:30:00Z', now)).toBe(false);
    expect(isBalanceStale('2026-09-05T11:59:59Z', now)).toBe(true);
    expect(isBalanceStale(null, now)).toBe(true);
  });

  it('requires provider origination plus two verified, connected endpoints', () => {
    expect(hasDirectPaymentCapability([provider], funding, card)).toBe(true);
    expect(hasDirectPaymentCapability([{ ...provider, capabilities: ['account_data'] }], funding, card)).toBe(false);
    expect(hasDirectPaymentCapability([provider], { ...funding, verification_status: 'pending' }, card)).toBe(false);
    expect(hasDirectPaymentCapability([provider], funding, { ...card, connection_status: 'error' })).toBe(false);
  });

  it('keeps confirmation, settlement, and cancellation as separate state actions', () => {
    expect(canRecordExternalConfirmation('awaiting_external_confirmation')).toBe(true);
    expect(canRecordExternalConfirmation('needs_connection')).toBe(false);
    expect(canReconcileCardPayment('processing')).toBe(true);
    expect(canReconcileCardPayment('settled')).toBe(true);
    expect(canReconcileCardPayment('draft')).toBe(false);
    expect(canCancelCardPayment('needs_connection')).toBe(true);
    expect(canCancelCardPayment('processing')).toBe(false);
    expect(CARD_PAYMENT_STATUS.processing.description).toMatch(/not yet verified/i);
  });
});
