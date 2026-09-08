import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', async () => {
  const fixture = await import('@/test/fixtures/supabase');
  return { supabase: fixture.supabase, __mock: fixture.__mock };
});

import { useCardPayoffs } from '../useCardPayoffs';
import { renderHookWithClient } from '@/test/utils';
import { __mock, makeBuilder } from '@/test/fixtures/supabase';

describe('useCardPayoffs', () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it('does not query treasury records until access is confirmed', () => {
    const { result } = renderHookWithClient(() => useCardPayoffs(false));
    expect(result.current.accounts.fetchStatus).toBe('idle');
    expect(result.current.requests.fetchStatus).toBe('idle');
    expect(__mock.from).not.toHaveBeenCalled();
  });

  it('normalizes Postgres money fields for accounts and requests', async () => {
    __mock.from.mockImplementation((table: string) => {
      if (table === 'treasury_payment_accounts') {
        return makeBuilder({ data: [{ id: 'a1', reported_balance: '1250.25' }], error: null });
      }
      if (table === 'card_payment_requests') {
        return makeBuilder({ data: [{ id: 'p1', amount: '500.00', fee_amount: null, total_amount: '500.00', balance_snapshot: '1250.25' }], error: null });
      }
      return makeBuilder({ data: [], error: null });
    });
    const { result } = renderHookWithClient(() => useCardPayoffs(true));
    await waitFor(() => expect(result.current.requests.isSuccess).toBe(true));
    expect(result.current.accounts.data?.[0].reported_balance).toBe(1250.25);
    expect(result.current.requests.data?.[0]).toMatchObject({ amount: 500, total_amount: 500, balance_snapshot: 1250.25 });
  });

  it('passes a caller-generated idempotency key to the guarded prepare RPC', async () => {
    __mock.rpc.mockResolvedValue({
      data: { id: 'p1', amount: '350.00', total_amount: '350.00', fee_amount: null, balance_snapshot: null },
      error: null,
    });
    const { result } = renderHookWithClient(() => useCardPayoffs(false));
    const prepared = await result.current.preparePayment.mutateAsync({
      fundingAccountId: '10000000-0000-4000-8000-000000000001',
      cardAccountId: '10000000-0000-4000-8000-000000000002',
      amount: 350,
      idempotencyKey: '10000000-0000-4000-8000-000000000003',
      note: 'One-time card payment',
    });
    expect(__mock.rpc).toHaveBeenCalledWith('create_card_payment_request', {
      p_funding_account_id: '10000000-0000-4000-8000-000000000001',
      p_card_account_id: '10000000-0000-4000-8000-000000000002',
      p_amount: 350,
      p_idempotency_key: '10000000-0000-4000-8000-000000000003',
      p_note: 'One-time card payment',
    });
    expect(prepared.amount).toBe(350);
  });

  it('surfaces provider and duplicate failures without recording a payment', async () => {
    __mock.rpc.mockResolvedValue({ data: null, error: { message: 'DUPLICATE_PAYMENT: active request exists' } });
    const { result } = renderHookWithClient(() => useCardPayoffs(false));
    await expect(result.current.preparePayment.mutateAsync({
      fundingAccountId: '10000000-0000-4000-8000-000000000001',
      cardAccountId: '10000000-0000-4000-8000-000000000002',
      amount: 350,
      idempotencyKey: '10000000-0000-4000-8000-000000000003',
    })).rejects.toMatchObject({ message: expect.stringContaining('DUPLICATE_PAYMENT') });
  });
});
