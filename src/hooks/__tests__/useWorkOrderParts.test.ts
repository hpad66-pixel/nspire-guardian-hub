/**
 * useWorkOrderParts — assign / photo / install mutations for WO parts flow.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', async () => {
  const m = await import('@/test/fixtures/supabase');
  return { supabase: m.supabase, __mock: m.__mock };
});

import {
  useAssignWorkOrderPart,
  useInstallWorkOrderPart,
  useWorkOrderParts,
} from '../useWorkOrderParts';
import { renderHookWithClient } from '@/test/utils';
import { __mock, makeBuilder, supabase } from '@/test/fixtures/supabase';

describe('useWorkOrderParts', () => {
  beforeEach(() => __mock.reset());

  it('list is idle until workOrderId is provided', () => {
    const { result } = renderHookWithClient(() => useWorkOrderParts(null));
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('lists parts for a work order', async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [{ id: 'p1', status: 'assigned', quantity: 1 }],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useWorkOrderParts('wo-1'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe('p1');
  });

  it('assign part inserts assigned row', async () => {
    const builder = makeBuilder({
      data: { id: 'p2', status: 'assigned', work_order_id: 'wo-1' },
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    const { result } = renderHookWithClient(() => useAssignWorkOrderPart());
    result.current.mutate({
      workOrderId: 'wo-1',
      propertyId: 'prop-1',
      inventoryItemId: 'item-1',
      quantity: 2,
      unitLabel: '5-204',
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('assigned');
  });

  it('install surfaces photo-required DB errors', async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: null,
        error: {
          message: 'WO_PART_BEFORE_PHOTO_REQUIRED: Capture a BEFORE photo',
        },
      }),
    );
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    const { result } = renderHookWithClient(() => useInstallWorkOrderPart());
    result.current.mutate({
      partId: 'p1',
      workOrderId: 'wo-1',
      propertyId: 'prop-1',
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
