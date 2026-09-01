import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import R4LandingPage from '../R4LandingPage';

vi.mock('@/components/qr/QRCodeGenerator', () => ({
  QRCodeGenerator: ({ value }: { value: string }) => (
    <img alt="QR Code" data-testid="landing-pwa-qr" src={`qr://${value}`} />
  ),
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  return {
    motion: new Proxy(
      {},
      {
        get: () => passthrough,
      },
    ),
    AnimatePresence: passthrough,
    useReducedMotion: () => true,
  };
});

describe('R4LandingPage', () => {
  it('showcases platform features and the PWA QR download section', () => {
    render(
      <MemoryRouter>
        <R4LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /every capability\. one corporate operating system/i })).toBeTruthy();
    expect(screen.getByText('Property operations')).toBeTruthy();
    expect(screen.getByText('Collaboration')).toBeTruthy();
    expect(screen.getByText('Pay Apps & Final Invoice')).toBeTruthy();
    expect(screen.getByText('Voice Complaints')).toBeTruthy();
    expect(screen.getByText('Doc Studio')).toBeTruthy();
    expect(screen.getByText('Stores & Materials')).toBeTruthy();
    expect(screen.getByText('Owner / client portals')).toBeTruthy();

    expect(screen.getByRole('heading', { name: /install proj os on any phone/i })).toBeTruthy();
    const qr = screen.getByTestId('landing-pwa-qr') as HTMLImageElement;
    expect(qr.getAttribute('src')).toContain('https://projos.ai/install');
    expect(screen.getByRole('link', { name: /open install guide/i })).toBeTruthy();
  });
});
