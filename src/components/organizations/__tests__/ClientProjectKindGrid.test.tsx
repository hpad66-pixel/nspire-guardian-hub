import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClientProjectKindGrid } from '../ClientProjectKindGrid';
import type { Project } from '@/hooks/useProjects';

vi.mock('@/hooks/useAllApprovedProposalTotals', () => ({
  useAllApprovedProposalTotals: () => ({
    consultingTotals: new Map([
      ['stucco', { approvedFee: 12000, invoiced: 0 }],
    ]),
  }),
}));

function makeProject(partial: Partial<Project> & { id: string; name: string; project_type: string }): Project {
  return {
    status: 'planning',
    budget: 0,
    spent: 0,
    property: null,
    ...partial,
  } as Project;
}

describe('ClientProjectKindGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Construction and Consulting rows with kind-colored tiles', () => {
    const projects = [
      makeProject({ id: 'stucco', name: 'Stucco Repairs', project_type: 'consulting' }),
      makeProject({ id: 'storm', name: 'Stormdrain Maintenance', project_type: 'property' }),
      makeProject({ id: 'design', name: 'Design and Modeling', project_type: 'consulting' }),
      makeProject({ id: 'water', name: 'Water Meter Box Program', project_type: 'consulting' }),
      makeProject({ id: 'convey', name: 'Conveyance & Close-Out', project_type: 'property', status: 'active' }),
    ];

    render(
      <MemoryRouter>
        <ClientProjectKindGrid projects={projects} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('client-project-kind-grid')).toBeTruthy();
    expect(screen.getByTestId('client-project-kind-row-construction')).toBeTruthy();
    expect(screen.getByTestId('client-project-kind-row-consulting')).toBeTruthy();

    // Section titles
    expect(screen.getAllByText('Construction').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Consulting').length).toBeGreaterThan(0);

    // Tile kind attributes
    expect(screen.getByTestId('client-project-tile-storm')).toHaveAttribute('data-kind', 'construction');
    expect(screen.getByTestId('client-project-tile-convey')).toHaveAttribute('data-kind', 'construction');
    expect(screen.getByTestId('client-project-tile-stucco')).toHaveAttribute('data-kind', 'consulting');
    expect(screen.getByTestId('client-project-tile-design')).toHaveAttribute('data-kind', 'consulting');
    expect(screen.getByTestId('client-project-tile-water')).toHaveAttribute('data-kind', 'consulting');

    // Consulting amount from approved proposals
    expect(screen.getByText('$12,000')).toBeTruthy();
  });

  it('shows the certified closeout emblem and final loss on a closed client project card', () => {
    const projects = [
      makeProject({ id: 'open', name: 'Open Engagement', project_type: 'consulting' }),
      makeProject({
        id: 'closed',
        name: 'Painting of Ashish Office',
        project_type: 'consulting',
        status: 'closed',
        closed_at: '2026-09-05T18:00:00Z',
        close_snapshot: {
          financial_position: {
            net_profit: -2450.75,
          },
        },
      }),
    ];

    render(
      <MemoryRouter>
        <ClientProjectKindGrid projects={projects} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Certified closeout')).toBeTruthy();
    expect(screen.getByText('Final net loss')).toBeTruthy();
    expect(screen.getByText('−$2,450.75')).toBeTruthy();

    const tiles = screen.getAllByTestId(/^client-project-tile-/);
    expect(tiles[0]).toHaveAttribute('data-testid', 'client-project-tile-closed');
    expect(tiles[0]).toHaveAttribute('data-status', 'closed');
  });
});
