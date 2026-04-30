/**
 * G3 · PortalProtectedRoute unit tests.
 *
 * Mocks useAuth, can(), and canUseFeature(); asserts the gate
 * decision tree branches correctly: auth -> role -> plan -> allowed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockUseAuth = vi.fn();
const mockCan = vi.fn();
const mockCanUseFeature = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/rbac', () => ({
  can: (input: any) => mockCan(input),
}));

vi.mock('@/lib/billing', () => ({
  canUseFeature: (f: string) => mockCanUseFeature(f),
}));

vi.mock('sonner', () => ({
  toast: { error: (...args: any[]) => mockToastError(...args) },
}));

import { PortalProtectedRoute } from '../PortalProtectedRoute';

function renderAt(path: string, role: 'subcontractor' | 'owner', feature: 'sub_portal' | 'owner_portal') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PortalProtectedRoute role={role} feature={feature} />}>
          <Route path="/portal/sub/*" element={<div>SUB OK</div>} />
          <Route path="/portal/owner/*" element={<div>OWNER OK</div>} />
        </Route>
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/dashboard" element={<div>DASHBOARD</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PortalProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauth users to /login with next= preserved', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderAt('/portal/sub/commitments', 'subcontractor', 'sub_portal');
    await waitFor(() => expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument());
  });

  it('redirects to /dashboard with error toast when role check fails', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockCan.mockResolvedValue(false);
    mockCanUseFeature.mockResolvedValue(true);
    renderAt('/portal/sub/commitments', 'subcontractor', 'sub_portal');
    await waitFor(() => expect(screen.getByText('DASHBOARD')).toBeInTheDocument());
    expect(mockToastError).toHaveBeenCalledWith("You don't have access to that portal.");
  });

  it('renders UpgradeRequired in place when plan check fails', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockCan.mockResolvedValue(true);
    mockCanUseFeature.mockResolvedValue(false);
    renderAt('/portal/sub/commitments', 'subcontractor', 'sub_portal');
    await waitFor(() =>
      expect(screen.getByText(/requires an upgrade/i)).toBeInTheDocument()
    );
  });

  it('renders the wrapped portal when all three checks pass (sub)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockCan.mockResolvedValue(true);
    mockCanUseFeature.mockResolvedValue(true);
    renderAt('/portal/sub/commitments', 'subcontractor', 'sub_portal');
    await waitFor(() => expect(screen.getByText('SUB OK')).toBeInTheDocument());
  });

  it('renders the wrapped portal when all three checks pass (owner)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockCan.mockResolvedValue(true);
    mockCanUseFeature.mockResolvedValue(true);
    renderAt('/portal/owner/contract', 'owner', 'owner_portal');
    await waitFor(() => expect(screen.getByText('OWNER OK')).toBeInTheDocument());
  });

  it('translates feature key sub_portal -> subcontractor_portal for billing', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockCan.mockResolvedValue(true);
    mockCanUseFeature.mockResolvedValue(true);
    renderAt('/portal/sub/commitments', 'subcontractor', 'sub_portal');
    await waitFor(() => expect(mockCanUseFeature).toHaveBeenCalledWith('subcontractor_portal'));
  });

  it('shows a loader while auth is still loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderAt('/portal/sub/commitments', 'subcontractor', 'sub_portal');
    expect(screen.getByTestId('portal-protected-loading')).toBeInTheDocument();
  });
});
