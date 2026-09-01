import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OccupancyPmsSourceBanner } from '@/components/occupancy/OccupancyPmsSourceBanner';
import { OccupancyPmsIntroCard } from '@/components/occupancy/OccupancyPmsIntroCard';

describe('Occupancy PMS source-of-truth UI', () => {
  it('renders the persistent banner with one-way feed language', () => {
    render(<OccupancyPmsSourceBanner />);
    expect(screen.getByRole('note')).toHaveTextContent(/source of truth/i);
    expect(screen.getByRole('note')).toHaveTextContent(/one-way feed/i);
    expect(screen.getByRole('note')).toHaveTextContent(/never overwrites/i);
  });

  it('shows Add and Import CTAs on the intro card', () => {
    const onImport = vi.fn();
    const onAddTenant = vi.fn();
    render(<OccupancyPmsIntroCard onImport={onImport} onAddTenant={onAddTenant} />);

    expect(screen.getByText(/Your Property Management system is the source of truth/i)).toBeInTheDocument();
    expect(screen.getByText('Weekly CSV')).toBeInTheDocument();
    expect(screen.getByText('Direct integration')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Import from your PMO/i }));
    expect(onImport).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Add a tenant/i }));
    expect(onAddTenant).toHaveBeenCalledTimes(1);
  });
});
