import { describe, expect, it } from 'vitest';
import { projectIdFromPath } from '@/lib/projects/projectRoute';

describe('ProjectClosureBoundary routing', () => {
  const id = '95000000-0000-4000-8000-000000000002';

  it('recognizes detail and nested project routes', () => {
    expect(projectIdFromPath(`/projects/${id}`)).toBe(id);
    expect(projectIdFromPath(`/projects/${id}/financials/closeout`)).toBe(id);
    expect(projectIdFromPath(`/projects/${id}/documents`)).toBe(id);
  });

  it('does not mistake the portfolio or legacy proposals routes for a project', () => {
    expect(projectIdFromPath('/projects')).toBeNull();
    expect(projectIdFromPath('/projects/proposals')).toBeNull();
  });
});
