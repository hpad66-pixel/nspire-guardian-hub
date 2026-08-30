/**
 * G3 · PortalProtectedRoute unit tests.
 *
 * Mocks useAuth, portal membership, and canUseFeature(); asserts the gate
 * decision tree branches correctly: auth -> membership -> plan -> allowed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockUseAuth = vi.fn();
const mockCanUseFeature = vi.fn();
const mockToastError = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/billing', () => ({
  canUseFeature: (f: string) => mockCanUseFeature(f),
}));

vi.mock('sonner', () => ({
  toast: { error: (...args: any[]) => mockToastError(...args) },
}));

// Default: the current user is NOT a main-workspace member, so the role/plan
// decision tree below is exercised unchanged.
vi.mock('@/integrations/supabase/client', () => {
  const chain: any = {
    select: () => chain, eq: () => chain, limit: () => chain,
    maybeSingle: () => mockMaybeSingle(),
  };
  return { supabase: { from: () => chain } };
});

import { PortalProtectedRoute } from '../PortalProtectedRoute';

function renderAt(path: string, role: 'subcontractor' | 'owner', feature: 'sub_portal' | 'owner_portal') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PortalProtectedRoute role={role} feature={feature} />}>
          <Route path="/portal/sub/*" element={<div>SUB OK</div>} />
          <Route path="/portal/owner/*" element={<div>OWNER OK</div>} />
        </Route>
        <Route path="/auth" element={<div>LOGIN PAGE</div>} />
        <Route path="/dashboard" element={<div>DASHBOARD</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PortalProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // First lookup checks for an internal main membership. Portal membership
    // is the second lookup in authenticated tests.
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('redirects unauth users to /auth with next= preserved', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderAt('/portal/sub/commitments', 'subcontractor', 'sub_portal');
    await waitFor(() => expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument());
  });

  it('redirects to /dashboard with error toast when role check fails', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockCanUseFeature.mockResolvedValue(true);
    renderAt('/portal/sub/commitments', 'subcontractor', 'sub_portal');
    await waitFor(() => expect(screen.getByText('DASHBOARD')).toBeInTheDocument());
    expect(mockToastError).toHaveBeenCalledWith("You don't have access to that portal.");
  });

  it('renders UpgradeRequired in place when plan check fails', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'membership-1' }, error: null });
    mockCanUseFeature.mockResolvedValue(false);
    renderAt('/portal/sub/commitments', 'subcontractor', 'sub_portal');
    await waitFor(() =>
      expect(screen.getByText(/requires an upgrade/i)).toBeInTheDocument()
    );
  });

  it('renders the wrapped portal when all three checks pass (sub)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'membership-1' }, error: null });
    mockCanUseFeature.mockResolvedValue(true);
    renderAt('/portal/sub/commitments', 'subcontractor', 'sub_portal');
    await waitFor(() => expect(screen.getByText('SUB OK')).toBeInTheDocument());
  });

  it('renders the wrapped portal when all three checks pass (owner)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'membership-1' }, error: null });
    mockCanUseFeature.mockResolvedValue(true);
    renderAt('/portal/owner/contract', 'owner', 'owner_portal');
    await waitFor(() => expect(screen.getByText('OWNER OK')).toBeInTheDocument());
  });

  it('translates feature key sub_portal -> subcontractor_portal for billing', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'membership-1' }, error: null });
    mockCanUseFeature.mockResolvedValue(true);
    renderAt('/portal/sub/commitments', 'subcontractor', 'sub_portal');
    await waitFor(() => expect(mockCanUseFeature).toHaveBeenCalledWith('subcontractor_portal'));
  });

  it('shows a loader while auth is still loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderAt('/portal/sub/commitments', 'subcontractor', 'sub_portal');
    expect(screen.getByTestId('portal-protected-loading')).toBeInTheDocument();
  });

  it('lets a platform super admin open the owner portal immediately', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'super-1', app_metadata: { role: 'super_admin' } },
      loading: false,
    });
    renderAt('/portal/owner/contract', 'owner', 'owner_portal');
    await waitFor(() => expect(screen.getByText('OWNER OK')).toBeInTheDocument());
    expect(mockCanUseFeature).not.toHaveBeenCalled();
  });
});

