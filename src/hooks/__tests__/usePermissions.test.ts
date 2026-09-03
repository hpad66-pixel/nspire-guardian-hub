import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', async () => {
  const m = await import('@/test/fixtures/supabase');
  return { supabase: m.supabase, __mock: m.__mock };
});

const currentRole = vi.fn(() => ({ data: 'administrator', isLoading: false }));
vi.mock('../useUserManagement', () => ({
  useCurrentUserRole: () => currentRole(),
}));

import { useUserPermissions } from '../usePermissions';
import { renderHookWithClient } from '@/test/utils';
import { __mock, makeBuilder } from '@/test/fixtures/supabase';

describe('useUserPermissions client administrator projects', () => {
  beforeEach(() => {
    __mock.reset();
    currentRole.mockReturnValue({ data: 'administrator', isLoading: false });
    __mock.from.mockReturnValue(makeBuilder({ data: [], error: null }));
  });

  it('shows project navigation and creation controls while leaving deletion restricted', async () => {
    const { result } = renderHookWithClient(() => useUserPermissions());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canView('projects')).toBe(true);
    expect(result.current.canCreate('projects')).toBe(true);
    expect(result.current.canUpdate('projects')).toBe(true);
    expect(result.current.canDelete('projects')).toBe(false);
  });
});
