import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', async () => {
  const m = await import('@/test/fixtures/supabase');
  return { supabase: m.supabase, __mock: m.__mock };
});
import { useSaveMarginClass } from '../useMargin';
import { __mock, makeBuilder } from '@/test/fixtures/supabase';
import { makeClient, withClient } from '@/test/utils';

describe('useSaveMarginClass propagation', () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it('refreshes every vendor reconciliation tab after saving a classification', async () => {
    const deleteBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: null, error: null });
    __mock.from
      .mockReturnValueOnce(deleteBuilder)
      .mockReturnValueOnce(insertBuilder);

    const queryClient = makeClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveMarginClass(), { wrapper: withClient(queryClient) });

    await result.current.mutateAsync({
      projectId: 'project-1',
      primeCoId: 'co-12',
      treatment: 'markup',
      subCost: 15_000,
      subLabel: "D'SHIN Plumbing LLC",
      subCommitmentId: 'commitment-1',
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['margin', 'project-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['vendor-reconciliation'] });
  });
});
