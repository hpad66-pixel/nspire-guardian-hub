import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', async () => {
  const m = await import('@/test/fixtures/supabase');
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useClientProjectAccess, useClientsWithCounts } from '../useClients';
import { renderHookWithClient } from '@/test/utils';
import { __mock, makeBuilder } from '@/test/fixtures/supabase';

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

describe('useClientsWithCounts', () => {
  beforeEach(() => {
    __mock.reset();
  });

  it('counts the resolved R4 portfolio, including Glorieta alias projects', async () => {
    __mock.from.mockImplementation((table: string) => {
      if (table === 'clients') {
        return makeBuilder({
          data: [{ id: 'r4-1', name: 'R4 Capital LLC', client_type: 'business_client', is_active: true }],
          error: null,
        });
      }
      if (table === 'projects') {
        return makeBuilder({
          data: [
            { id: 'stucco', name: 'Stucco Repairs', client_id: 'r4-1', client: { name: 'R4 Capital LLC' }, project_type: 'consulting' },
            { id: 'closeout', name: 'Conveyance & Close-Out to the City of Opa-Locka', client_id: null, project_type: 'construction' },
            { id: 'sewer-live', name: 'Sewer Extension', client_id: null, project_type: 'property' },
          ],
          error: null,
        });
      }
      if (table === 'client_team_members') {
        return makeBuilder({ data: [], error: null }) as any;
      }
      return makeBuilder();
    });

    const { result } = renderHookWithClient(() => useClientsWithCounts());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0]?.project_count).toBe(3);
  });
});
