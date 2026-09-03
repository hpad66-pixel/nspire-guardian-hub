import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', async () => {
  const m = await import('@/test/fixtures/supabase');
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useClientProjectAccess } from '../useClients';
import { renderHookWithClient } from '@/test/utils';
import { __mock } from '@/test/fixtures/supabase';

describe('useClientProjectAccess', () => {
  beforeEach(() => {
    __mock.reset();
  });

  it('maps server-authoritative client project capabilities', async () => {
    __mock.rpc.mockResolvedValueOnce({
      data: [{ can_view: true, can_create: true, can_edit: true, can_delete: false }],
      error: null,
    });

    const { result } = renderHookWithClient(() => useClientProjectAccess('client-r4'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(__mock.rpc).toHaveBeenCalledWith('get_client_project_access', {
      p_client_id: 'client-r4',
    });
    expect(result.current.data).toEqual({
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: false,
    });
  });

  it('does not query until a client is selected', () => {
    const { result } = renderHookWithClient(() => useClientProjectAccess(undefined));
    expect(result.current.fetchStatus).toBe('idle');
    expect(__mock.rpc).not.toHaveBeenCalled();
  });

  it('surfaces an access RPC failure', async () => {
    __mock.rpc.mockResolvedValueOnce({ data: null, error: { message: 'denied' } });
    const { result } = renderHookWithClient(() => useClientProjectAccess('client-r4'));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
