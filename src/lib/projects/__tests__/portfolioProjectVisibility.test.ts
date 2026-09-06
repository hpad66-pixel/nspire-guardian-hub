import { describe, expect, it } from 'vitest';
import {
  compareClosedProjectsFirst,
  matchesPortfolioStatus,
} from '../portfolioProjectVisibility';

describe('portfolio project visibility', () => {
  const projects = [
    { id: 'active', status: 'active' },
    { id: 'closed', status: 'closed' },
    { id: 'planning', status: 'planning' },
  ];

  it('shows closed projects in the default all-projects view', () => {
    expect(projects.filter((project) => matchesPortfolioStatus(project, 'all')))
      .toHaveLength(3);
  });

  it('keeps explicit status filters exact', () => {
    expect(projects.filter((project) => matchesPortfolioStatus(project, 'closed')))
      .toEqual([{ id: 'closed', status: 'closed' }]);
  });

  it('places certified closed projects before open work', () => {
    expect([...projects].sort(compareClosedProjectsFirst).map((project) => project.id))
      .toEqual(['closed', 'active', 'planning']);
  });
});
