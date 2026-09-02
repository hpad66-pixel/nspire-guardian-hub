import { describe, expect, it, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', async () => {
  const m = await import('@/test/fixtures/supabase');
  return { supabase: m.supabase, __mock: m.__mock };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'hardeep@apas.ai', user_metadata: { full_name: 'Hardeep' } } }),
}));

import { renderHookWithClient } from '@/test/utils';
import { __mock, makeBuilder } from '@/test/fixtures/supabase';
import { useWaterIntelligence } from '../useWaterIntelligence';

describe('useWaterIntelligence', () => {
  beforeEach(() => __mock.reset());

  it('stays idle until a property or token is provided', () => {
    const { result } = renderHookWithClient(() => useWaterIntelligence({}));
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('loads authenticated property accounts and bills (happy path)', async () => {
    __mock.from.mockImplementation((table: string) => {
      if (table === 'properties') {
        return makeBuilder({
          data: { id: 'p1', name: 'Glorieta Gardens', workspace_id: 'ws1', water_intel_enabled: true, water_intel_token: 'tok' },
          error: null,
        });
      }
      if (table === 'water_service_accounts') {
        return makeBuilder({
          data: [{ id: 'a1', account_number: '2745714336', building_label: 'Building 8', service_address: '13200 Alexandria', sort_order: 10, status: 'disputed' }],
          error: null,
        });
      }
      if (table === 'water_bills') {
        return makeBuilder({
          data: [{
            id: 'b1', account_id: 'a1', bill_period_start: '2026-06-01',
            current_charges: 8793.24, amount_due: 122667.65, water_charges: 3426.54,
            sewer_charges: 4868.97, other_fees: 497.73, consumption_gallons: 423000,
            is_estimated: false, status: 'disputed', source: 'ocr',
          }],
          error: null,
        });
      }
      return makeBuilder({ data: [], error: null });
    });

    const { result } = renderHookWithClient(() => useWaterIntelligence({ propertyId: 'p1' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.accounts[0].account_number).toBe('2745714336');
    expect(result.current.kpis.accountCount).toBe(1);
    expect(result.current.rollups[0].buildingLabel).toBe('Building 8');
    expect(result.current.bills[0].amount_due).toBe(122667.65);
  });

  it('surfaces an invalid magic-link as an error (validation path)', async () => {
    __mock.rpc.mockResolvedValue({ data: [], error: null });
    const { result } = renderHookWithClient(() => useWaterIntelligence({ token: 'bad' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(String(result.current.error)).toMatch(/invalid or expired/i);
  });

  it('rejects empty token resolve as permission/access failure', async () => {
    __mock.rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    const { result } = renderHookWithClient(() => useWaterIntelligence({ token: 'nope' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
