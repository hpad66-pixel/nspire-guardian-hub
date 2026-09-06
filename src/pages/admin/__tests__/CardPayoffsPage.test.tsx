import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let currentRole = 'admin';
const mutation = { mutateAsync: vi.fn(), isPending: false };
const useCardPayoffsMock = vi.fn(() => ({
  accounts: { data: [], isLoading: false },
  connections: { data: [], isLoading: false },
  requests: { data: [], isLoading: false },
  events: { data: [], isLoading: false },
  registerAccount: mutation,
  preparePayment: mutation,
  beginHandoff: mutation,
  recordConfirmation: mutation,
  reconcile: mutation,
  cancelPayment: mutation,
}));

vi.mock('@/hooks/useUserManagement', () => ({
  useCurrentUserRole: () => ({ data: currentRole, isLoading: false }),
}));
vi.mock('@/hooks/useCardPayoffs', () => ({
  useCardPayoffs: (enabled: boolean) => useCardPayoffsMock(enabled),
}));

import CardPayoffsPage from '../CardPayoffsPage';

describe('CardPayoffsPage', () => {
  beforeEach(() => {
    currentRole = 'admin';
    useCardPayoffsMock.mockClear();
    mutation.mutateAsync.mockReset();
  });

  it('states connection truth and keeps direct submission locked', () => {
    render(<CardPayoffsPage />);
    expect(screen.getByRole('heading', { name: 'American Express Card Payoffs' })).toBeInTheDocument();
    expect(screen.getByText('Direct payment connection is not active yet')).toBeInTheDocument();
    expect(screen.getByText(/cannot see whether Amex is linked inside your bank/i)).toBeInTheDocument();
    expect(screen.queryAllByText('Not provider verified')).toHaveLength(0);
    expect(screen.getByRole('button', { name: /prepare a payment/i })).toBeDisabled();
    expect(useCardPayoffsMock).toHaveBeenCalledWith(true);
  });

  it('does not load treasury data for a non-administrator', () => {
    currentRole = 'viewer';
    render(<CardPayoffsPage />);
    expect(screen.getByRole('heading', { name: 'Administrator access required' })).toBeInTheDocument();
    expect(useCardPayoffsMock).toHaveBeenCalledWith(false);
    expect(screen.queryByText('American Express Card Payoffs')).not.toBeInTheDocument();
  });
});
