import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', async () => {
  const mocks = await import('@/test/fixtures/supabase');
  return { supabase: mocks.supabase, __mock: mocks.__mock };
});
vi.mock('@/lib/tenant', () => ({ requireTenantId: vi.fn(async () => 'tenant-1') }));

import { useStartContractorOnboarding } from '../useContractorReadiness';
import { renderHookWithClient } from '@/test/utils';
import { __mock } from '@/test/fixtures/supabase';

describe('useStartContractorOnboarding', () => {
  beforeEach(() => {
    __mock.reset();
    __mock.rpc.mockResolvedValue({ data: 'case-1', error: null });
  });

  it('creates the qualification and sends the passwordless portal in one action', async () => {
    __mock.invoke.mockResolvedValue({
      data: {
        ok: true, portalLinkId: 'link-1', link: 'https://projos.ai/contractor/onboard/token',
        emailSent: true, deliveryStatus: 'sent', expiresAt: '2026-10-03T12:00:00Z',
      },
      error: null,
    });
    const { result } = renderHookWithClient(() => useStartContractorOnboarding());
    await act(async () => {
      await result.current.mutateAsync({
        organizationId: 'org-1', sendPortal: true,
        recipientName: 'Ada Owner', recipientEmail: 'ada@example.com',
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(__mock.rpc).toHaveBeenCalledWith('create_contractor_qualification_case', expect.objectContaining({ p_organization_id: 'org-1' }));
    expect(__mock.invoke).toHaveBeenCalledWith('contractor-invite', {
      body: { caseId: 'case-1', email: 'ada@example.com', name: 'Ada Owner', role: 'contractor' },
    });
    expect(result.current.data?.invitation?.emailSent).toBe(true);
  });

  it('supports an internal checklist without issuing an external link', async () => {
    const { result } = renderHookWithClient(() => useStartContractorOnboarding());
    let response: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      response = await result.current.mutateAsync({ organizationId: 'org-1', sendPortal: false });
    });
    expect(__mock.invoke).not.toHaveBeenCalled();
    expect(response).toEqual({ caseId: 'case-1', invitation: null });
  });
});
