import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProjOSLandingPage from '../ProjOSLandingPage';

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

describe('ProjOSLandingPage', () => {
  it('showcases the public Proj OS product story for consulting and construction buyers', () => {
    render(
      <MemoryRouter>
        <ProjOSLandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /see every project with intelligence people can actually run/i })).toBeTruthy();
    expect(screen.getByText('Construction companies')).toBeTruthy();
    expect(screen.getByText('Consulting companies')).toBeTruthy();
    expect(screen.getByText('Voice AI and live intelligence')).toBeTruthy();
    expect(screen.getByText('Project money visible')).toBeTruthy();
    expect(screen.getAllByText('Client portals').length).toBeGreaterThan(0);
    expect(screen.getByText('Money')).toBeTruthy();
    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.getByText('Accountability')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /no public pricing/i })).toBeTruthy();
  });
});
