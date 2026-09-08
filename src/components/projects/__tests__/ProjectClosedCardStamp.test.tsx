import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectClosedCardStamp } from '../ProjectClosedCardStamp';

describe('ProjectClosedCardStamp', () => {
  it('renders the certified emblem and frozen net loss', () => {
    render(
      <ProjectClosedCardStamp
        project={{
          status: 'closed',
          closed_at: '2026-09-05T12:00:00Z',
          close_snapshot: { financial_position: { net_profit: -400 } },
        }}
      />,
    );

    expect(screen.getByText('Closed')).toBeTruthy();
    expect(screen.getByText('Certified closeout')).toBeTruthy();
    expect(screen.getByText('Final net loss')).toBeTruthy();
    expect(screen.getByText('−$400.00')).toBeTruthy();
  });
});

