import { describe, expect, it } from 'vitest';
import {
  findR4ClientId,
  groupProjectsByClientPortfolio,
  resolveClientPortfolioProjects,
  shouldIncludeProjectForClientFilter,
} from '../clientPortfolio';

const r4Client = { name: 'R4 Capital' };

describe('client portfolio grouping', () => {
  it('finds the R4 client id from existing client-linked projects', () => {
    expect(findR4ClientId([
      { id: 'a', name: 'City task', client_id: 'city-1', client: { name: 'City of Opa-locka' } },
      { id: 'b', name: 'Stucco Repairs', client_id: 'r4-1', client: r4Client },
    ])).toBe('r4-1');
  });

  it('groups Glorieta projects under the R4 portfolio without changing project data', () => {
    const glorieta = {
      id: 'glorieta-sewer',
      name: 'Glorieta Gardens Sewer Extension',
      client_id: null,
      property: { name: 'Glorieta Gardens' },
    };
    const groups = groupProjectsByClientPortfolio([
      { id: 'stucco', name: 'Stucco Repairs', client_id: 'r4-1', client: r4Client },
      glorieta,
    ]);

    const r4 = groups.find((group) => group.clientId === 'r4-1');
    expect(r4?.clientId).toBe('r4-1');
    expect(r4?.projects.map((project) => project.id).sort()).toEqual(['glorieta-sewer', 'stucco']);
    expect(glorieta.client_id).toBeNull();
  });

  it('includes Glorita spelling variants when the R4 client filter is active', () => {
    expect(shouldIncludeProjectForClientFilter(
      { id: 'p1', name: 'Glorita Gardens Punch List', client_id: null },
      'r4-1',
      'R4',
    )).toBe(true);
  });

  it('does not pull unrelated projects into the R4 filter', () => {
    expect(shouldIncludeProjectForClientFilter(
      { id: 'p2', name: 'City Hall Roof', client_id: 'city-1', client: { name: 'City of Opa-locka' } },
      'r4-1',
      'R4 Capital',
    )).toBe(false);
  });

  it('moves the named standalone items into R4 as consulting presentation', () => {
    const projects = [
      { id: 'r4-anchor', name: 'Stucco Repairs', client_id: 'r4-1', client: r4Client, project_type: 'construction' },
      { id: 'review', name: 'Review', client_id: null, project_type: null },
      { id: 'approval', name: 'Approval', client_id: null, project_type: 'property' },
      { id: 'assessment', name: 'Assessment', client_id: null, project_type: null },
      { id: 'backflow', name: 'Backflow preventer', client_id: null, project_type: null },
      { id: 'wall', name: 'Boundary wall monitoring network', client_id: null, project_type: null },
    ];

    const resolved = resolveClientPortfolioProjects(projects);

    expect(resolved.filter((project) => project.id !== 'r4-anchor')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'review', client_id: 'r4-1', client: r4Client, project_type: 'consulting' }),
        expect.objectContaining({ id: 'approval', client_id: 'r4-1', client: r4Client, project_type: 'consulting' }),
        expect.objectContaining({ id: 'assessment', client_id: 'r4-1', client: r4Client, project_type: 'consulting' }),
        expect.objectContaining({ id: 'backflow', client_id: 'r4-1', client: r4Client, project_type: 'consulting' }),
        expect.objectContaining({ id: 'wall', client_id: 'r4-1', client: r4Client, project_type: 'consulting' }),
      ]),
    );
  });
});
