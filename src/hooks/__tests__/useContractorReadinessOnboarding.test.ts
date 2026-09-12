import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', async () => {
  const mocks = await import('@/test/fixtures/supabase');
  return { supabase: mocks.supabase, __mock: mocks.__mock };
});
vi.mock('@/lib/tenant', () => ({ requireTenantId: vi.fn(async () => 'tenant-1') }));

import { useStartContractorOnboarding } from '../useContractorReadiness';
import { renderHookWithClient } from '@/test/utils';
import { __mock, makeBuilder } from '@/test/fixtures/supabase';

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
    expect(__mock.rpc).toHaveBeenCalledWith('create_contractor_qualification_case', expect.objectContaining({
      p_engagement_type: 'contractor',
      p_certificate_holder_name: null,
    }));
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
    expect(response).toEqual({ caseId: 'case-1', invitation: null, crmSync: { status: 'not_applicable' } });
  });

  it('creates a consultant checklist with insurance instructions', async () => {
    const { result } = renderHookWithClient(() => useStartContractorOnboarding());
    await act(async () => {
      await result.current.mutateAsync({
        organizationId: 'org-1',
        engagementType: 'consultant',
        certificateHolderName: 'R4 Capital LLC',
        additionalInsuredName: 'R4 Capital LLC',
        insuranceInstructions: 'Reference the assigned project.',
        sendPortal: false,
      });
    });
    expect(__mock.rpc).toHaveBeenCalledWith('create_contractor_qualification_case', expect.objectContaining({
      p_engagement_type: 'consultant',
      p_certificate_holder_name: 'R4 Capital LLC',
      p_additional_insured_name: 'R4 Capital LLC',
      p_insurance_instructions: 'Reference the assigned project.',
    }));
  });

  it('synchronizes a project-scoped consultant to APAS CRM and still sends the portal', async () => {
    __mock.from.mockImplementation(() => makeBuilder({
      data: { organization_id: 'org-1' },
      error: null,
    }));
    __mock.invoke
      .mockResolvedValueOnce({ data: { ok: true, data: { status: 'synced' } }, error: null })
      .mockResolvedValueOnce({
        data: {
          ok: true, portalLinkId: 'link-1', link: 'https://projos.ai/contractor/onboard/token',
          emailSent: true, deliveryStatus: 'sent', expiresAt: '2026-10-03T12:00:00Z',
        },
        error: null,
      });
    const { result } = renderHookWithClient(() => useStartContractorOnboarding());
    let response: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      response = await result.current.mutateAsync({
        organizationId: 'org-1', projectId: 'project-1', engagementType: 'consultant',
        sendPortal: true, recipientEmail: 'consultant@example.com',
      });
    });
    expect(__mock.invoke).toHaveBeenNthCalledWith(1, 'crm-integration-gateway', {
      body: { operation: 'sync_vendor', projectId: 'project-1', organizationId: 'org-1' },
    });
    expect(__mock.invoke).toHaveBeenNthCalledWith(2, 'contractor-invite', expect.any(Object));
    expect(response?.crmSync).toEqual({ status: 'synced' });
  });

  it('does not block the portal when APAS CRM synchronization is unavailable', async () => {
    __mock.from.mockImplementation(() => makeBuilder({
      data: { organization_id: 'org-1' },
      error: null,
    }));
    __mock.invoke
      .mockRejectedValueOnce(new Error('CRM unavailable'))
      .mockResolvedValueOnce({
        data: {
          ok: true, portalLinkId: 'link-1', link: 'https://projos.ai/contractor/onboard/token',
          emailSent: true, deliveryStatus: 'sent', expiresAt: '2026-10-03T12:00:00Z',
        },
        error: null,
      });
    const { result } = renderHookWithClient(() => useStartContractorOnboarding());
    let response: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      response = await result.current.mutateAsync({
        organizationId: 'org-1', projectId: 'project-1',
        sendPortal: true, recipientEmail: 'contractor@example.com',
      });
    });
    expect(__mock.invoke).toHaveBeenNthCalledWith(2, 'contractor-invite', expect.any(Object));
    expect(response?.invitation?.emailSent).toBe(true);
    expect(response?.crmSync).toEqual({ status: 'pending', message: 'CRM unavailable' });
  });
});
