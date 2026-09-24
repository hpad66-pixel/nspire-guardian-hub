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

  it('hides closed projects in the default all-projects view', () => {
    expect(projects.filter((project) => matchesPortfolioStatus(project, 'all')))
      .toEqual([
        { id: 'active', status: 'active' },
        { id: 'planning', status: 'planning' },
      ]);
  });

  it('keeps closed projects visible when a client portfolio is selected', () => {
    expect(projects.filter((project) => matchesPortfolioStatus(project, 'all', { includeClosedInAll: true })))
      .toEqual(projects);
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
